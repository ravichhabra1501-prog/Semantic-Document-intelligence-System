from __future__ import annotations

import logging

from fastapi import FastAPI

logger = logging.getLogger(__name__)


def setup_vite(app: FastAPI) -> None:
    logger.info(
        "Vite middleware is not embedded in the Python server. "
        "Run the frontend dev server separately during development."
    )
