import assert from "node:assert/strict";
import test from "node:test";
import {
  decideWorksheetByName,
  findHeaderRowIndex,
  getSheetHeaderSet,
  getWorksheetSelectionConfigFromEnv,
  hasRequiredSheetHeaders,
} from "../lib/worksheet-selection";

test("includes new customer-po sheet names", () => {
  const config = getWorksheetSelectionConfigFromEnv({});
  const result = decideWorksheetByName("C0640-40413", config);
  assert.equal(result.shouldProcess, true);
});

test("includes alpha-numeric PO part for future customers", () => {
  const config = getWorksheetSelectionConfigFromEnv({});
  const result = decideWorksheetByName("C0553F-VPO12", config);
  assert.equal(result.shouldProcess, true);
});

test("includes customer-only sheet names", () => {
  const config = getWorksheetSelectionConfigFromEnv({});
  const result = decideWorksheetByName("C0553F", config);
  assert.equal(result.shouldProcess, true);
});

test("includes customer-po tabs with legacy suffix markers", () => {
  const config = getWorksheetSelectionConfigFromEnv({});
  const result = decideWorksheetByName("C0640-40413 (P)", config);
  assert.equal(result.shouldProcess, true);
});

test("always includes Samples tab", () => {
  const config = getWorksheetSelectionConfigFromEnv({});
  const result = decideWorksheetByName("Samples", config);
  assert.equal(result.shouldProcess, true);
});

test("supports legacy PO tab names while migration mode is enabled", () => {
  const config = getWorksheetSelectionConfigFromEnv({
    EXCEL_ALLOW_LEGACY_PO_SHEETS: "true",
  });
  const result = decideWorksheetByName("40413 (P)", config);
  assert.equal(result.shouldProcess, true);
});

test("rejects legacy PO tab names when migration mode is disabled", () => {
  const config = getWorksheetSelectionConfigFromEnv({
    EXCEL_ALLOW_LEGACY_PO_SHEETS: "false",
  });
  const result = decideWorksheetByName("40413 (P)", config);
  assert.equal(result.shouldProcess, false);
});

test("rejects non-data tabs that do not match inclusion rules", () => {
  const config = getWorksheetSelectionConfigFromEnv({});
  const result = decideWorksheetByName("Dashboard", config);
  assert.equal(result.shouldProcess, false);
});

test("validates required worksheet headers", () => {
  const headerSet = getSheetHeaderSet([
    ["Job No", "PO No", "Location", "Batch Qty"],
  ]);
  assert.equal(hasRequiredSheetHeaders(headerSet), true);
});

test("rejects header sets missing quantity columns", () => {
  const headerSet = getSheetHeaderSet([
    ["Job No", "PO No", "Location"],
  ]);
  assert.equal(hasRequiredSheetHeaders(headerSet), false);
});

test("detects header row when headers are not in first row", () => {
  const values = [
    ["", "", ""],
    ["Report generated", "", ""],
    ["Job No", "Location", "Batch Qty"],
    ["SO46466-001-J1", "Wax", 100],
  ];
  assert.equal(findHeaderRowIndex(values), 2);
});
