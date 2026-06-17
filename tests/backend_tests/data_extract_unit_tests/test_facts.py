from backend.data_extract import facts


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

    def test_success_extension_only_field(self):
        f = {"facts": {"aapl": {"RevenueFromProducts": {"units": {"USD": [
            {"form": "10-K", "fp": "FY", "val": 294866, "fy": 2024, "end": "2024-09-28"}]}}}}}
        assert facts.get_fact(f, "product_revenue")["value"] == 294866

    def test_failure_missing_concept_returns_none(self):
        assert facts.latest_annual({"facts": {}}, "us-gaap", "Nope", "USD") is None
        f = _facts_with("Assets", [
            {"form": "10-K", "fp": "FY", "val": 1, "fy": 2024, "end": "2024-09-28"}])
        assert facts.get_fact(f, "net_income") is None

    def test_edge_only_quarterly_no_annual(self):
        f = _facts_with("NetIncomeLoss", [
            {"form": "10-Q", "fp": "Q1", "val": 10, "fy": 2024, "end": "2024-03-30"}])
        assert facts.latest_annual(f, "us-gaap", "NetIncomeLoss", "USD") is None


class TestFactsStatements:
    def test_success_income_statement(self, companyfacts):
        cf = companyfacts(
            usd={"RevenueFromContractWithCustomerExcludingAssessedTax": 416_161_000_000,
                 "GrossProfit": 195_201_000_000,
                 "OperatingIncomeLoss": 133_050_000_000,
                 "NetIncomeLoss": 112_010_000_000},
            per_share={"EarningsPerShareBasic": 7.49},
            pure={"EffectiveIncomeTaxRateContinuingOperations": 0.151})
        inc = facts.extract_income_statement(cf)
        assert inc["total_revenue_millions"] == 416161.0
        assert inc["net_income_millions"] == 112010.0
        assert inc["eps_basic"] == 7.49
        assert inc["effective_tax_rate_pct"] == 15.1
        assert inc["gross_margin_pct"] == round(195201 / 416161 * 100, 2)

    def test_success_revenue_concept_fallback(self, companyfacts):
        cf = companyfacts(usd={"Revenues": 50_000_000_000})
        assert facts.extract_income_statement(cf)["total_revenue_millions"] == 50000.0

    def test_success_balance_sheet_working_capital(self, companyfacts):
        cf = companyfacts(usd={"AssetsCurrent": 152_987_000_000,
                               "LiabilitiesCurrent": 176_392_000_000,
                               "Assets": 364_980_000_000})
        bs = facts.extract_balance_sheet(cf)
        assert bs["total_assets_millions"] == 364980.0
        assert bs["working_capital_millions"] == round(152987.0 - 176392.0, 2)

    def test_success_cash_flow_free_cash_flow(self, companyfacts):
        cf = companyfacts(usd={
            "NetCashProvidedByUsedInOperatingActivities": 118_254_000_000,
            "PaymentsToAcquirePropertyPlantAndEquipment": 9_447_000_000})
        cfo = facts.extract_cash_flow(cf)
        assert cfo["operating_cash_flow_millions"] == 118254.0
        assert cfo["capex_millions"] == 9447.0
        assert cfo["free_cash_flow_millions"] == round(118254.0 - 9447.0, 2)

    def test_failure_missing_concepts_returns_empty(self):
        assert facts.extract_income_statement({"facts": {}}) == {}
        assert facts.extract_balance_sheet({"facts": {}}) == {}
        assert facts.extract_cash_flow({"facts": {}}) == {}

    def test_edge_quarterly_only_ignored(self):
        cf = {"facts": {"us-gaap": {"NetIncomeLoss": {"units": {"USD": [
            {"form": "10-Q", "fp": "Q1", "val": 1_000_000, "fy": 2024, "end": "2024-03-30"}]}}}}}
        assert facts.extract_income_statement(cf) == {}
