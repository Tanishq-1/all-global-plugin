"""FastAPI application template for Cloud Run."""

import json
import logging
import os
import sys

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# --- Structured JSON Logging ---
# Cloud Run automatically ingests structured JSON from stdout to Cloud Logging.


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logging.root.handlers = [handler]
logging.root.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

# --- App ---

app = FastAPI(
    title="My API",
    version="0.1.0",
)


@app.get("/health")
async def health():
    """Health check endpoint for Cloud Run probes."""
    return {"status": "healthy"}


@app.get("/")
async def root():
    return {"message": "Hello from Cloud Run"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# --- Example: Reading from Secret Manager (via env vars) ---
# Secrets are mounted as env vars by Cloud Run --set-secrets flag.
# No need to call the Secret Manager API directly.
#
# DB_PASSWORD = os.environ.get("DB_PASSWORD")
# API_KEY = os.environ.get("API_KEY")
