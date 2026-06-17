from backend.data_extract import sections


class TestSections:
    def test_success_splits_items(self):
        text = ("Item 1. Business\n" + "The company designs and sells devices. " * 15 +
                "\nItem 1A. Risk Factors\n" + "Various risks could affect results. " * 15)
        out = sections.extract_sections(text)
        assert "business" in out and "risk_factors" in out

    def test_edge_short_content_dropped(self):
        out = sections.extract_sections("Item 1. Business\nToo short to keep.")
        assert "business" not in out
