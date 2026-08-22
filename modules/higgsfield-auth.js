import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import supabase from "../supabase/client.js";

// ─── HIGGSFIELD CREDENTIALS ON RAILWAY ───────────────────────────────────────
// Wick content could never be built unattended: the Higgsfield CLI is
// authenticated only on Dre's Mac, so on Railway every weekly batch hit
// `if (!hfAvailable())` and no-opped. This module makes Railway able to build.
//
// THE PROBLEM THIS SOLVES, AND WHY IT IS NOT JUST "PASTE THE TOKEN":
// `higgsfield auth login` is OAuth PKCE and drops a credentials file at
// ~/.config/higgsfield/credentials.json holding an access_token that expires in
// ~24 HOURS, plus a refresh_token (scope includes offline_access).
//
//   - Pasting today's file into a Railway env var works for one day, then dies.
//   - The CLI refreshes and writes the new token back to that FILE. Railway's
//     filesystem is ephemeral, so every redeploy or restart throws the refreshed
//     token away and falls back to the env var, which by then is stale. If the
//     refresh_token also rotates on use, the env var is permanently dead and
//     batches silently stop again.
//
// So credentials live in Supabase `platform_tokens` (the same table and pattern
// token-manager.js already uses for Meta), not in an env var. The env var is
// only a BOOTSTRAP: used once when the DB row is empty, then superseded.
//
// Flow every boot and before every batch:
//   1. hydrate()  DB row (or env bootstrap) -> write the credentials file
//   2. CLI runs, refreshing the file in place as needed
//   3. persist()  file changed? -> write it back to the DB
//
// SECRETS: token values are never logged. Only expiry and lengths.

const PLATFORM = "higgsfield";
const CRED_DIR = path.join(os.homedir(), ".config", "higgsfield");
const CRED_FILE = path.join(CRED_DIR, "credentials.json");
// Same resolution as wick-render: PATH is not reliable on Railway.
function resolveHfBin() {
  if (process.env.HF_BIN) return process.env.HF_BIN;
  const local = path.join(process.cwd(), "node_modules", ".bin", "higgsfield");
  if (fs.existsSync(local)) return local;
  return "higgsfield";
}
const HF_BIN = resolveHfBin();

const readFileCreds = () => {
  try { return JSON.parse(fs.readFileSync(CRED_FILE, "utf8")); } catch { return null; }
};

// expires_at has appeared as both seconds and milliseconds; normalise.
function expiryMs(creds) {
  const e = creds?.expires_at;
  if (e == null) return 0;
  const n = typeof e === "number" ? e : Date.parse(e);
  if (!Number.isFinite(n)) return 0;
  return n > 1e12 ? n : n * 1000;
}

const describe = (creds) => {
  if (!creds) return "none";
  const ms = expiryMs(creds);
  const hrs = ms ? ((ms - Date.now()) / 3600000).toFixed(1) : "?";
  return `expires in ${hrs}h, refresh_token ${creds.refresh_token ? "present" : "MISSING"}`;
};

// ─── STORE ───────────────────────────────────────────────────────────────────

export async function loadStoredCreds() {
  const { data, error } = await supabase.from("platform_tokens")
    .select("access_token").eq("platform", PLATFORM).maybeSingle();
  if (error || !data?.access_token) return null;
  // The whole credentials JSON is stored in the access_token column so the
  // refresh_token travels with it. platform_tokens is service-key only.
  try { return JSON.parse(data.access_token); } catch { return null; }
}

export async function persistCreds(creds) {
  if (!creds?.access_token) return false;
  const { error } = await supabase.from("platform_tokens").upsert({
    platform: PLATFORM,
    access_token: JSON.stringify(creds),
    refreshed_at: new Date().toISOString(),
    expires_at: expiryMs(creds) ? new Date(expiryMs(creds)).toISOString() : null,
  }, { onConflict: "platform" });
  if (error) { console.warn(`[HF] persist failed: ${error.message}`); return false; }
  return true;
}

// ─── HYDRATE ─────────────────────────────────────────────────────────────────
// Pick the freshest credentials available and write them to disk for the CLI.
export async function hydrate() {
  const onDisk = readFileCreds();
  const stored = await loadStoredCreds();

  let bootstrap = null;
  if (process.env.HIGGSFIELD_CREDENTIALS) {
    try { bootstrap = JSON.parse(process.env.HIGGSFIELD_CREDENTIALS); }
    catch { console.warn("[HF] HIGGSFIELD_CREDENTIALS is not valid JSON — ignoring."); }
  }

  // Freshest wins. On Railway `onDisk` is usually null (fresh container) and
  // `stored` carries the last refresh, which is exactly the point.
  const best = [onDisk, stored, bootstrap]
    .filter((c) => c?.access_token)
    .sort((a, b) => expiryMs(b) - expiryMs(a))[0];

  if (!best) {
    console.error("[HF] No credentials anywhere (disk, Supabase, or HIGGSFIELD_CREDENTIALS). Batches cannot build art.");
    return false;
  }

  fs.mkdirSync(CRED_DIR, { recursive: true });
  fs.writeFileSync(CRED_FILE, JSON.stringify(best), { mode: 0o600 });
  console.log(`[HF] credentials hydrated (${describe(best)})`);

  // Seed the DB on first run so the env bootstrap is never needed again.
  if (!stored || expiryMs(best) > expiryMs(stored)) await persistCreds(best);
  return true;
}

// ─── VERIFY + REFRESH ────────────────────────────────────────────────────────
// `auth token` makes the CLI refresh if the access token is stale. Whatever it
// writes back gets persisted, so a rotating refresh_token cannot strand us.
// REFRESH ROTATES THE TOKEN. Learned the hard way on 2026-08-09: running
// `higgsfield auth token` while a batch was generating invalidated the token
// the batch was using, and 13 generations failed with "Not authenticated" while
// the CLI reported healthy auth from a separate shell.
//
// In production the same collision is real: the reel batch runs 5am and the
// carousel batch 6am, so an overrunning reel batch would be rotated out from
// under itself by the carousel batch's auth call.
//
// So NEVER refresh a token that is still comfortably valid. Hydrating from the
// DB is always safe (it only writes a file); it is the `auth token` call that
// rotates, and it is now skipped unless the token is genuinely close to death.
const REFRESH_WHEN_UNDER_MS = 2 * 60 * 60 * 1000;   // 2 hours

export async function ensureHiggsfieldAuth({ force = false } = {}) {
  const ok = await hydrate();
  if (!ok) return false;

  const creds = readFileCreds();
  const msLeft = expiryMs(creds) - Date.now();
  if (!force && msLeft > REFRESH_WHEN_UNDER_MS) {
    console.log(`[HF] token valid for ${(msLeft / 3600000).toFixed(1)}h — not refreshing (refresh rotates and would break an in-flight batch)`);
    return true;
  }

  try {
    execFileSync(HF_BIN, ["auth", "token"], { timeout: 30_000, stdio: "pipe" });
  } catch (err) {
    console.error(`[HF] CLI rejected the stored credentials: ${String(err.message).slice(0, 140)}`);
    console.error("[HF] Re-run `higgsfield auth login` on the Mac, then `node modules/higgsfield-auth.js --push`.");
    try {
      const { alertWick } = await import("./wick-telegram.js");
      await alertWick("🔑 HIGGSFIELD LOGIN EXPIRED\n\nRailway cannot generate art until it is refreshed.\n\nOn your Mac run:\n  higgsfield auth login\n  node modules/higgsfield-auth.js --push");
    } catch { /* alerting must never mask the failure */ }
    return false;
  }

  // The CLI may have refreshed the file in place; capture it.
  const after = readFileCreds();
  const stored = await loadStoredCreds();
  if (after && expiryMs(after) > expiryMs(stored)) {
    await persistCreds(after);
    console.log(`[HF] refreshed credentials persisted (${describe(after)})`);
  }
  return true;
}

// ─── KEEPALIVE ───────────────────────────────────────────────────────────────
// THE BUG THAT COST A WEEK (2026-08-14 → 08-21).
//
// ensureHiggsfieldAuth() was called in exactly one place: scheduler boot. The
// access token lives ~24 HOURS. So if Railway did not restart for a day, nothing
// refreshed it and it died. Nothing refreshed it the day after either, and once
// the refresh_token lapsed too the credential was permanently dead. Batches then
// failed with "Session expired", which I misread as a Higgsfield outage.
//
// A token with a 24h life needs a refresh on a schedule, not on a boot that may
// never come. This is that schedule. It is deliberately separate from
// ensureHiggsfieldAuth (which is a pre-flight and refuses to rotate a healthy
// token, because rotating mid-batch kills the batch):
//
//   ensureHiggsfieldAuth  "am I usable RIGHT NOW" — refuses to rotate above 2h
//   keepAlive             "will I still be usable TOMORROW" — rotates below 12h
//
// Run it only at hours no batch runs. Rotation invalidates the token any
// in-flight generation is holding.
const KEEPALIVE_WHEN_UNDER_MS = 12 * 60 * 60 * 1000;

export async function keepAlive() {
  const hydrated = await hydrate();
  if (!hydrated) {
    await warnLoginDead("no credentials on disk, in Supabase, or in the environment");
    return { ok: false, reason: "no credentials" };
  }

  const creds = readFileCreds();
  const msLeft = expiryMs(creds) - Date.now();
  const hLeft = msLeft / 3600000;

  if (msLeft > KEEPALIVE_WHEN_UNDER_MS) {
    console.log(`[HF] keepalive: ${hLeft.toFixed(1)}h left — no refresh needed`);
    return { ok: true, hoursLeft: hLeft, refreshed: false };
  }

  console.log(`[HF] keepalive: ${hLeft.toFixed(1)}h left — refreshing now`);
  try {
    execFileSync(HF_BIN, ["auth", "token"], { timeout: 30_000, stdio: "pipe" });
  } catch (err) {
    // ONLY cry "login expired" when the CLI actually says the session is dead.
    // On Railway the CLI binary cannot run at all, and this path was alerting
    // "🔑 HIGGSFIELD LOGIN EXPIRED" twice a day (the 2am/8pm keepalive) for a
    // login that was perfectly healthy on the Mac. A host that cannot run the
    // CLI cannot refresh, and that is a fact to log, not an emergency to page.
    const detail = String(err.stderr ?? err.message ?? "");
    if (/session expired|not authenticated|unauthorized/i.test(detail)) {
      await warnLoginDead(detail.trim().split("\n")[0].slice(0, 140));
      return { ok: false, reason: "refresh rejected", hoursLeft: hLeft };
    }
    console.warn(`[HF] keepalive: CLI cannot refresh on this host (${detail.trim().split("\n")[0].slice(0, 100)}) — skipping, the Mac owns refresh`);
    return { ok: false, reason: "cli unavailable on this host", hoursLeft: hLeft };
  }

  const after = readFileCreds();
  const stored = await loadStoredCreds();
  if (after && expiryMs(after) > expiryMs(stored)) {
    await persistCreds(after);
    console.log(`[HF] keepalive refreshed + persisted (${describe(after)})`);
  }
  return { ok: true, hoursLeft: (expiryMs(after) - Date.now()) / 3600000, refreshed: true };
}

// One alert, one wording, everywhere. Never call this an outage: the CLI failing
// while higgsfield.ai and the MCP connector both work means the LOGIN is dead,
// not the service.
async function warnLoginDead(detail) {
  console.error(`[HF] LOGIN IS DEAD (${detail})`);
  try {
    const { alertWick } = await import("./wick-telegram.js");
    await alertWick(
      "🔑 HIGGSFIELD LOGIN EXPIRED\n\n" +
      "This is NOT an outage. Higgsfield is fine, the saved login died.\n" +
      "No art can be generated until you re-auth.\n\n" +
      "On your Mac:\n" +
      "  higgsfield auth login\n" +
      "  node modules/higgsfield-auth.js --push\n\n" +
      "The queue keeps draining until then."
    );
  } catch { /* alerting must never mask the failure */ }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
// On the Mac, after `higgsfield auth login`:
//   node modules/higgsfield-auth.js --push     upload local credentials to Supabase
//   node modules/higgsfield-auth.js            hydrate + verify (what Railway does)
// process.argv[1] is UNDEFINED when node runs an inline script (`node -e ...`),
// and pathToFileURL(undefined) throws, which made merely IMPORTING this module
// blow up in that context. The batch caught it and warned, so credentials were
// silently never hydrated by the pre-batch refresh. Guard the argv first.
const entry = process.argv[1]
  ? (await import("url")).pathToFileURL(process.argv[1]).href
  : null;
if (entry && import.meta.url === entry) {
  const run = async () => {
    if (process.argv.includes("--keepalive")) {
      const r = await keepAlive();
      console.log("[HF] keepalive ->", JSON.stringify(r));
      process.exit(r.ok ? 0 : 1);
    }
    if (process.argv.includes("--push")) {
      const local = readFileCreds();
      if (!local?.access_token) {
        console.error(`[HF] No local credentials at ${CRED_FILE}. Run: higgsfield auth login`);
        process.exit(1);
      }
      const ok = await persistCreds(local);
      console.log(ok ? `[HF] pushed to Supabase (${describe(local)})` : "[HF] push FAILED");
      process.exit(ok ? 0 : 1);
    }
    const ok = await ensureHiggsfieldAuth();
    process.exit(ok ? 0 : 1);
  };
  run();
}
