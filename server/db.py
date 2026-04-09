from __future__ import annotations

import os


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL must be set. Did you forget to provision a database?"
        )
    return database_url


DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or None
