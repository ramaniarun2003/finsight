"""
FastAPI service for FinSight (backend/data_extract/app.py).

Surfaces:
  - GET  /extract/{ticker}  -> extraction pipeline (ticker -> clean structured data)
  - GET  /market/{ticker}   -> market snapshot + price history (yfinance)
  - POST /api/chat          -> RAG chat (RavenDB retrieval + Gemini generation)

Run from the repo root:
    uvicorn backend.data_extract.app:app --reload --port 8000
Then call:
    GET  http://localhost:8000/health
    GET  http://localhost:8000/extract/AEO
    GET  http://localhost:8000/market/AAPL
    POST http://localhost:8000/api/chat   {"question": "..."}
"""

import logging
import os
from pathlib import Path
from typing import Literal

# Load the env file (.env.python at backend/) BEFORE importing modules that read
# os.getenv at import time — embeddings.py captures the Gemini/Vertex and RavenDB
# settings on import, so this must run first.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env.python")
except ImportError:
    # No python-dotenv — rely on `uvicorn --env-file` or an already-set env.
    pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .extractor import run
from .rag import router as chat_router
from .market import router as market_router

logger = logging.getLogger(__name__)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app = FastAPI(title="FinSight Service")

# Allow the Vite dev frontend to call this service from the browser.
# Methods are broadened to all (not just GET), since /api/chat is a POST and the
# browser preflight (OPTIONS) must be permitted too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(market_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


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