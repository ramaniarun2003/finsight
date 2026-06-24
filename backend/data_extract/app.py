"""
FastAPI service exposing the extraction pipeline over HTTP.

Thin web layer: it imports the pure pipeline from ``extractor`` and wraps it in
a route. This sits upstream of the AI — it turns a ticker into clean data that
the model then analyzes.

Run from the repo root:
    uvicorn backend.data_extract.app:app --reload --port 8000
Then call:
    GET http://localhost:8000/extract/AEO
"""

import logging
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .extractor import run

logger = logging.getLogger(__name__)

app = FastAPI(title="FinSight Extraction Service")

# Allow the Vite dev frontend to call this service from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/extract/{ticker}")
def extract(ticker: str, form: Literal["10-K", "10-Q"] = "10-K"):
    """Run the full pipeline for a ticker and return structured JSON."""
    ticker = ticker.upper()
    try:
        return run(ticker, form)
    except ValueError as e:
        # Unknown ticker / no matching filing
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Upstream SEC error or parsing failure
        logger.exception("Extraction failed for %s %s", ticker, form)
        raise HTTPException(status_code=502, detail=f"Extraction failed: {e}")