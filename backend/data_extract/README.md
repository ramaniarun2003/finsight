# FinSight — Backend (`data_extract`) Directory Guide

How the extraction backend works, what it outputs, how to test it, and what to edit when you want to change the numbers it produces.

The financial **numbers** now come from SEC's standardized XBRL `companyfacts` data (`facts.py`), so they work for any filer. The **narrative** still comes from the filing document. The Apple-tuned regex extractors in `text_metrics.py` are only for tests.

---

## 1. How it works — function by function

The whole pipeline is driven by `extractor.run(ticker, form)`. Call flow, top to bottom (module → module):

```
app.py    GET /extract/{ticker}
  │       (thin FastAPI wrapper; just calls run() and maps errors to HTTP codes)
  ▼
extractor.run(ticker, form)                          ← orchestrator / entry point
  │
  ├─ sec_client.get_cik(ticker)                      ticker  → 10-digit CIK
  ├─ sec_client.get_filings(cik, form, limit=1)      CIK     → newest filing's metadata
  ├─ sec_client.get_document_url(...)                → full EDGAR URL
  ├─ sec_client.fetch_and_parse(url)                 HTML    → clean text  (narrative)
  ├─ sections.extract_sections(text)                 text    → {business, mda, risk_factors, ...}
  ├─ sec_client.get_company_facts(cik)               CIK     → XBRL facts  (numbers)
  └─ extractor.extract_all_metrics(company_facts, sections)
        │
        ├─ facts.extract_income_statement(company_facts)   XBRL → revenue, net income, EPS, ...
        ├─ facts.extract_balance_sheet(company_facts)      XBRL → assets, liabilities, equity, ...
        ├─ facts.extract_cash_flow(company_facts)          XBRL → operating CF, capex, FCF, ...
        ├─ ratios.compute_ratios(income, balance, cash_flow) math → ROE, margins, current ratio, ...
        └─ text_metrics.extract_qualitative(sections)      text → risks, segments, employees, ...
  ▼
result dict  →  JSON
```

### The pipeline functions, in order

**`extractor.run(ticker, form="10-K")`** — entry point. Fetches the filing (for narrative) *and* the XBRL facts (for numbers), then assembles the result dict. Prints `[1/5]…[5/5]` progress.

**`sec_client.get_cik(ticker)`** — downloads SEC's ticker list (`company_tickers.json`) and returns the 10-digit CIK. Raises `ValueError` if the ticker isn't found.

**`sec_client.get_filings(cik, form_type, limit)`** — returns the most recent filings of that form type. Each item has `form`, `date`, `accession`, `primary_document`.

**`sec_client.get_document_url(...)`** — pure string builder for the EDGAR document URL.

**`sec_client.fetch_and_parse(url)`** — downloads the filing HTML and strips it to clean text (used for the narrative sections only).

**`sec_client.get_company_facts(cik)`** — one call to SEC's XBRL `companyfacts` API; returns every reported fact with units and periods. This is the source of all the numbers.

**`sections.extract_sections(text)`** — splits the text into 10-K sections by "Item N." headers (`business`, `risk_factors`, `mda`, …). Keeps the longest copy of each (skips TOC stubs) and drops anything under 200 chars.

**`facts.extract_income_statement / _balance_sheet / _cash_flow(company_facts)`** — the standardized number extractors. Each maps output fields to a list of candidate us-gaap concepts (e.g. revenue tries `RevenueFromContractWithCustomerExcludingAssessedTax`, then `Revenues`, …), takes the latest annual (10-K / FY) value via `latest_annual`, and scales USD to millions. Works for any filer. Helpers: `_first` (first matching concept) and `_millions`.

**`ratios.compute_ratios(income, balance, cash_flow)`** — derives debt-to-equity, ROE, ROA, current ratio, and margins. Every calc is guarded, so a missing or zero input is skipped (no divide-by-zero).

**`extractor.extract_all_metrics(company_facts, sections)`** — the fan-out: builds the three statements from XBRL, computes ratios, and adds qualitative signals from the narrative. Returns `{income_statement, balance_sheet, cash_flow, computed_ratios, qualitative}`.

**`text_metrics.extract_qualitative(sections)`** — keyword/pattern scan of the MD&A, risk, and business text: macro risks, risk themes, segment & product revenue, employee count, fiscal year-end. (Note: the segment/product patterns are still heuristic and somewhat company-specific — XBRL segment data is the eventual upgrade.)

### Modules kept for tests / future use

- **`facts.get_fact(facts, field)` / `CONCEPT_MAP` / `EXTENSION_OVERRIDES`** — single-field lookup with company-extension fallback (handy for one-off fields like `product_revenue`).
- **`sections.get_narrative(cik)`** — fetch a filing and return just the prose sections.
- **`validation.validate(metrics)`** — cheap sanity checks (balance sheet balances, net income ≤ revenue).

---

## 2. What output to expect & how to test it

### Output shape (Example AAPL)

`run()` returns (and the CLI writes to `TICKER_FORM.json`):

```jsonc
{
  "ticker": "AAPL",
  "form": "10-K",
  "filing_date": "2025-10-31",
  "accession_number": "0000320193-25-000079",
  "source_url": "https://www.sec.gov/Archives/edgar/data/320193/.../aapl-...htm",
  "char_count": 206813,
  "metrics": {
    "income_statement": { ... },   // from XBRL
    "balance_sheet":    { ... },   // from XBRL
    "cash_flow":        { ... },   // from XBRL
    "computed_ratios":  { ... },   // computed
    "qualitative":      { ... }    // from narrative text
  },
  "sections": { "business": "...", "mda": "...", "risk_factors": "...", ... }
}
```

### Example metric values (AAPL)

```jsonc
"income_statement": {
  "total_revenue_millions": 416161.0,
  "gross_margin_millions": 195201.0,
  "gross_margin_pct": 46.9,
  "operating_income_millions": 133050.0,
  "net_income_millions": 112010.0,
  "eps_basic": 7.49
},
"computed_ratios": {
  "debt_to_equity": 1.062,
  "return_on_equity_pct": 151.91,
  "operating_margin_pct": 31.97,
  "net_margin_pct": 26.92,
  "current_ratio": 0.893
}
```

### How to test it yourself (run from the repo root)

#### Example with AAPL

```bash
# 1) CLI — runs the full pipeline live against SEC and saves JSON
python -m backend.data_extract.extractor AAPL 10-K
#    -> writes AAPL_10K.json and prints a per-category field count

# 2) API — serve it and hit the endpoint
uvicorn backend.data_extract.app:app --reload --port 8000
curl http://localhost:8000/extract/AAPL          # JSON response
#    open http://localhost:8000/docs for the interactive Swagger UI

# 3) Saving the data
curl.exe http://localhost:8000/extract/AAPL -o MSFT.json
# or
Invoke-RestMethod http://localhost:8000/extract/AAPL | ConvertTo-Json -Depth 10 | Out-File MSFT.json
```

Quick offline check of the XBRL extractor (no network) with a synthetic facts dict:

```python
from backend.data_extract import facts

cf = {"facts": {"us-gaap": {
    "NetIncomeLoss": {"units": {"USD": [
        {"form": "10-K", "fp": "FY", "val": 112_010_000_000, "fy": 2024, "end": "2024-09-28"}]}}}}}
print(facts.extract_income_statement(cf))   # {'net_income_millions': 112010.0}
```

---

## 3. Which companies, and where to find the list

`run()` works for **any company that files with SEC EDGAR and has a CIK** — US-listed public companies (AAPL, MSFT, NVDA, AMZN, JPM, …) and many foreign filers. Now that the numbers come from XBRL, standard line items resolve **uniformly across companies**.

- **Ticker → CIK list:** https://www.sec.gov/files/company_tickers.json (~10,000 companies; the exact file `get_cik()` downloads)
- **Browse a company's filings:** https://www.sec.gov/cgi-bin/browse-edgar
- **EDGAR full-text search (find filings by keyword):** https://www.sec.gov/edgar/search/

Two residual caveats: (1) some line items use company **extension tags** not in the standard taxonomy (handled case-by-case via `EXTENSION_OVERRIDES`), and (2) the **qualitative** segment/product breakdowns still use heuristic text patterns, so those specific fields are best on filers that phrase things like Apple. The core financial statements are now filer-agnostic.

---

## 4. What to edit to add/remove calculation parameters

Each kind of number has one home:

| You want to change… | Edit | How |
|---|---|---|
| A financial-statement number (e.g. `total_revenue`, `net_income`) — **primary path** | `facts.py` → `INCOME_CONCEPTS` / `BALANCE_CONCEPTS` / `CASHFLOW_CONCEPTS` | Add/remove `field: [candidate us-gaap concepts]`. Listed in priority order; first match wins. |
| A computed ratio (ROE, margins, …) | `ratios.py` → `compute_ratios` | Add/remove a guarded block. |
| A per-share or rate field | `facts.py` → `INCOME_PER_SHARE` (unit `USD/shares`) or `INCOME_RATES` (unit `pure`) | Add/remove a `field: [concepts]` entry. |
| A single one-off field with extension fallback | `facts.py` → `CONCEPT_MAP` (+ `EXTENSION_OVERRIDES`) | Used by `get_fact`. |
| A validation check | `validation.py` → `validate` | Add/remove a rule that appends a warning string. |
| Qualitative signals (macro risks, themes, segments) | `text_metrics.py` → `extract_qualitative` | Edit `macro_keywords`, the `risk_keywords` dict, `segment_pattern`, `product_pattern`. |
| The Apple-tuned regex fallback (tests only) | `text_metrics.py` → the `pairs` lists | Add/remove a `(field_name, regex)` tuple. Not in the live pipeline. |

### Worked examples

**Add a financial-statement line** (`facts.py`) — the primary, filer-agnostic way:

```python
INCOME_CONCEPTS = {
    "total_revenue_millions": ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"],
    # add this — multiple candidates so it resolves across filers:
    "interest_expense_millions": ["InterestExpense", "InterestExpenseNonoperating"],
}
```

It flows straight into the output (USD auto-scaled to millions). To **remove** a field, delete its entry.

**Add a ratio** (`ratios.compute_ratios`):

```python
# Quick ratio = (current assets - inventory) / current liabilities
ca   = balance.get("total_current_assets_millions")
inv  = balance.get("inventories_millions") or 0
cl   = balance.get("total_current_liabilities")
if ca and cl and cl != 0:
    ratios["quick_ratio"] = round((ca - inv) / cl, 3)
```

> Tip: the field-name → us-gaap concept mapping is the heart of `facts.py`. To find the right concept for a line item, look it up in a company's `companyfacts` JSON
> (`https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`) under `facts → us-gaap`.

After any change, re-run the suite: `pytest tests/backend_tests/data_extract_unit_tests.py -v`.
