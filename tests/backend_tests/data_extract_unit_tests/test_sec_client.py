from unittest.mock import patch

import pytest

from backend.data_extract import sec_client


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


class TestSecClientPure:
    def test_success_get_document_url(self):
        assert sec_client.get_document_url(
            "0000320193", "0000320193-25-000079", "aapl.htm"
        ) == "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl.htm"


class TestSecClientMocked:
    @patch("backend.data_extract.sec_client.requests.get")
    def test_success_get_cik(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"0": {"ticker": "AAPL", "cik_str": 320193}})
        assert sec_client.get_cik("aapl") == "0000320193"

    @patch("backend.data_extract.sec_client.requests.get")
    def test_failure_get_cik_not_found(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"0": {"ticker": "MSFT", "cik_str": 789019}})
        with pytest.raises(ValueError):
            sec_client.get_cik("AAPL")

    @patch("backend.data_extract.sec_client.requests.get")
    def test_success_get_filings_filters_form(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"filings": {"recent": {
            "form": ["10-Q", "10-K", "10-K"],
            "filingDate": ["2024-08-01", "2024-11-01", "2023-11-01"],
            "accessionNumber": ["q1", "k1", "k2"],
            "primaryDocument": ["dq1", "dk1", "dk2"]}}})
        out = sec_client.get_filings("0000320193", form_type="10-K", limit=5)
        assert [f["accession"] for f in out] == ["k1", "k2"]

    @patch("backend.data_extract.sec_client.requests.get")
    def test_success_get_company_facts(self, mock_get):
        mock_get.return_value = FakeResponse(json_data={"facts": {"us-gaap": {}}})
        assert "facts" in sec_client.get_company_facts("0000320193")

    @patch("backend.data_extract.sec_client.requests.get")
    def test_failure_network_error_propagates(self, mock_get):
        import requests as _rq
        mock_get.side_effect = _rq.RequestException("boom")
        with pytest.raises(_rq.RequestException):
            sec_client.get_company_facts("0000320193")
