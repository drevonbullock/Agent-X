// node --test test/*.test.js
// The slot picker decides WHEN an approved reel posts, and the callback parser
// decides WHICH reel a tap acts on, so both are tested on their own (pure, no
// network, no database).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL ??= "http://localhost";
process.env.SUPABASE_SECRET_KEY ??= "test";
const { slotToUtc, nextOpenSlot, enabledPlatforms, parseCallback, reviewText, fmtEt } =
  await import("../modules/spare-earth-review.js");

const iso = (d) => d.toISOString();

test("10am ET is 15:00 UTC in winter and 14:00 UTC in summer", () => {
  assert.equal(iso(slotToUtc(2026, 11, 18, 10)), "2026-11-18T15:00:00.000Z");
  assert.equal(iso(slotToUtc(2026, 11, 18, 17)), "2026-11-18T22:00:00.000Z");
  assert.equal(iso(slotToUtc(2026, 7, 1, 10)), "2026-07-01T14:00:00.000Z");
  assert.equal(iso(slotToUtc(2026, 7, 1, 17)), "2026-07-01T21:00:00.000Z");
});

test("slots are right on the days the clocks change", () => {
  assert.equal(iso(slotToUtc(2026, 3, 8, 10)), "2026-03-08T14:00:00.000Z");    // spring forward
  assert.equal(iso(slotToUtc(2026, 11, 1, 10)), "2026-11-01T15:00:00.000Z");   // fall back
});

test("approved at 3pm ET takes today's 5pm slot", () => {
  const now = new Date("2026-11-18T20:00:00Z");
  assert.equal(iso(nextOpenSlot([], now)), "2026-11-18T22:00:00.000Z");
});

test("a taken slot is skipped", () => {
  const now = new Date("2026-11-18T20:00:00Z");
  assert.equal(iso(nextOpenSlot(["2026-11-18T22:00:00+00:00"], now)), "2026-11-19T15:00:00.000Z");
  assert.equal(
    iso(nextOpenSlot(["2026-11-18T22:00:00Z", "2026-11-19T15:00:00Z", "2026-11-19T22:00:00Z"], now)),
    "2026-11-20T15:00:00.000Z",
  );
});

test("a slot less than 30 minutes away is skipped", () => {
  assert.equal(iso(nextOpenSlot([], new Date("2026-11-18T21:45:00Z"))), "2026-11-19T15:00:00.000Z");
  assert.equal(iso(nextOpenSlot([], new Date("2026-11-18T21:30:00Z"))), "2026-11-18T22:00:00.000Z");
});

test("late at night in New York still means tomorrow morning there, not the UTC date", () => {
  // 10pm ET on Nov 18 is already Nov 19 in UTC.
  assert.equal(iso(nextOpenSlot([], new Date("2026-11-19T03:00:00Z"))), "2026-11-19T15:00:00.000Z");
});

test("four approvals in a row fill four different slots", () => {
  const now = new Date("2026-11-18T20:00:00Z");
  const taken = [];
  for (let i = 0; i < 4; i++) taken.push(iso(nextOpenSlot(taken, now)));
  assert.deepEqual(taken, [
    "2026-11-18T22:00:00.000Z", "2026-11-19T15:00:00.000Z",
    "2026-11-19T22:00:00.000Z", "2026-11-20T15:00:00.000Z",
  ]);
});

test("Instagram is always on; YouTube and TikTok only when switched on", () => {
  assert.deepEqual(enabledPlatforms(undefined), ["instagram"]);
  assert.deepEqual(enabledPlatforms(""), ["instagram"]);
  assert.deepEqual(enabledPlatforms("youtube"), ["instagram", "youtube"]);
  assert.deepEqual(enabledPlatforms(" TikTok , youtube ,instagram"), ["instagram", "youtube", "tiktok"]);
  assert.deepEqual(enabledPlatforms("threads,x"), ["instagram"]);
});

test("only real approve / reject taps are acted on", () => {
  assert.deepEqual(parseCallback("se:approve:12"), { action: "approve", id: 12 });
  assert.deepEqual(parseCallback("se:reject:7"), { action: "reject", id: 7 });
  assert.equal(parseCallback("se:done:0"), null);
  assert.equal(parseCallback("wick:approve:12"), null);
  assert.equal(parseCallback("se:approve:12; drop table"), null);
  assert.equal(parseCallback(undefined), null);
});

test("review text carries the number, title and caption, and fits one Telegram message", () => {
  const text = reviewText({ n: "44", title: "What if you fell into a volcano?", caption: "x".repeat(6000) });
  assert.ok(text.startsWith("FINAL CUT · #44\nWhat if you fell into a volcano?"));
  assert.ok(text.length <= 4000);
});

test("times are shown to Dre in New York time", () => {
  assert.equal(fmtEt(new Date("2026-11-18T22:00:00Z")), "Wed, Nov 18, 5:00 PM ET");
});
