from backend.data_extract import extractor


class TestExtractAllMetrics:
    def test_success_structure_from_xbrl(self, companyfacts):
        cf = companyfacts(usd={
            "RevenueFromContractWithCustomerExcludingAssessedTax": 416_161_000_000,
            "NetIncomeLoss": 112_010_000_000})
        out = extractor.extract_all_metrics(cf, {"mda": "We expect continued growth."})
        assert set(out) == {"income_statement", "balance_sheet", "cash_flow",
                            "computed_ratios", "qualitative"}
        assert out["income_statement"]["total_revenue_millions"] == 416161.0

    def test_edge_empty_inputs(self):
        out = extractor.extract_all_metrics({"facts": {}}, {})
        assert out["income_statement"] == {}
        assert out["computed_ratios"] == {}
