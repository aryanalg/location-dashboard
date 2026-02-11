# Worksheet Selection Rules

This document defines how the importer decides which Excel tabs are used.

## Selection Pipeline

For each worksheet in the workbook:

1. Apply explicit excludes:
   - `EXCEL_SHEET_EXCLUDE_LIST`
   - `EXCEL_SHEET_EXCLUDE_REGEX`
2. Apply explicit includes:
   - `EXCEL_SHEET_INCLUDE_LIST`
   - `EXCEL_SHEET_INCLUDE_REGEX`
3. Apply built-in business rule:
   - Always include `Samples`
   - Include PO tabs that match `EXCEL_PO_SHEET_REGEX` (default: `CUSTOMER-PO`, e.g. `C0640-40413`, `C0553F-VPO12`)
   - Optionally include legacy PO tabs (`40413`, `40413 (P)`) when `EXCEL_ALLOW_LEGACY_PO_SHEETS=true`
4. Skip obvious non-data names (e.g. summary, dashboard, template, archive) when they are not explicitly included.
5. Validate required headers:
   - Must include `Job No`
   - Must include `Location`
   - Must include at least one of `Batch Qty` or `Total Qty`
6. Parse rows and keep the sheet only if at least one valid job row exists:
   - `Job No` starts with `SO`

## Why This Is More Robust

- Prevents accidental ingestion of helper tabs, pivots, and notes sheets.
- Uses data structure checks instead of relying only on naming conventions.
- Uses your current production rule (`Samples` + `CUSTOMER-PO` tabs) by default.
- Allows exact production control through include/exclude overrides and configurable PO pattern.
- Produces deterministic behavior across workbook changes.

## Operational Recommendations

- Keep `EXCEL_SHEET_EXCLUDE_REGEX=(summary|pivot|template|archive)` in production.
- Use `EXCEL_SHEET_INCLUDE_LIST` for known PO tabs when you want strict locking.
- Update `EXCEL_PO_SHEET_REGEX` when customers introduce a new PO tab naming pattern.
- Turn `EXCEL_ALLOW_LEGACY_PO_SHEETS=false` once migration to `CUSTOMER-PO` is complete.
- Review development logs after workbook structure changes; logs include included/skipped sheet reasons.
