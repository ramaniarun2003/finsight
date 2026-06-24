"""
Embedding + vector-store layer.

Bridges extraction and RAG: takes the structured JSON from ``extractor.run``,
chunks the narrative sections, embeds each chunk with Gemini, and upserts the
vectors into a persistent Chroma collection. ``search`` embeds a query and
returns the nearest chunks for the generation step to use as context.

Numbers (``metrics``) are intentionally NOT embedded -- they're structured data,
better queried directly (and the natural home for the Neo4j/GraphRAG idea).
Only the ``sections`` narrative goes through embeddings.

Run from the repo root:
    python -m backend.data_extract.embeddings ingest AEO 10-K
    python -m backend.data_extract.embeddings search "supply chain risk for Gap"
"""

import os
import re
import math
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# gemini-embedding-001 is the GA model; text-embedding-004 was retired 2026-01-14.
EMBED_MODEL = "gemini-embedding-001"
# 768 keeps storage lean (vs the 3072 default) via Matryoshka truncation.
# NOTE: at <3072 dims the API does NOT return unit vectors, so we normalize.
EMBED_DIM = 768
COLLECTION_NAME = "finsight_filings"
CHROMA_PATH = str(Path(__file__).resolve().parent / "chroma_db")

_MAX_BATCH = 100  # Gemini caps embed_content at 100 inputs per call.

_client = None


# --------------------------------------------------------------------------- #
# Lazy clients (kept inside functions so the pure helpers below are importable
# and testable without google-genai / chromadb installed).
# --------------------------------------------------------------------------- #
def _genai_client():
    global _client
    if _client is None:
        from google import genai

        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not key:
            raise RuntimeError(
                "No API key found. Set GEMINI_API_KEY (e.g. in .env.local)."
            )
        _client = genai.Client(api_key=key)
    return _client


def _collection(chroma_path: str):
    import chromadb

    client = chromadb.PersistentClient(path=chroma_path)
    # cosine space pairs with normalized vectors; Chroma's default is L2.
    return client.get_or_create_collection(
        name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )


# --------------------------------------------------------------------------- #
# Pure helpers
# --------------------------------------------------------------------------- #
def chunk_text(text: str, max_chars: int = 2000, overlap: int = 200) -> list[str]:
    """Paragraph-aware splitter.

    Splits on blank lines and packs whole paragraphs up to ``max_chars`` so a
    risk factor or MD&A point isn't sliced mid-sentence. Paragraphs longer than
    the limit are hard-split as a fallback. ``overlap`` carries a tail of the
    previous chunk into the next for context continuity.
    """
    text = (text or "").strip()
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for p in paragraphs:
        if len(p) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            step = max(1, max_chars - overlap)
            for i in range(0, len(p), step):
                chunks.append(p[i : i + max_chars])
            continue

        if not current:
            current = p
        elif len(current) + len(p) + 2 <= max_chars:
            current = f"{current}\n\n{p}"
        else:
            chunks.append(current)
            tail = current[-overlap:] if overlap else ""
            current = f"{tail}\n\n{p}" if tail else p

    if current:
        chunks.append(current)
    return chunks


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    return [x / norm for x in vec] if norm else vec


# --------------------------------------------------------------------------- #
# Embedding
# --------------------------------------------------------------------------- #
def _embed(texts: list[str], task_type: str) -> list[list[float]]:
    """Embed texts in batches. task_type is RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY."""
    from google.genai import types

    client = _genai_client()
    out: list[list[float]] = []
    for i in range(0, len(texts), _MAX_BATCH):
        batch = texts[i : i + _MAX_BATCH]
        resp = client.models.embed_content(
            model=EMBED_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type=task_type, output_dimensionality=EMBED_DIM
            ),
        )
        out.extend(_normalize(e.values) for e in resp.embeddings)
    return out


def embed_filing(data: dict, chroma_path: str = CHROMA_PATH) -> int:
    """Chunk + embed a filing's sections and upsert into Chroma.

    Takes the dict returned by ``extractor.run``. Returns the chunk count.
    Uses deterministic IDs + upsert, so re-running on the same filing replaces
    rather than duplicates.
    """
    ticker = data["ticker"]
    form = data["form"]
    accession = data["accession_number"]

    base_meta = {
        "ticker": ticker,
        "form": form,
        "filing_date": data["filing_date"],
        "accession_number": accession,
        "source_url": data["source_url"],
    }

    ids, docs, metas = [], [], []
    for section, sec_text in data["sections"].items():
        for j, chunk in enumerate(chunk_text(sec_text)):
            ids.append(f"{ticker}_{form}_{accession}_{section}_{j}")
            docs.append(chunk)
            metas.append({**base_meta, "section": section, "chunk_index": j})

    if not docs:
        logger.warning("No narrative chunks produced for %s %s", ticker, form)
        return 0

    logger.info("Embedding %d chunks for %s %s...", len(docs), ticker, form)
    embeds = _embed(docs, "RETRIEVAL_DOCUMENT")

    coll = _collection(chroma_path)
    coll.upsert(ids=ids, embeddings=embeds, documents=docs, metadatas=metas)
    logger.info("Upserted %d chunks into '%s'.", len(docs), COLLECTION_NAME)
    return len(docs)


def search(
    query: str,
    n_results: int = 5,
    where: dict | None = None,
    chroma_path: str = CHROMA_PATH,
) -> list[dict]:
    """Embed a query (RETRIEVAL_QUERY) and return the nearest chunks.

    ``where`` is a Chroma metadata filter, e.g. {"ticker": "AEO"} to scope to
    one company.
    """
    qvec = _embed([query], "RETRIEVAL_QUERY")[0]
    coll = _collection(chroma_path)
    res = coll.query(query_embeddings=[qvec], n_results=n_results, where=where)

    hits = []
    for doc, meta, dist in zip(
        res["documents"][0], res["metadatas"][0], res["distances"][0]
    ):
        hits.append({"text": doc, "metadata": meta, "distance": dist})
    return hits


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    import argparse

    try:
        from dotenv import load_dotenv

        load_dotenv(".env.local")
        load_dotenv()
    except ImportError:
        pass

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    parser = argparse.ArgumentParser(description="FinSight embeddings")
    sub = parser.add_subparsers(dest="command", required=True)

    p_ingest = sub.add_parser("ingest", help="Extract a filing and embed it")
    p_ingest.add_argument("ticker")
    p_ingest.add_argument("form", nargs="?", default="10-K")

    p_search = sub.add_parser("search", help="Query the vector store")
    p_search.add_argument("query")
    p_search.add_argument("-n", type=int, default=5)
    p_search.add_argument("--ticker", default=None, help="Filter to one ticker")

    args = parser.parse_args()

    if args.command == "ingest":
        from .extractor import run

        data = run(args.ticker, args.form)
        count = embed_filing(data)
        print(f"\nEmbedded {count} chunks for {args.ticker} {args.form}.")

    elif args.command == "search":
        where = {"ticker": args.ticker.upper()} if args.ticker else None
        for i, hit in enumerate(search(args.query, n_results=args.n, where=where), 1):
            m = hit["metadata"]
            print(f"\n[{i}] {m['ticker']} {m['form']} | {m['section']} "
                  f"| dist={hit['distance']:.4f}")
            print(hit["text"][:300].replace("\n", " ") + "...")