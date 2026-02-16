import assert from "node:assert/strict";
import test from "node:test";
import { derivePoFromSheetName, parseWorksheetData } from "../lib/graph";

test("extracts PO suffix from customer-po sheet name", () => {
  assert.equal(derivePoFromSheetName("C0640-40413"), "40413");
});

test("uses customer code for customer-only sheet fallback", () => {
  assert.equal(derivePoFromSheetName("C0553F"), "C0553F");
});

test("reads PO from External Document No header when PO No is absent", () => {
  const values = [
    ["Job No", "External Document No.", "Location", "Batch Qty", "Delivery Date"],
    ["SO99999-001-J1", "VPO9", "Packing", 24, "6/2/2026"],
  ];

  const jobs = parseWorksheetData(values, "C0553F", 0);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].poNo, "VPO9");
});

test("falls back to customer code when PO columns are missing", () => {
  const values = [
    ["Job No", "Location", "Batch Qty", "Delivery Date"],
    ["SO88888-001-J1", "Wax", 10, "6/2/2026"],
  ];

  const jobs = parseWorksheetData(values, "C0553F", 0);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].poNo, "C0553F");
});

test("uses Graph display text for delivery date when available", () => {
  const values = [
    ["Job No", "PO No", "Location", "Batch Qty", "Delivery Date"],
    ["SO77777-001-J1", "VPO8", "Wax", 10, 46000],
  ];
  const displayValues = [
    ["Job No", "PO No", "Location", "Batch Qty", "Delivery Date"],
    ["SO77777-001-J1", "VPO8", "Wax", "10", "12/3/2026"],
  ];

  const jobs = parseWorksheetData(values, "C0553F", 0, displayValues);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].deliveryDate, "12/3/2026");
});
