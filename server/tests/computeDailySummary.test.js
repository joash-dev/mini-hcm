import test from "node:test";
import assert from "node:assert/strict";
import { computeDailySummary } from "../src/logic/computeDailySummary.js";

// Helper to construct exact Dates in UTC or local timezone consistently
function makeDate(year, month, day, hour, minute) {
  // Use month - 1 because JS Date months are 0-indexed
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

test("computeDailySummary - Scenario 1: Exact on-time day", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 0),
    punchOut: makeDate(2026, 7, 3, 18, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 9.00,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 2: Late arrival", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 23),
    punchOut: makeDate(2026, 7, 3, 18, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  // worked 8h 37m = 8.61666... hours -> 8.62
  assert.deepEqual(result, {
    regularHrs: 8.62,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 23,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 3: Early departure (undertime)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 0),
    punchOut: makeDate(2026, 7, 3, 17, 15),
    schedule: { start: "09:00", end: "18:00" }
  });

  // worked 8.25 hours, undertime is 45 minutes
  assert.deepEqual(result, {
    regularHrs: 8.25,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 0,
    undertimeMinutes: 45,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 4: Overtime", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 0),
    punchOut: makeDate(2026, 7, 3, 20, 30),
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 9.00,
    ot: 2.50,
    nd: 0.00,
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 5: Late + undertime combined", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 30),
    punchOut: makeDate(2026, 7, 3, 17, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  // worked 7.5 hours
  assert.deepEqual(result, {
    regularHrs: 7.50,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 30,
    undertimeMinutes: 60,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 6: Late + OT combined (offset)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 10, 0),
    punchOut: makeDate(2026, 7, 3, 19, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 8.00,
    ot: 1.00,
    nd: 0.00,
    lateMinutes: 60,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 7: ND overlap (evening OT)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 0),
    punchOut: makeDate(2026, 7, 3, 23, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 9.00,
    ot: 5.00,
    nd: 1.00, // 22:00 to 23:00
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 8: Overnight shift (normal)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 22, 0),
    punchOut: makeDate(2026, 7, 4, 6, 0),
    schedule: { start: "22:00", end: "06:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 8.00,
    ot: 0.00,
    nd: 8.00, // 22:00 to 06:00
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 9: Overnight shift — late arrival", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 22, 45),
    punchOut: makeDate(2026, 7, 4, 6, 0),
    schedule: { start: "22:00", end: "06:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 7.25,
    ot: 0.00,
    nd: 7.25, // 22:45 to 06:00
    lateMinutes: 45,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 10: Overnight shift — overtime", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 22, 0),
    punchOut: makeDate(2026, 7, 4, 8, 0),
    schedule: { start: "22:00", end: "06:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 8.00,
    ot: 2.00,
    nd: 8.00, // only 22:00 to 06:00 is ND
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 11: Missing punch-out (late)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 15),
    punchOut: null,
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 0.00,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 15,
    undertimeMinutes: 0,
    incomplete: true
  });
});

test("computeDailySummary - Scenario 12: Early arrival (before sched)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 8, 30),
    punchOut: makeDate(2026, 7, 3, 18, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 9.00,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 13: OT past midnight (Jul 3 to Jul 4)", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 0),
    punchOut: makeDate(2026, 7, 4, 1, 0),
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 9.00,
    ot: 7.00,
    nd: 3.00, // 22:00 to 01:00 next day
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: false
  });
});

test("computeDailySummary - Scenario 14: Defensive case — punchOut before punchIn", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 9, 0),
    punchOut: makeDate(2026, 7, 3, 8, 0), // invalid
    schedule: { start: "09:00", end: "18:00" }
  });

  assert.deepEqual(result, {
    regularHrs: 0.00,
    ot: 0.00,
    nd: 0.00,
    lateMinutes: 0,
    undertimeMinutes: 0,
    incomplete: true
  });
});

test("computeDailySummary - Scenario 15: Extremely late arrival, punch-in after schedule end", () => {
  const result = computeDailySummary({
    punchIn: makeDate(2026, 7, 3, 19, 35),
    punchOut: makeDate(2026, 7, 3, 19, 40),
    schedule: { start: "09:00", end: "18:00" }
  });

  // late = 10h 35m = 635 minutes
  // worked = 5m = 0.0833... -> 0.08 hours
  assert.deepEqual(result, {
    regularHrs: 0.00,
    ot: 0.08,
    nd: 0.00,
    lateMinutes: 635,
    undertimeMinutes: 0,
    incomplete: false
  });
});
