"""
Unit tests for the data_extract package.

Run from the repo root:
    pytest tests/backend_tests/data_extract_unit_tests.py -v

Categories covered per module:
  1. Normal input - success
  2. Normal input - failure
  3. Edge cases - null / empty / infinite / divide-by-zero

All sec_client network calls are mocked, so the suite runs fully offline.
"""

from backend.data_extract import (
    sec_client, 
    facts, 
    sections, 
    text_metrics, 
    ratios, 
    validation, 
    extractor
)
from unittest.mock import patch

import math
import os
import pytest
import sys

# Make the data_extract modules importable no matter where pytest is launched.
DATA_EXTRACT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "backend", "data_extract")
)
if DATA_EXTRACT not in sys.path:
    sys.path.insert(0, DATA_EXTRACT)


class FakeResponse:
    """Minimal stand-in for requests.Response."""
    def __init__(self, json_data=None, content=b"", exc=None):
        self._json = json_data
        self.content = content
        self._exc = exc

    def raise_for_status(self):
        if self._exc:
            raise self._exc

    def json(self):
        return self._json


# ----------------------------- validation.validate ----------------------------
class TestValidate:
    def test_success_balanced_no_warnings(self):
        m = {"total_assets": 100, "total_liabilities": 60, "shareholders_equity": 40}
        assert validation.validate(m) == []

    def test_failure_unbalanced_warns(self):
        m = {"total_assets": 100, "total_liabilities": 60, "shareholders_equity": 50}
        assert any("Balance sheet" in w for w in validation.validate(m))

    def test_failure_net_income_exceeds_revenue(self):
        assert any("Net income" in w for w in validation.validate(
            {"total_revenue": 10, "net_income": 20}))

    def test_edge_all_none_no_warnings(self):
        assert validation.validate({}) == []
        assert validation.validate(
            {"total_assets": None, "total_liabilities": None, "shareholders_equity": None}) == []


# ----------------------------- ratios.compute_ratios --------------------------
class TestComputeRatios:
    def test_success_basic_ratios(self):
        income = {"net_income_millions": 50, "total_revenue_millions": 1000,
                  "operating_income_millions": 250}
        balance = {"long_term_debt_millions": 100, "shareholders_equity_millions": 200,
                   "total_assets_millions": 500, "total_current_assets_millions": 300,
                   "total_current_liabilities": 150}
        cash_flow = {"free_cash_flow_millions": 200}
        r = ratios.compute_ratios(income, balance, cash_flow)
        assert r["debt_to_equity"] == 0.5
        assert r["return_on_equity_pct"] == 25.0
        assert r["return_on_assets_pct"] == 10.0
        assert r["current_ratio"] == 2.0
        assert r["fcf_margin_pct"] == 20.0
        assert r["operating_margin_pct"] == 25.0
        assert r["net_margin_pct"] == 5.0

    def test_failure_missing_inputs_returns_empty(self):
        assert ratios.compute_ratios({}, {}, {}) == {}

    def test_edge_zero_equity_no_divide_by_zero(self):
        r = ratios.compute_ratios({"net_income_millions": 50},
                                  {"long_term_debt_millions": 100,
                                   "shareholders_equity_millions": 0}, {})
        assert "debt_to_equity" not in r
        assert "return_on_equity_pct" not in r

    def test_edge_none_values_skipped(self):
        r = ratios.compute_ratios({"net_income_millions": None, "total_revenue_millions": None},
                                  {"shareholders_equity_millions": None}, {})
        assert r == {}


# ----------------------------- facts ------------------------------------------
def _facts_with(concept, rows, taxonomy="us-gaap", unit="USD"):
    return {"facts": {taxonomy: {concept: {"units": {unit: rows}}}}}


class TestFacts:
    def test_success_latest_annual_picks_most_recent(self):
        f = _facts_with("NetIncomeLoss", [
            {"form": "10-K", "fp": "FY", "val": 900, "fy": 2023, "end": "2023-09-30"},
            {"form": "10-K", "fp": "FY", "val": 1000, "fy": 2024, "end": "2024-09-28"},
        ])
        hit = facts.latest_annual(f, "us-gaap", "NetIncomeLoss", "USD")
        assert hit["value"] == 1000 and hit["fy"] == 2024

    def test_success_get_fact_maps_field(self):
        f = _facts_with("Assets", [
            {"form": "10-K", "fp": "FY", "val": 5000, "fy": 2024, "end": "2024-09-28"}])
        assert facts.get_fact(f, "total_assets")["value"] == 5000

    def test_success_extension_fallback(self, monkeypatch):
        monkeypatch.setitem(facts.EXTENSION_OVERRIDES, "cash_and_equivalents",
                            ["CashAndCashEquivalents"])
        f = {"facts": {"mycorp": {"CashAndCashEquivalents": {"units": {"USD": [
            {"form": "10-K", "fp": "FY", "val": 777, "fy": 2024, "end": "2024-09-28"}]}}}}}
        assert facts.get_fact(f, "cash_and_equivalents")["value"] == 777

    def test_failure_missing_concept_returns_none(self):
        assert facts.latest_annual({"facts": {}}, "us-gaap", "Nope", "USD") is None
        f = _facts_with("Assets", [
            {"form": "10-K", "fp": "FY", "val": 1, "fy": 2024, "end": "2024-09-28"}])
        assert facts.get_fact(f, "net_income") is None

    def test_edge_only_quarterly_no_annual(self):
        f = _facts_with("NetIncomeLoss", [
            {"form": "10-Q", "fp": "Q1", "val": 10, "fy": 2024, "end": "2024-03-30"}])
        assert facts.latest_annual(f, "us-gaap", "NetIncomeLoss", "USD") is None


# ----------------------------- text_metrics -----------------------------------
class TestParseNumber:
    def test_success_commas_and_decimals(self):
        assert text_metrics._parse_number("391,035") == 391035.0
        assert text_metrics._parse_number("7.46") == 7.46

    def test_failure_non_numeric_raises(self):
        with pytest.raises(ValueError):
            text_metrics._parse_number("not-a-number")

    def test_edge_infinity_parses_to_inf(self):
        assert math.isinf(text_metrics._parse_number("inf"))


class TestSearch:
    def test_success_returns_first_group(self):
        assert text_metrics._search(r"Net income \$ ([\d,]+)",
                                    "Net income $ 93,736") == "93,736"

    def test_failure_no_match_returns_none(self):
        assert text_metrics._search(r"Revenue ([\d,]+)", "nothing here") is None


class TestIncomeStatement:
    def test_success_extracts_revenue_and_income(self):
        out = text_metrics.extract_income_statement(
            "Total net sales $ 391,035\nNet income $ 93,736")
        assert out["total_revenue_millions"] == 391035.0
        assert out["net_income_millions"] == 93736.0

    def test_failure_no_matches_returns_empty(self):
        assert text_metrics.extract_income_statement("irrelevant prose") == {}

    def test_edge_empty_string(self):
        assert text_metrics.extract_income_statement("") == {}


class TestBalanceSheet:
    def test_success_negative_working_capital(self):
        out = text_metrics.extract_balance_sheet(
            "Total current assets $ 152,987\n"
            "Total current liabilities $ 176,392\n"
            "Total assets $ 364,980")
        assert out["total_assets_millions"] == 364980.0
        assert out["working_capital_millions"] == 152987.0 - 176392.0


class TestCashFlow:
    def test_success_free_cash_flow_computed(self):
        out = text_metrics.extract_cash_flow(
            "Cash generated by operating activities $ 118,254\n"
            "Payments for acquisition of property $ 9,447")
        assert out["operating_cash_flow_millions"] == 118254.0
        assert out["capex_millions"] == 9447.0
        assert out["free_cash_flow_millions"] == 118254.0 - 9447.0


class TestQualitative:
    def test_success_themes_macros_employees(self):
        secs = {
            "mda": "Inflation and supply chain pressures persist into next year.",
            "risk_factors": "We face intense competition and cybersecurity risk incl. data breach.",
            "business": "We employed 150,000 full-time equivalent employees.",
        }
        out = text_metrics.extract_qualitative(secs)
        assert "inflation" in out["macro_risks_mentioned"]
        assert "competition" in out["key_risk_themes"]
        assert "cybersecurity" in out["key_risk_themes"]
        assert out["full_time_employees"] == 150000.0

    def test_edge_empty_sections(self):
        out = text_metrics.extract_qualitative({})
        assert out["macro_risks_mentioned"] == []
        assert out["key_risk_themes"] == []


# ----------------------------- sections ---------------------------------------
class TestSections:
    def test_success_splits_items(self):
        text = ("Item 1. Business\n" + "The company designs and sells devices. " * 15 +
                "\nItem 1A. Risk Factors\n" + "Various risks could affect results. " * 15)
        out = sections.extract_sections(text)
        assert "business" in out and "risk_factors" in out

    def test_edge_short_content_dropped(self):
        out = sections.extract_sections("Item 1. Business\nToo short to keep.")
        assert "business" not in out


# ----------------------------- extractor.extract_all_metrics ------------------
class TestExtractAllMetrics:
    def test_success_structure(self):
        out = extractor.extract_all_metrics(
            {"financial_statements": "Total net sales $ 391,035\nNet income $ 93,736",
             "mda": "We expect continued growth."})
        assert set(out) == {"income_statement", "balance_sheet", "cash_flow",
                            "computed_ratios", "qualitative"}
        assert out["income_statement"]["total_revenue_millions"] == 391035.0

    def test_edge_empty_sections(self):
        out = extractor.extract_all_metrics({})
        assert out["income_statement"] == {}
        assert out["computed_ratios"] == {}


# ----------------------------- sec_client (pure) ------------------------------
class TestSecClientPure:
    def test_success_get_document_url(self):
        assert sec_client.get_document_url(
            "0000320193", "0000320193-25-000079", "aapl.htm"
        ) == "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl.htm"


# ----------------------------- sec_client (mocked network) --------------------
class TestSecClientMocked:
    @patch("sec_client.requests.get")
    def test_success_get_cik(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"0": {"ticker": "AAPL", "cik_str": 320193}})
        assert sec_client.get_cik("aapl") == "0000320193"

    @patch("sec_client.requests.get")
    def test_failure_get_cik_not_found(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"0": {"ticker": "MSFT", "cik_str": 789019}})
        with pytest.raises(ValueError):
            sec_client.get_cik("AAPL")

    @patch("sec_client.requests.get")
    def test_success_get_filings_filters_form(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"filings": {"recent": {
            "form": ["10-Q", "10-K", "10-K"],
            "filingDate": ["2024-08-01", "2024-11-01", "2023-11-01"],
            "accessionNumber": ["q1", "k1", "k2"],
            "primaryDocument": ["dq1", "dk1", "dk2"]}}})
        out = sec_client.get_filings("0000320193", form_type="10-K", limit=5)
        assert [f["accession"] for f in out] == ["k1", "k2"]

    @patch("sec_client.requests.get")
    def test_failure_network_error_propagates(self, mock_get):
        import requests as _rq
        mock_get.side_effect = _rq.RequestException("boom")
        with pytest.raises(_rq.RequestException):
            sec_client.get_company_facts("0000320193")


# ----------------------------- app (FastAPI) ----------------------------------
class TestApp:
    def _client(self, monkeypatch, run_impl):
        pytest.importorskip("httpx")  # TestClient needs httpx
        import app as app_module
        monkeypatch.setattr(app_module, "run", run_impl)
        from fastapi.testclient import TestClient
        return TestClient(app_module.app)

    def test_success_returns_payload(self, monkeypatch):
        client = self._client(monkeypatch, lambda t, f="10-K": {"ticker": t.upper(), "ok": True})
        resp = client.get("/extract/aapl")
        assert resp.status_code == 200
        assert resp.json()["ticker"] == "AAPL"

    def test_failure_unknown_ticker_404(self, monkeypatch):
        def boom(t, f="10-K"):
            raise ValueError("Ticker not found")
        client = self._client(monkeypatch, boom)
        assert client.get("/extract/zzz").status_code == 404

    def test_edge_upstream_error_502(self, monkeypatch):
        def boom(t, f="10-K"):
            raise RuntimeError("SEC down")
        client = self._client(monkeypatch, boom)
        assert client.get("/extract/aapl").status_code == 502
