"""
FastAPI service for FinSight (backend/data_extract/app.py).

Surfaces:
  - GET  /extract/{ticker}  -> extraction pipeline (ticker -> clean structured data)
  - GET  /market/{ticker}   -> market snapshot + price history (yfinance)
  - GET  /search?q=<text>   -> company name/ticker search over the SEC registry
  - POST /api/chat          -> RAG chat (RavenDB retrieval + Gemini generation)

Run from the repo root:
    uvicorn backend.data_extract.app:app --reload --port 8000
Then call:
    GET  http://localhost:8000/health
    GET  http://localhost:8000/extract/AEO
    GET  http://localhost:8000/market/AAPL
    GET  http://localhost:8000/search?q=coca
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
    pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .extractor import run
from .rag import router as chat_router
from .market import router as market_router
from .search import router as search_router
from .compare_metrics import router as compare_metrics_router

logger = logging.getLogger(__name__)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app = FastAPI(title="FinSight Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(market_router)
app.include_router(search_router)
app.include_router(compare_metrics_router)


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
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Extraction failed for %s %s", ticker, form)
        raise HTTPException(status_code=502, detail=f"Extraction failed: {e}")
