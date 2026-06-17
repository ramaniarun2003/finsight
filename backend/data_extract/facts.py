"""
Structured XBRL extraction from SEC ``companyfacts`` data.

Standardized and company-agnostic: every number comes from an official us-gaap
concept, so the same code works for any filer. Pure logic over the facts dict returned
by ``sec_client.get_company_facts``.
"""

# field -> ordered list of candidate us-gaap concepts. Multiple candidates
# because filers tag the same line differently / older filings use legacy tags.
INCOME_CONCEPTS = {
    "total_revenue_millions": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "RevenueFromContractWithCustomerIncludingAssessedTax",
        "SalesRevenueNet",
    ],
    "cost_of_revenue_millions": [
        "CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold",
    ],
    "gross_margin_millions": ["GrossProfit"],
    "rd_expense_millions": ["ResearchAndDevelopmentExpense"],
    "sga_expense_millions": [
        "SellingGeneralAndAdministrativeExpense",
        "GeneralAndAdministrativeExpense",
    ],
    "total_opex_millions": ["OperatingExpenses", "CostsAndExpenses"],
    "operating_income_millions": ["OperatingIncomeLoss"],
    "income_tax_millions": ["IncomeTaxExpenseBenefit"],
    "net_income_millions": ["NetIncomeLoss"],
}

INCOME_PER_SHARE = {  # unit "USD/shares"; never scaled to millions
    "eps_basic": ["EarningsPerShareBasic"],
    "eps_diluted": ["EarningsPerShareDiluted"],
}

INCOME_RATES = {  # unit "pure"; a decimal ratio reported as a percent
    "effective_tax_rate_pct": ["EffectiveIncomeTaxRateContinuingOperations"],
}

BALANCE_CONCEPTS = {
    "cash_and_equivalents_millions": ["CashAndCashEquivalentsAtCarryingValue"],
    "total_current_assets_millions": ["AssetsCurrent"],
    "total_assets_millions": ["Assets"],
    "total_current_liabilities": ["LiabilitiesCurrent"],
    "total_liabilities_millions": ["Liabilities"],
    "shareholders_equity_millions": [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ],
    "long_term_debt_millions": ["LongTermDebtNoncurrent", "LongTermDebt"],
    "retained_earnings_millions": ["RetainedEarningsAccumulatedDeficit"],
    "ppe_net_millions": ["PropertyPlantAndEquipmentNet"],
    "inventories_millions": ["InventoryNet"],
    "accounts_receivable_millions": ["AccountsReceivableNetCurrent"],
}

CASHFLOW_CONCEPTS = {
    "operating_cash_flow_millions": [
        "NetCashProvidedByUsedInOperatingActivities",
        "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
    ],
    "investing_cash_flow_millions": ["NetCashProvidedByUsedInInvestingActivities"],
    "financing_cash_flow_millions": ["NetCashProvidedByUsedInFinancingActivities"],
    "capex_millions": ["PaymentsToAcquirePropertyPlantAndEquipment"],
    "dividends_paid_millions": ["PaymentsOfDividendsCommonStock", "PaymentsOfDividends"],
    "share_repurchases_millions": ["PaymentsForRepurchaseOfCommonStock"],
    "depreciation_amortization": [
        "DepreciationDepletionAndAmortization",
        "DepreciationAmortizationAndAccretionNet",
        "DepreciationAndAmortization",
    ],
    "share_based_comp_millions": ["ShareBasedCompensation"],
}

# Kept for the single-field helper + extension-tag tests.
CONCEPT_MAP = {
    "total_revenue": ("us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax", "USD"),
    "net_income":          ("us-gaap", "NetIncomeLoss", "USD"),
    "total_assets":        ("us-gaap", "Assets", "USD"),
    "total_liabilities":   ("us-gaap", "Liabilities", "USD"),
    "shareholders_equity": ("us-gaap", "StockholdersEquity", "USD"),
    "operating_cash_flow": ("us-gaap", "NetCashProvidedByUsedInOperatingActivities", "USD"),
    "cash_and_equivalents": ("us-gaap", "CashAndCashEquivalentsAtCarryingValue", "USD"),
}

EXTENSION_OVERRIDES = {
    "product_revenue": ["RevenueFromProducts", "ProductRevenue"],
}


def latest_annual(facts, taxonomy, concept, unit):
    """Most recent 10-K (full-year) value for one concept, with its period."""
    try:
        rows = facts["facts"][taxonomy][concept]["units"][unit]
    except KeyError:
        return None
    
    annual = [r for r in rows if r.get("form") == "10-K" and r.get("fp") == "FY"]
    if not annual:
        return None
    
    best = max(annual, key=lambda r: r["end"])
    
    return {"value": best["val"], "fy": best["fy"], "end": best["end"]}


def _first(facts, concepts, unit="USD"):
    """First candidate concept that resolves to an annual value."""
    for concept in concepts:
        hit = latest_annual(facts, "us-gaap", concept, unit)
        if hit:
            return hit
        
    return None


def _millions(value):
    """Scale a raw number to millions and round to 2 decimals."""
    return round(value / 1_000_000, 2)


def extract_income_statement(facts: dict) -> dict:
    """Income-statement metrics from XBRL (works for any filer)."""
    out = {}
    for field, concepts in INCOME_CONCEPTS.items():
        hit = _first(facts, concepts)
        if hit:
            out[field] = _millions(hit["value"])
            
    for field, concepts in INCOME_PER_SHARE.items():
        hit = _first(facts, concepts, unit="USD/shares")
        if hit:
            out[field] = hit["value"]
            
    for field, concepts in INCOME_RATES.items():
        hit = _first(facts, concepts, unit="pure")
        if hit:
            out[field] = round(hit["value"] * 100, 2)
            
    if out.get("gross_margin_millions") and out.get("total_revenue_millions"):
        out["gross_margin_pct"] = round(
            out["gross_margin_millions"] / out["total_revenue_millions"] * 100, 2)
        
    return out


def extract_balance_sheet(facts: dict) -> dict:
    """Balance-sheet metrics from XBRL."""
    out = {}
    for field, concepts in BALANCE_CONCEPTS.items():
        hit = _first(facts, concepts)
        if hit:
            out[field] = _millions(hit["value"])
            
    if out.get("total_current_assets_millions") and out.get("total_current_liabilities"):
        out["working_capital_millions"] = round(
            out["total_current_assets_millions"] - out["total_current_liabilities"], 2)
        
    return out


def extract_cash_flow(facts: dict) -> dict:
    """Cash-flow metrics from XBRL."""
    out = {}
    for field, concepts in CASHFLOW_CONCEPTS.items():
        hit = _first(facts, concepts)
        if hit:
            out[field] = _millions(hit["value"])
            
    if out.get("operating_cash_flow_millions") and out.get("capex_millions"):
        out["free_cash_flow_millions"] = round(
            out["operating_cash_flow_millions"] - out["capex_millions"], 2)
        
    return out


def get_fact(facts, field):
    """Single field: standard us-gaap concept first, then company extension tags."""
    mapped = CONCEPT_MAP.get(field)
    if mapped:
        taxonomy, concept, unit = mapped
        hit = latest_annual(facts, taxonomy, concept, unit)
        if hit:
            return hit
        
    for tax, concepts in facts.get("facts", {}).items():
        if tax in ("us-gaap", "dei"):
            continue
        
        for cand in EXTENSION_OVERRIDES.get(field, []):
            if cand in concepts:
                for u in concepts[cand]["units"]:
                    hit = latest_annual(facts, tax, cand, u)
                    if hit:
                        return hit
    return None
