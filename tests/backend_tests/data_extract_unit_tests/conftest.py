"""Shared fixtures for the data_extract test suite."""
import pytest


@pytest.fixture
def companyfacts():
    """Factory: build a minimal SEC companyfacts dict for given us-gaap concepts."""
    def _build(usd=None, per_share=None, pure=None, fy=2024, end="2024-09-28"):
        block = {}
        def rows(v):
            return [{"form": "10-K", "fp": "FY", "val": v, "fy": fy, "end": end}]
        for unit, d in (("USD", usd), ("USD/shares", per_share), ("pure", pure)):
            for concept, val in (d or {}).items():
                block.setdefault("us-gaap", {})[concept] = {"units": {unit: rows(val)}}
        return {"facts": block}
    return _build
