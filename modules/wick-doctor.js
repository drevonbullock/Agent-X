import "dotenv/config";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import supabase from "../supabase/client.js";

// ─── WICK HEALTH CHECK ───────────────────────────────────────────────────────
// Dre, 2026-08-21: "if there was never an outage, make sure this never happens
// again, because I could have been creating content this entire time, and you
// told me there was an outage."
//
// He is right, and this file exists because of how I got it wrong.
//
// WHAT HAPPENED. The Higgsfield login expired 2026-08-14T21:19Z. Batches started
// failing with "Session expired". I probed https://api.higgsfield.ai/, got 521,
// and reported an outage. The CLI NEVER CONTACTS THAT HOST. Its real gateway is
// fnf-api-gw.higgsfield.ai and its auth is clerk.higgsfield.ai, both of which
// were up the entire week. A 30 second re-login would have fixed it on day one.
// Instead the queue drained to zero and stayed there for seven days.
//
// So this check exists to make that specific mistake impossible to repeat. Its
// rules, in order, are not negotiable:
//
//   1. AUTH IS CHECKED FIRST. Reachability is meaningless if the login is dead,
//      and a dead login is overwhelmingly the likelier cause.
//   2. NEVER report an outage unless auth PASSES and the real hosts are down.
//      "The CLI failed" is evidence about the credential, not the service.
//   3. api.higgsfield.ai IS NOT PROBED. It returns a permanent 521 and is not in
//      the CLI's path. Probing it manufactures false outages. That single wrong
//      hostname is the whole story of this incident.
//   4. EVERY FAILURE ALERTS, with the exact commands that fix it.
//
//   node modules/wick-doctor.js           check and alert if anything is wrong
//   node modules/wick-doctor.js --quiet   check, print, never alert

const CRED_FILE = path.join(os.homedir(), ".config", "higgsfield", "credentials.json");

// The hosts the CLI ACTUALLY uses, extracted from its vendored binary.
// fnf-api-gw returns 404 on "/" because "/" is not a route: 404 means UP.
const REAL_HOSTS = [
  { name: "api gateway", url: "https://fnf-api-gw.higgsfield.ai/" },
  { name: "auth",        url: "https://clerk.higgsfield.ai/" },
];

function resolveHfBin() {
  if (process.env.HF_BIN) return process.env.HF_BIN;
  const local = path.join(process.cwd(), "node_modules", ".bin", "higgsfield");
  return fs.existsSync(local) ? local : "higgsfield";
}

const readCreds = () => {
  try { return JSON.parse(fs.readFileSync(CRED_FILE, "utf8")); } catch { return null; }
};

function expiryMs(c) {
  const e = c?.expires_at;
  if (e == null) return 0;
  const n = typeof e === "number" ? e : Date.parse(e);
  if (!Number.isFinite(n)) return 0;
  return n > 1e12 ? n : n * 1000;
}

async function hostUp(url) {
  try {
    const ctl = AbortSignal.timeout(12_000);
    const r = await fetch(url, { signal: ctl });
    // Anything that answers at all means the origin is alive. Cloudflare's 52x
    // family is the only range that means "the origin refused or timed out".
    return { up: !(r.status >= 521 && r.status <= 524), code: r.status };
  } catch (err) {
    return { up: false, code: err.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

// CHECK 1 — the login. This is the one that mattered and was never checked.
function checkAuth() {
  const creds = readCreds();
  const hoursLeft = creds ? (expiryMs(creds) - Date.now()) / 3600000 : null;

  let live = false, detail = "";
  try {
    // account status is READ ONLY and requires a live session, so it tests
    // exactly the right thing. Never probe with `auth token`: that ROTATES the
    // token and would kill any batch running alongside this check.
    const out = execFileSync(resolveHfBin(), ["account", "status"], {
      timeout: 30_000, stdio: "pipe",
    }).toString();
    live = /credits/i.test(out);
    detail = out.trim().split("\n")[0] ?? "";
  } catch (err) {
    detail = String(err.stderr ?? err.message ?? "").trim().split("\n")[0].slice(0, 120);
  }

  return { live, hoursLeft, credentialsFileExists: !!creds, detail };
}

// CHECK 2 — the queue. qa_pending counts: it is built, paid for, and one QA pass
// away from publishable. Omitting it reports an empty queue that is not empty.
async function checkQueue() {
  const [posts, reels] = await Promise.all([
    supabase.from("wick_posts").select("status"),
    supabase.from("wick_reels").select("status"),
  ]);
  const live = (rows) => (rows ?? []).filter((r) =>
    ["approved", "pending", "qa_pending"].includes(r.status)).length;
  return {
    posts: live(posts.data),
    reels: live(reels.data),
    days: Math.floor(live(posts.data) / 2),     // 2 posts/day
  };
}

export async function diagnose() {
  const auth = checkAuth();
  const queue = await checkQueue();

  // Hosts are only probed when auth FAILS, because that is the only situation
  // where "is the service down" is even a live question. Checking them first is
  // how the false outage happened.
  let hosts = null;
  if (!auth.live) hosts = await Promise.all(
    REAL_HOSTS.map(async (h) => ({ ...h, ...(await hostUp(h.url)) }))
  );

  const problems = [];

  if (!auth.live) {
    const serviceDown = hosts.some((h) => !h.up);
    if (serviceDown) {
      problems.push({
        severity: "outage",
        // The ONLY path that may ever use the word outage, and only after auth
        // failed AND a host the CLI genuinely uses refused to answer.
        title: "Higgsfield really is down",
        detail: hosts.map((h) => `${h.name}: ${h.code}`).join(", "),
        fix: "Nothing on our side. The watcher rebuilds when it returns.",
      });
    } else {
      problems.push({
        severity: "critical",
        title: "Higgsfield login is dead",
        detail: `${auth.detail || "CLI cannot authenticate"}${auth.credentialsFileExists ? "" : " (credentials.json missing)"}. ` +
                `Their servers are UP (${hosts.map((h) => `${h.name} ${h.code}`).join(", ")}), so this is the login, not an outage.`,
        fix: "higgsfield auth login\nnode modules/higgsfield-auth.js --push",
      });
    }
  } else if (auth.hoursLeft != null && auth.hoursLeft < 6) {
    // Warn BEFORE it dies. The old code only ever noticed afterwards.
    problems.push({
      severity: "warning",
      title: `Higgsfield login expires in ${auth.hoursLeft.toFixed(1)}h`,
      detail: "The keepalive should renew it automatically. Flagging in case it cannot.",
      fix: "node modules/higgsfield-auth.js --keepalive",
    });
  }

  if (queue.posts === 0) {
    problems.push({
      severity: "critical",
      title: "Wick queue is empty",
      detail: "Nothing will publish. " + (auth.live
        ? "Higgsfield auth is fine, so a batch can be built right now."
        : "Fix the login above first — a batch cannot build art without it."),
      fix: 'node -e "import(\'./modules/wicks-wisdom.js\').then(m=>m.runWeeklyBatch())"',
    });
  } else if (queue.days <= 2) {
    problems.push({
      severity: "warning",
      title: `Wick queue low: ${queue.posts} post(s), ~${queue.days} day(s)`,
      detail: `${queue.reels} reel(s) queued.`,
      fix: "Build the next batch before it runs out.",
    });
  }

  return { auth, queue, hosts, problems, healthy: problems.length === 0 };
}

function render(r) {
  const lines = [];
  lines.push(r.healthy ? "✅ WICK SYSTEM HEALTHY" : "🩺 WICK HEALTH CHECK");
  lines.push("");
  lines.push(`Higgsfield login: ${r.auth.live ? "live" : "DEAD"}` +
    (r.auth.hoursLeft != null && r.auth.live ? ` (${r.auth.hoursLeft.toFixed(1)}h left)` : ""));
  lines.push(`Queue: ${r.queue.posts} post(s) ~${r.queue.days} day(s), ${r.queue.reels} reel(s)`);

  for (const p of r.problems) {
    const icon = p.severity === "warning" ? "⚠️" : p.severity === "outage" ? "🔴" : "🚨";
    lines.push("", `${icon} ${p.title}`, p.detail, "", p.fix);
  }
  return lines.join("\n");
}

export async function runDoctor({ quiet = false } = {}) {
  const r = await diagnose();
  const text = render(r);
  console.log(text);

  // Alert on anything wrong. Silence is what let a week pass.
  if (!quiet && r.problems.length) {
    try {
      const { alertWick } = await import("./wick-telegram.js");
      await alertWick(text);
    } catch (err) {
      console.warn(`[Doctor] alert failed: ${err.message}`);
    }
  }
  return r;
}

const entry = process.argv[1]
  ? (await import("url")).pathToFileURL(process.argv[1]).href
  : null;
if (entry && import.meta.url === entry) {
  const r = await runDoctor({ quiet: process.argv.includes("--quiet") });
  process.exit(r.healthy ? 0 : 1);
}
