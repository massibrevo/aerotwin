import asyncio
import csv
import io
import json
import uuid
import tempfile
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from datetime import date
from typing import Literal

from aerotwin.config import AIRPORTS, DATA, VERSION
from aerotwin.data.store import load, query, summary, ingest_bts, provenance, dataset_revision
from aerotwin.ml.engine import predict, reports, validated_model
from aerotwin.analytics.comparison import compare
from aerotwin.providers.details import AircraftDetails
from aerotwin.providers.airports import search as airport_search, details as airport_reference, AirportWeather
from aerotwin.providers.photos import AircraftPhotos
from aerotwin.providers.aircraft import AdsbLolProvider, RecordedReplayProvider, SyntheticProvider
from aerotwin.simulation.engine import network, simulate
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from aerotwin import jobs, recordings
from aerotwin.storage import record, recent, get as stored_experiment
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool


@asynccontextmanager
async def lifespan(app):
    jobs.recover_interrupted()
    recordings.recover()
    yield


app = FastAPI(title="AeroTwin local research API", version=VERSION, lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"])


@app.middleware("http")
async def local_boundary(request: Request, call_next):
    # Cross-origin sites must not mutate a user's local datasets or start CPU jobs.
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        source = urlparse(origin) if origin else None
        if (
            request.headers.get("sec-fetch-site") == "cross-site"
            or (
                source
                and (
                    source.scheme not in ("http", "https")
                    or source.hostname not in ("127.0.0.1", "localhost", "::1")
                )
            )
            or origin == "null"
        ):
            return JSONResponse(
                status_code=403, content={"error": "cross_origin_write", "detail": "Local requests only"}
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if getattr(request.app.state, "production", False) and request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:5174"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)
live = AdsbLolProvider()
photos = AircraftPhotos()
reference_details = AircraftDetails()
airport_weather = AirportWeather()


@app.get("/api/v1/aircraft/{icao24}/photo")
async def aircraft_photo(icao24: str):
    return await photos.lookup(icao24)


Dataset = Literal["synthetic", "bts"]
Mode = Literal["demo", "live", "replay"]
simulation_gate = asyncio.Semaphore(1)


@app.exception_handler(ValueError)
async def value_error(request, exc):
    return JSONResponse(status_code=400, content={"error": "invalid_data", "detail": str(exc)})


@app.exception_handler(Exception)
async def internal_error(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "detail": "Local operation failed. Check server logs; no data was sent externally.",
        },
    )


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": VERSION, "local_only": True}


@app.get("/api/v1/ready")
def ready():
    checks = {"demo_data": (DATA / "demo/flights.csv").is_file()}
    try:
        validated_model("synthetic")
        checks["demo_model"] = True
    except (ValueError, OSError):
        checks["demo_model"] = False
    status = all(checks.values())
    return JSONResponse(
        status_code=200 if status else 503,
        content={"status": "ready" if status else "setup_required", "checks": checks, "version": VERSION},
    )


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
    recording_id: str | None = Query(None, pattern="^[a-f0-9]{32}$"),
    frame: int = Query(0, ge=0, le=100000),
):
    if mode == "live":
        data = await live.snapshot(lat, lon, radius_nm)
        if recording_id:
            data = {
                **data,
                "recording_state": await run_in_threadpool(
                    recordings.capture, recording_id, data, lat, lon, radius_nm
                ),
            }
        return data
    if mode == "replay":
        return RecordedReplayProvider().snapshot(frame)
    return SyntheticProvider().snapshot(lat, lon, radius_nm, frame)


@app.get("/api/v1/aircraft/search")
async def search_aircraft(
    kind: Literal["hex", "callsign", "registration"], query: str = Query(min_length=2, max_length=16)
):
    return await live.lookup(kind, query)


@app.get("/api/v1/aircraft/{icao24}/details")
async def aircraft_details(icao24: str, callsign: str | None = Query(None, max_length=12)):
    return await reference_details.lookup(icao24, callsign)


@app.get("/api/v1/analytics/comparison")
def comparison(
    dataset: Dataset = "synthetic",
    a_start: date | None = None,
    a_end: date | None = None,
    b_start: date | None = None,
    b_end: date | None = None,
    group: Literal["origin", "dest", "carrier", "route"] = "carrier",
):
    values = [value.isoformat() if value else None for value in [a_start, a_end, b_start, b_end]]
    return compare(dataset, *values, group=group)


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
            result = await aircraft(
                lat=lat, lon=lon, radius_nm=radius_nm, mode=mode, recording_id=None, frame=frame
            )
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
    search: str = Query("", max_length=80),
    origin: str = Query("", max_length=3),
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
    model_config = {"extra": "forbid"}
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
    result = predict(model_id, values)
    return result


class Scenario(BaseModel):
    model_config = {"extra": "forbid"}
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
    record("simulation", result, result["id"])
    return result


@app.get("/api/v1/simulations/{simulation_id}")
def simulation(simulation_id: str):
    result = stored_experiment(simulation_id, "simulation")
    if result is None:
        raise HTTPException(404, "Simulation not found")
    return result


@app.get("/api/v1/data/sources")
def sources():
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
                "name": "HexDB aircraft and route references",
                "class": "OPTIONAL DATABASE · ROUTES UNVERIFIED",
                "license": "Provider/source terms; not bundled or relicensed",
                "url": "https://hexdb.io/",
            },
            {
                "name": "Planespotters.net thumbnails",
                "class": "OPTIONAL REFERENCE PHOTOS",
                "license": "Photographer copyright; API terms",
                "url": "https://www.planespotters.net/photo/api",
            },
            {
                "name": "BTS On-Time Performance",
                "class": "USER IMPORT, source authenticity unverified",
                "license": "US DOT source terms; verify extract rights",
                "url": "https://www.transtats.bts.gov/",
            },
            {
                "name": "OurAirports airport and runway references",
                "class": "BUNDLED REFERENCE · NOT OPERATIONAL",
                "license": "Public domain",
                "url": "https://ourairports.com/data/",
            },
            {
                "name": "OpenFlights timezone references",
                "class": "BUNDLED REFERENCE · NOT OPERATIONAL",
                "license": "ODbL; separate data licence included",
                "url": "https://openflights.org/data.php",
            },
            {
                "name": "NOAA Aviation Weather Center METAR",
                "class": "OPTIONAL WEATHER OBSERVATION",
                "license": "Provider/source terms; reports not bundled",
                "url": "https://aviationweather.gov/data/api/",
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
        "bts_import": provenance(),
        "experiments": recent("training", 20),
        "simulation_history": [e["payload"] for e in recent("simulation", 10)],
        "import_history": recent("import", 10),
        "jobs": recent("job", 10),
    }


@app.get("/api/v1/experiments")
def experiments(limit: int = Query(50, ge=1, le=100)):
    return recent(limit=limit)


@app.post("/api/v1/data/import-bts")
async def import_bts(request: Request, timezone_map: str = Query("{}", max_length=20000)):
    try:
        zones = json.loads(timezone_map)
    except json.JSONDecodeError as exc:
        raise ValueError("Timezone mapping must be a JSON object") from exc
    if not isinstance(zones, dict) or any(
        not isinstance(k, str) or not isinstance(v, str) for k, v in zones.items()
    ):
        raise ValueError("Timezone mapping must map airport codes to IANA timezone strings")
    if request.headers.get("content-type", "").split(";")[0] not in ("text/csv", "application/octet-stream"):
        raise HTTPException(415, "Upload a CSV file as text/csv")
    limit = 20 * 1024 * 1024
    folder = DATA / "processed" / "uploads"
    folder.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=folder, suffix=".csv", delete=False) as output:
        path = __import__("pathlib").Path(output.name)
        try:
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        413, "CSV exceeds the 20 MiB browser import limit; use the CLI for larger files"
                    )
                output.write(chunk)
            output.close()
            if not jobs._lock.acquire(blocking=False):
                raise HTTPException(409, "A training or import job is already running")
            try:
                return await run_in_threadpool(ingest_bts, path, zones)
            finally:
                jobs._lock.release()
        finally:
            output.close()
            path.unlink(missing_ok=True)


class Training(BaseModel):
    model_config = {"extra": "forbid"}
    dataset: Dataset = "synthetic"


@app.post("/api/v1/models/train", status_code=202)
def train_model(body: Training):
    return jobs.start_training(body.dataset)


@app.get("/api/v1/jobs/{job_id}")
def job_status(job_id: str):
    result = jobs.state(job_id)
    if result is None:
        raise HTTPException(404, "Training job not found")
    return result


@app.get("/api/v1/data/datasets/{dataset}")
def dataset_info(dataset: Dataset):
    frame = load(dataset)
    return {
        "dataset": dataset,
        "rows": len(frame),
        "origins": sorted(frame.origin.unique().tolist()),
        "destinations": sorted(frame.dest.unique().tolist()),
        "carriers": sorted(frame.carrier.unique().tolist()),
        "coverage": [str(frame.date.min()), str(frame.date.max())],
        "revision": dataset_revision(dataset),
    }


class RecordingRequest(BaseModel):
    model_config = {"extra": "forbid"}
    label: str = Field(default="Observation session", min_length=1, max_length=80)
    lat: float = Field(ge=-85, le=85, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    radius_nm: float = Field(ge=1, le=250, allow_inf_nan=False)
    retention_days: Literal[1, 7, 30] = 7


@app.get("/api/v1/recordings")
def recording_list():
    return recordings.inventory()


@app.post("/api/v1/recordings")
def recording_start(body: RecordingRequest):
    return recordings.start(**body.model_dump())


@app.post("/api/v1/recordings/{key}/stop")
def recording_stop(key: str):
    return recordings.stop(key)


@app.get("/api/v1/recordings/{key}/frames")
def recording_frame(key: str, index: int = Query(0, ge=0, lt=recordings.MAX_FRAMES)):
    return recordings.frame(key, index)


@app.delete("/api/v1/recordings/{key}")
def recording_delete(key: str):
    return recordings.delete(key)


@app.get("/api/v1/airports/search")
def airport_lookup(query: str = Query("", max_length=100)):
    return airport_search(query)


@app.get("/api/v1/airports/{code}/reference")
def airport_details(code: str):
    return airport_reference(code)


@app.get("/api/v1/airports/{code}/weather")
async def airport_observations(code: str):
    return await airport_weather.lookup(code)
