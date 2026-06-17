from backend.data_extract import validation


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
