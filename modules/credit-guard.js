import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// ─── CREDIT FLOOR ────────────────────────────────────────────────────────────
// Dre, 2026-08-14: "make some batches but i want to save at least 1000 credits
// for myself."
//
// A reserve that depends on me doing arithmetic correctly is not a reserve. This
// reads the real balance from Higgsfield and refuses to start any post whose
// estimated cost would break the floor.
//
// FAILS CLOSED. If the balance cannot be read the answer is NO, not "probably
// fine". Higgsfield was unreachable at the moment this was written, and guessing
// there would risk the exact thing the floor exists to protect.

const FLOOR = parseInt(process.env.WICK_CREDIT_FLOOR ?? "1000", 10);

function resolveHfBin() {
  if (process.env.HF_BIN) return process.env.HF_BIN;
  const local = path.join(process.cwd(), "node_modules", ".bin", "higgsfield");
  return fs.existsSync(local) ? local : "higgsfield";
}

// Images per post, per format. gpt_image_2 costs 7 credits, and the cheaper
// nano_banana_pro fallback costs 2, so 7 is the honest worst case to budget at.
export const IMAGES_PER_POST = {
  ORDER: 5, PARABLE: 5, LESSON: 7, COSTUME: 7, VERSUS: 9,
};
const CREDITS_PER_IMAGE = parseInt(process.env.WICK_CREDITS_PER_IMAGE ?? "7", 10);

export const costOf = (format) => (IMAGES_PER_POST[format] ?? 7) * CREDITS_PER_IMAGE;

// Returns the live balance, or null when it cannot be read.
export function readBalance() {
  try {
    const out = execFileSync(resolveHfBin(), ["account", "status"], {
      timeout: 30_000, stdio: "pipe",
    }).toString();
    const m = out.match(/([\d,]+(?:\.\d+)?)\s*credits/i);
    return m ? parseFloat(m[1].replace(/,/g, "")) : null;
  } catch { return null; }
}

// What can actually be afforded above the floor, cheapest formats first so the
// spend buys the most posts rather than the fewest.
export function planWithinBudget(balance, wanted) {
  const spendable = Math.max(0, balance - FLOOR);
  const plan = [];
  let spent = 0;
  for (const f of wanted) {
    const c = costOf(f);
    if (spent + c > spendable) continue;
    plan.push(f);
    spent += c;
  }
  return { plan, spent, spendable, floor: FLOOR };
}

// Call BEFORE each post. Returns { ok } or { ok:false, reason }.
export function canAfford(format, { balance = null } = {}) {
  const b = balance ?? readBalance();
  if (b == null) {
    return { ok: false, reason: "balance unreadable — refusing to spend against an unverifiable floor" };
  }
  const c = costOf(format);
  if (b - c < FLOOR) {
    return { ok: false, reason: `${format} costs ~${c}, which would leave ${Math.round(b - c)} and break the ${FLOOR} floor`, balance: b };
  }
  return { ok: true, balance: b, cost: c };
}

if (process.argv[1] && import.meta.url === (await import("url")).pathToFileURL(process.argv[1]).href) {
  const b = readBalance();
  if (b == null) { console.log(`balance: UNREADABLE (floor ${FLOOR}) — nothing may be spent`); process.exit(2); }
  const { plan, spent, spendable } = planWithinBudget(b, ["ORDER", "PARABLE", "LESSON", "ORDER", "PARABLE", "LESSON", "COSTUME", "VERSUS"]);
  console.log(`balance ${b} | floor ${FLOOR} | spendable ${spendable}`);
  console.log(`affordable plan: ${plan.join(", ") || "(nothing)"}  = ~${spent} credits, leaving ~${Math.round(b - spent)}`);
  process.exit(0);
}
