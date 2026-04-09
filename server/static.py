from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def serve_static(app: FastAPI) -> None:
    dist_path = Path(__file__).resolve().parent / "public"
    if not dist_path.exists():
        raise FileNotFoundError(
            f"Could not find the build directory: {dist_path}. Build the client first."
        )

    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        target = dist_path / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(dist_path / "index.html")
