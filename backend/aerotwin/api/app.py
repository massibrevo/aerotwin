import asyncio
import csv
import io
import json
import uuid
from collections import OrderedDict
from datetime import date
from typing import Literal

from aerotwin.config import AIRPORTS, DATA
from aerotwin.data.store import load, query, summary
from aerotwin.ml.engine import predict, reports
from aerotwin.providers.aircraft import AdsbLolProvider, RecordedReplayProvider, SyntheticProvider
from aerotwin.simulation.engine import network, simulate
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

app = FastAPI(title="AeroTwin local research API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:5174"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
live = AdsbLolProvider()
Dataset = Literal["synthetic", "bts"]
Mode = Literal["demo", "live", "replay"]
simulations = OrderedDict()
simulation_gate = asyncio.Semaphore(1)


@app.exception_handler(ValueError)
async def value_error(request, exc):
    return JSONResponse(status_code=400, content={"error": "invalid_data", "detail": str(exc)})


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "0.1.0", "local_only": True}


@app.get("/api/v1/airports")
def airports():
    return AIRPORTS


@app.get("/api/v1/providers/status")
def provider_status():
    return {
        "provider": "ADSB.lol",
        "last_received_at": live.last_received,
        "error": live.last_error,
        "polling_seconds": 30,
        "attribution": "ADSB.lol community ADS-B · ODbL",
        "automatic_fallback": False,
    }


@app.get("/api/v1/aircraft")
async def aircraft(
    lat: float = Query(41.297, ge=-90, le=90),
    lon: float = Query(2.078, ge=-180, le=180),
    radius_nm: float = Query(100, ge=1, le=250),
    mode: Mode = "demo",
    frame: int = Query(0, ge=0, le=100000),
):
    if mode == "live":
        return await live.snapshot(lat, lon, radius_nm)
    if mode == "replay":
        return RecordedReplayProvider().snapshot(frame)
    return SyntheticProvider().snapshot(lat, lon, radius_nm, frame)


@app.get("/api/v1/aircraft/stream")
async def stream(
    request: Request,
    lat: float = Query(41.297, ge=-90, le=90),
    lon: float = Query(2.078, ge=-180, le=180),
    radius_nm: float = Query(100, ge=1, le=250),
    mode: Mode = "demo",
):
    async def events():
        frame = 0
        while not await request.is_disconnected():
            result = await aircraft(lat, lon, radius_nm, mode, frame)
            yield f"event: snapshot\ndata: {json.dumps(result)}\n\n"
            frame += 1
            await asyncio.sleep(30)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/api/v1/historical/flights")
def history(
    dataset: Dataset = "synthetic",
    search: str = Query("", max_length=80),
    origin: str = Query("", max_length=3),
    start: date | None = None,
    end: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    return query(
        dataset,
        search,
        origin,
        start.isoformat() if start else "",
        end.isoformat() if end else "",
        page,
        page_size,
    )


@app.get("/api/v1/historical/export")
def export(
    dataset: Dataset = "synthetic",
    search: str = "",
    origin: str = "",
    start: date | None = None,
    end: date | None = None,
):
    # Bounded export; matches current filters, clearly documented maximum 500 rows.
    result = query(dataset, search[:80], origin[:3], str(start or ""), str(end or ""), 1, 500)
    buffer = io.StringIO()
    if result["rows"]:
        writer = csv.DictWriter(buffer, fieldnames=list(result["rows"][0]))
        writer.writeheader()
        writer.writerows(result["rows"])
    return Response(
        buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="aerotwin-flights.csv"'},
    )


@app.get("/api/v1/historical/summary")
def history_summary(dataset: Dataset = "synthetic"):
    return summary(dataset)


@app.get("/api/v1/airports/{iata}/pulse")
def pulse(iata: str, dataset: Dataset = "synthetic"):
    f = load(dataset)
    f = f[f.origin == iata]
    if f.empty:
        raise HTTPException(404, "No schedule rows for this airport in selected dataset")
    return {
        "iata": iata,
        "data_class": dataset,
        "schedule_departures": len(f),
        "hourly": f.groupby("hour").size().reset_index(name="flights").to_dict("records"),
        "caveat": "Schedule rows, not official ADS-B arrival/departure movement counts",
    }


@app.get("/api/v1/network")
def graph(dataset: Dataset = "synthetic"):
    return network(dataset)


@app.get("/api/v1/models")
def models():
    return reports()


@app.get("/api/v1/models/{model_id}/metrics")
def metrics(model_id: str):
    found = next((r for r in reports() if r["model_id"] == model_id), None)
    if found is None:
        raise HTTPException(404, "Model has not been trained")
    return found


class Prediction(BaseModel):
    model_id: Dataset = "synthetic"
    origin: str = Field(default="ATL", pattern="^[A-Z]{3}$")
    dest: str = Field(default="JFK", pattern="^[A-Z]{3}$")
    carrier: str = Field(default="DL", pattern="^[A-Z0-9]{2,3}$")
    hour: int = Field(default=18, ge=0, le=23)
    month: int = Field(default=4, ge=1, le=12)
    dow: int = Field(default=4, ge=0, le=6)
    distance: float = Field(default=760, gt=0, le=12000, allow_inf_nan=False)


@app.post("/api/v1/predict")
def prediction(body: Prediction):
    model_id = body.model_id
    values = body.model_dump(exclude={"model_id"})
    if values["origin"] == values["dest"]:
        raise ValueError("Origin and destination must differ")
    training = load(model_id)
    if not set([values["origin"], values["dest"]]) <= set(training.origin) | set(training.dest):
        raise ValueError("Airport outside model training coverage")
    result = predict(model_id, values)
    result["warnings"] = ["Schedule-only forecast; unseen routes/categories can be unreliable."]
    return result


class Scenario(BaseModel):
    airport: str = Field(default="ATL", pattern="^[A-Z]{3}$")
    reduction: float = Field(default=0.4, ge=0, le=0.7, allow_inf_nan=False)
    duration: int = Field(default=120, ge=15, le=360)
    repetitions: int = Field(default=30, ge=1, le=100)
    seed: int = Field(default=42, ge=0, le=2**32 - 1)
    dataset: Dataset = "synthetic"


@app.post("/api/v1/simulations")
async def scenario(body: Scenario):
    async with simulation_gate:
        result = await run_in_threadpool(simulate, **body.model_dump())
    result["id"] = uuid.uuid4().hex
    if len(simulations) >= 50:
        simulations.popitem(last=False)
    simulations[result["id"]] = result
    return result


@app.get("/api/v1/simulations/{simulation_id}")
def simulation(simulation_id: str):
    if simulation_id not in simulations:
        raise HTTPException(404, "Simulation not found in this process session")
    return simulations[simulation_id]


@app.get("/api/v1/data/sources")
def sources():
    provenance = DATA / "processed" / "bts" / "provenance.json"
    return {
        "sources": [
            {
                "name": "AeroTwin examples",
                "class": "SYNTHETIC DEMO",
                "license": "MIT",
                "rows": len(load()),
                "seed": 42,
                "url": None,
            },
            {
                "name": "ADSB.lol",
                "class": "LIVE, on explicit request",
                "license": "ODbL",
                "url": "https://api.adsb.lol/docs",
                "note": "No live positions redistributed in repository",
            },
            {
                "name": "BTS On-Time Performance",
                "class": "REAL, user import only",
                "license": "US DOT source terms; verify extract rights",
                "url": "https://www.transtats.bts.gov/",
            },
            {
                "name": "Natural Earth",
                "class": "OFFLINE BASEMAP",
                "license": "Public domain",
                "url": "https://www.naturalearthdata.com/",
            },
            {
                "name": "OpenFreeMap",
                "class": "OPTIONAL ONLINE MAP",
                "license": "Provider terms; OSM ODbL",
                "url": "https://openfreemap.org/tos/",
            },
        ],
        "bts_import": json.loads(provenance.read_text()) if provenance.exists() else None,
        "experiments": [
            {k: r[k] for k in ["model_id", "trained_at", "selected_model", "n", "dataset_sha256"]}
            for r in reports()
        ],
        "simulation_history": list(simulations.values())[-10:],
    }
