"""
Legacy regex-based metric extraction from filing text.

Fallback layer used when structured XBRL data isn't available (or for fields
that aren't reliably tagged). Operates on the plain text produced by
``sec_client.fetch_and_parse`` and the ``sections`` splitter.
"""

import re


# ─── HELPERS ────────────────────────────────────────────────────────────────

def _parse_number(raw: str) -> float | None:
    """Convert a string like '416,161' or '7.46' to a float.

    Returns None for anything that isn't a clean number (empty string, a stray
    comma, None, etc.) so a single junk token can't crash the whole pipeline.
    """
    try:
        return float(raw.replace(",", "").strip())
    except (ValueError, TypeError, AttributeError):
        return None


def _search(pattern: str, text: str, flags=re.IGNORECASE) -> str | None:
    """Return first capture group or None."""
    try:
        m = re.search(pattern, text, flags)
        return m.group(1).strip() if m else None

    except Exception as e:
        print(f"Error searching for pattern '{pattern}' in text: {e}")
        raise


# ─── INCOME STATEMENT ───────────────────────────────────────────────────────

def extract_income_statement(text: str) -> dict:
    try:
        out = {}

        pairs = [
            ("total_revenue_millions",       r"[Tt]otal\s+net\s+sales\s*\$?\s*([\d,]+)"),
            ("product_revenue_millions",     r"[Pp]roducts?\s*\$?\s*([\d,]+)\s*\$?\s*[\d,]+\s*\$?\s*[\d,]+"),
            ("services_revenue_millions",    r"[Ss]ervices?\s*(?:\(1\))?\s*\$?\s*([\d,]+)\s*\$?\s*[\d,]+\s*\$?\s*[\d,]+"),
            ("gross_margin_millions",        r"[Gg]ross\s+margin\s*\$?\s*([\d,]+)"),
            ("gross_margin_pct",             r"[Tt]otal\s+gross\s+margin\s+percentage\s+([\d.]+)\s*%"),
            ("operating_income_millions",    r"[Oo]perating\s+income\s*\$?\s*([\d,]+)"),
            ("net_income_millions",          r"[Nn]et\s+income\s*\$?\s*([\d,]+)"),
            ("eps_basic",                    r"[Bb]asic\s*\$?\s*([\d.]+)"),
            ("eps_diluted",                  r"[Dd]iluted\s*\$?\s*([\d.]+)"),
            ("rd_expense_millions",          r"[Rr]esearch\s+and\s+development\s*\$?\s*([\d,]+)"),
            ("sga_expense_millions",         r"[Ss]elling,?\s+general\s+and\s+administrative\s*\$?\s*([\d,]+)"),
            ("total_opex_millions",          r"[Tt]otal\s+operating\s+expenses\s*\$?\s*([\d,]+)"),
            ("income_tax_millions",          r"[Pp]rovision\s+for\s+income\s+taxes\s*\$?\s*([\d,]+)"),
            ("effective_tax_rate_pct",       r"[Ee]ffective\s+tax\s+rate\s+([\d.]+)\s*%"),
        ]

        for key, pattern in pairs:
            raw = _search(pattern, text)
            if raw:
                out[key] = _parse_number(raw)

        # YoY revenue growth — look for a % change figure near "Total net sales"
        growth = _search(r"[Tt]otal\s+net\s+sales.*?([\d]+)\s*%", text, re.DOTALL)
        if growth:
            out["revenue_yoy_growth_pct"] = _parse_number(growth)

        return out

    except Exception as e:
        print(f"Error extracting income statement metrics: {e}")
        raise


# ─── BALANCE SHEET ──────────────────────────────────────────────────────────

def extract_balance_sheet(text: str) -> dict:
    try:
        out = {}

        pairs = [
            ("cash_and_equivalents_millions",   r"[Cc]ash\s+and\s+cash\s+equivalents\s*\$?\s*([\d,]+)"),
            ("marketable_securities_current",   r"[Mm]arketable\s+securities\s*\n.*?([\d,]+)"),
            ("total_current_assets_millions",   r"[Tt]otal\s+current\s+assets\s*\$?\s*([\d,]+)"),
            ("total_assets_millions",           r"[Tt]otal\s+assets\s*\$?\s*([\d,]+)"),
            ("total_current_liabilities",       r"[Tt]otal\s+current\s+liabilities\s*\$?\s*([\d,]+)"),
            ("total_liabilities_millions",      r"[Tt]otal\s+liabilities\s*\$?\s*([\d,]+)"),
            ("shareholders_equity_millions",    r"[Tt]otal\s+shareholders.?\s+equity\s*\$?\s*([\d,]+)"),
            ("long_term_debt_millions",         r"[Tt]otal\s+non.current\s+portion\s+of\s+term\s+debt\s*\$?\s*([\d,]+)"),
            ("retained_earnings_millions",      r"[Aa]ccumulated\s+deficit\s*\(?\s*([\d,]+)"),
            ("ppe_net_millions",                r"[Pp]roperty,\s+plant\s+and\s+equipment,\s+net\s*\$?\s*([\d,]+)"),
            ("inventories_millions",            r"[Ii]nventor(?:y|ies)\s*\$?\s*([\d,]+)"),
            ("accounts_receivable_millions",    r"[Aa]ccounts\s+receivable,?\s+net\s*\$?\s*([\d,]+)"),
            ("deferred_revenue_millions",       r"[Dd]eferred\s+revenue\s*\$?\s*([\d,]+)"),
            ("commercial_paper_millions",       r"[Cc]ommercial\s+paper\s*\$?\s*([\d,]+)"),
        ]

        for key, pattern in pairs:
            raw = _search(pattern, text)
            if raw:
                out[key] = _parse_number(raw)

        # Working capital (computed)
        if out.get("total_current_assets_millions") and out.get("total_current_liabilities"):
            out["working_capital_millions"] = (
                out["total_current_assets_millions"] - out["total_current_liabilities"]
            )

        return out

    except Exception as e:
        print(f"Error extracting balance sheet metrics: {e}")
        raise


# ─── CASH FLOW ──────────────────────────────────────────────────────────────

def extract_cash_flow(text: str) -> dict:
    try:
        out = {}

        pairs = [
            ("operating_cash_flow_millions",    r"[Cc]ash\s+generated\s+by\s+operating\s+activities\s*\$?\s*([\d,]+)"),
            ("investing_cash_flow_millions",    r"[Cc]ash\s+generated\s+by\s+investing\s+activities\s*\$?\s*([\d,]+)"),
            ("capex_millions",                  r"[Pp]ayments\s+for\s+acquisition\s+of\s+property.*?([\d,]+)"),
            ("dividends_paid_millions",         r"[Pp]ayments\s+for\s+dividends.*?([\d,]+)"),
            ("share_repurchases_millions",      r"[Rr]epurchases?\s+of\s+common\s+stock\s*\(?\s*([\d,]+)"),
            ("depreciation_amortization",       r"[Dd]epreciation\s+and\s+amortization\s*\$?\s*([\d,]+)"),
            ("share_based_comp_millions",       r"[Ss]hare.based\s+compensation\s+expense\s*\$?\s*([\d,]+)"),
        ]

        for key, pattern in pairs:
            raw = _search(pattern, text)
            if raw:
                out[key] = _parse_number(raw)

        # Free cash flow (computed)
        if out.get("operating_cash_flow_millions") and out.get("capex_millions"):
            out["free_cash_flow_millions"] = (
                out["operating_cash_flow_millions"] - out["capex_millions"]
            )

        return out

    except Exception as e:
        print(f"Error extracting cash flow metrics: {e}")
        raise


# ─── QUALITATIVE EXTRACTION ─────────────────────────────────────────────────

def extract_qualitative(sections: dict) -> dict:
    try:
        out = {}

        mda = sections.get("mda", "")
        risks = sections.get("risk_factors", "")
        business = sections.get("business", "")

        # Guidance — look for forward-looking language near revenue/growth
        guidance_patterns = [
            r"(expect[s]?\s+.{20,150}(?:revenue|growth|sales|margin).{0,100})",
            r"(anticipate[s]?\s+.{20,150}(?:revenue|growth|sales|margin).{0,100})",
            r"(outlook.{0,20}:.{20,200})",
            r"(guidance.{0,20}:.{20,200})",
        ]
        guidance_hits = []
        for pat in guidance_patterns:
            hits = re.findall(pat, mda, re.IGNORECASE)
            guidance_hits.extend(hits[:2])
        if guidance_hits:
            out["forward_guidance_excerpts"] = guidance_hits[:5]

        # Macro risks mentioned
        macro_keywords = ["tariff", "inflation", "interest rate", "recession", "supply chain",
                        "foreign exchange", "currency", "geopolitical", "trade"]
        macro_mentioned = [kw for kw in macro_keywords if kw.lower() in (mda + risks).lower()]
        out["macro_risks_mentioned"] = macro_mentioned

        # Segment breakdown — segment name + dollar amount. The amount must start
        # with a digit so a stray comma/blank can't match, and unparseable values
        # are dropped rather than stored.
        segment_pattern = r"(Americas|Europe|Greater China|Japan|Rest of Asia Pacific|North America|International)\s*\$?\s*(\d[\d,]*)"
        segments = re.findall(segment_pattern, mda, re.IGNORECASE)
        seg_rev = {seg: _parse_number(val) for seg, val in segments[:10]}
        seg_rev = {k: v for k, v in seg_rev.items() if v is not None}
        if seg_rev:
            out["segment_revenue"] = seg_rev

        # Product revenue breakdown (amount must start with a digit)
        product_pattern = r"(iPhone|Mac|iPad|Wearables|Services|Windows|Cloud|Azure|Advertising|Search)\s*\$?\s*(\d[\d,]*)"
        products = re.findall(product_pattern, mda, re.IGNORECASE)
        prod_rev = {prod: _parse_number(val) for prod, val in products[:10]}
        prod_rev = {k: v for k, v in prod_rev.items() if v is not None}
        if prod_rev:
            out["product_revenue"] = prod_rev

        # Key risk themes from risk factors
        risk_themes = []
        risk_keywords = {
            "competition": r"competi",
            "regulation": r"regulat",
            "cybersecurity": r"cybersecur|data breach|ransomware",
            "supply_chain": r"supply chain|component shortage",
            "ai_risk": r"artificial intelligence|machine learning",
            "ip_risk": r"intellectual property|patent infringement",
            "tax_risk": r"tax rate|tax liabilit",
            "fx_risk": r"foreign exchange|currency fluctuat",
            "geopolitical_risk": r"geopolitical|trade war|sanction",
        }
        for theme, pattern in risk_keywords.items():
            if re.search(pattern, risks, re.IGNORECASE):
                risk_themes.append(theme)

        out["key_risk_themes"] = risk_themes

        # Employee count
        emp_match = re.search(r"([\d,]+)\s+full.time\s+equivalent\s+employees", business, re.IGNORECASE)
        if emp_match:
            emp = _parse_number(emp_match.group(1))
            if emp is not None:
                out["full_time_employees"] = emp

        # Fiscal year end
        fy_match = re.search(r"fiscal\s+year(?:\s+ended)?\s+(September|December|June|March|January)\s*[\d,]+,?\s*(\d{4})", mda, re.IGNORECASE)

        if fy_match:
            out["fiscal_year_end"] = f"{fy_match.group(1)} {fy_match.group(2)}"

        return out

    except Exception as e:
        print(f"Error extracting qualitative insights: {e}")
        raise
