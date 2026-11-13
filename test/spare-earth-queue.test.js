// node --test test/*.test.js
// The picker decides what posts and when, so it is tested on its own (pure, no
// network, no database).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL ??= "http://localhost";
process.env.SUPABASE_SECRET_KEY ??= "test";
const { pickDue } = await import("../modules/spare-earth-queue.js");

const row = (id, n, at, status = "queued") => ({ id, n, publish_at: at, status, attempts: 0 });
const rows = [
  row(1, "36", "2026-11-10T15:00:00Z"),
  row(2, "37", "2026-11-10T22:00:00Z"),
  row(3, "38", "2026-11-11T15:00:00Z"),
];

test("nothing posts before 10am", () => {
  assert.equal(pickDue(rows, null, new Date("2026-11-10T14:59:00Z")), null);
});

test("10am slot posts #36", () => {
  assert.equal(pickDue(rows, null, new Date("2026-11-10T15:00:00Z")).n, "36");
});

test("5pm slot posts #37 after #36 went out at 10am", () => {
  const live = rows.slice(1);
  assert.equal(pickDue(live, "2026-11-10T15:03:00Z", new Date("2026-11-10T22:00:00Z")).n, "37");
});

test("a backlog drains one at a time, never two within 4 hours", () => {
  // Down all day: #36 and #37 both due. Only the earliest goes now...
  const at = new Date("2026-11-10T23:00:00Z");
  assert.equal(pickDue(rows, null, at).n, "36");
  // ...and the next waits for the 4 hour gap.
  assert.equal(pickDue(rows.slice(1), "2026-11-10T23:00:00Z", new Date("2026-11-11T01:00:00Z")), null);
  assert.equal(pickDue(rows.slice(1), "2026-11-10T23:00:00Z", new Date("2026-11-11T03:00:00Z")).n, "37");
});

test("only queued rows are picked", () => {
  const mixed = [row(1, "36", "2026-11-10T15:00:00Z", "held"), row(2, "37", "2026-11-10T15:00:00Z", "failed")];
  assert.equal(pickDue(mixed, null, new Date("2026-11-11T00:00:00Z")), null);
});
