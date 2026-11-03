"""Serve the compiled SPA and assets from the same local origin as the API."""

from pathlib import Path

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from aerotwin.config import ROOT

ROUTES = [
    "/",
    "/radar",
    "/pulse",
    "/history",
    "/forecast",
    "/analytics",
    "/network",
    "/data",
    "/about",
    "/guide",
]


def mount_frontend(app, directory: Path):
    directory = directory.resolve()
    if not (directory / "index.html").is_file() or not (directory / "data/world.geojson").is_file():
        raise RuntimeError("Compiled frontend missing. Run bootstrap or use the distribution ZIP.")

    async def index():
        return FileResponse(directory / "index.html", headers={"Cache-Control": "no-cache"})

    for route in ROUTES:
        app.add_api_route(route, index, methods=["GET"], include_in_schema=False)
    app.mount("/assets", StaticFiles(directory=directory / "assets"), name="assets")
    app.mount("/data", StaticFiles(directory=directory / "data"), name="offline-data")


def production_app():
    from aerotwin.api.app import app

    if not getattr(app.state, "production", False):
        mount_frontend(app, ROOT / "frontend" / "dist")
        app.state.production = True
    return app
