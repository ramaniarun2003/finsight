import pytest


class TestApp:
    def _client(self, monkeypatch, run_impl):
        pytest.importorskip("httpx")  # TestClient needs httpx
        import backend.data_extract.app as app_module
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
