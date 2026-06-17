"""
FastAPI service exposing the extraction pipeline over HTTP.

Thin web layer: it imports the pure pipeline from ``extractor`` and wraps it in
a route. This sits upstream of the AI — it turns a ticker into clean data that
the model then analyzes.

Run from the repo root:
    uvicorn backend.data_extract.app:app --reload --port 8000
Then call:
    GET http://localhost:8000/extract/
"""

from fastapi import FastAPI, HTTPException

from .extractor import run

app = FastAPI(title="FinSight Extraction Service")


@app.get("/extract/{ticker}")
def extract(ticker: str, form: str = "10-K"):
    """Run the full pipeline for a ticker and return structured JSON."""
    try:
        return run(ticker, form)
    except ValueError as e:
        # Unknown ticker / no matching filing
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Upstream SEC error or parsing failure
        raise HTTPException(status_code=502, detail=f"Extraction failed: {e}")
