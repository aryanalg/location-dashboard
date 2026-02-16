import assert from "node:assert/strict";
import test from "node:test";
import { getDaysUntilDelivery } from "../lib/types";

function expectedDaysUntil(year: number, monthOneBased: number, day: number): number {
  const target = new Date(year, monthOneBased - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

test("parses DD/MM/YYYY delivery dates", () => {
  assert.equal(getDaysUntilDelivery("25/2/2026"), expectedDaysUntil(2026, 2, 25));
});

test("falls back to MM/DD/YYYY when DD/MM is invalid", () => {
  assert.equal(getDaysUntilDelivery("3/25/2026"), expectedDaysUntil(2026, 3, 25));
});

test("returns Infinity for invalid delivery date strings", () => {
  assert.equal(getDaysUntilDelivery("not-a-date"), Infinity);
});
