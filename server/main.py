from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .routes import router
from .static import serve_static
from .vite import setup_vite

logging.basicConfig(level=logging.INFO, format="%(asctime)s [python-server] %(message)s")
logger = logging.getLogger(__name__)


def log(message: str, source: str = "fastapi") -> None:
    logger.info("[%s] %s", source, message)


def create_app() -> FastAPI:
    app = FastAPI(title="Semantic Doc Intel - Python Server")
    app.include_router(router)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api"):
            log(f"{request.method} {request.url.path} {response.status_code}")
        return response

    @app.exception_handler(Exception)
    async def handle_errors(request: Request, exc: Exception):
        logger.exception("Internal Server Error")
        return JSONResponse(
            status_code=500,
            content={"message": str(exc) or "Internal Server Error"},
        )

    if os.getenv("NODE_ENV") == "production":
        try:
            serve_static(app)
        except FileNotFoundError as exc:
            logger.warning("%s", exc)
    else:
        setup_vite(app)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    host = "0.0.0.0"
    port = int(os.getenv("PORT", "5000"))
    uvicorn.run("server.main:app", host=host, port=port, reload=True)
