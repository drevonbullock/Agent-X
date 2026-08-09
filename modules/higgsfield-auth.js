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
export async function ensureHiggsfieldAuth() {
  const ok = await hydrate();
  if (!ok) return false;

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

// ─── CLI ─────────────────────────────────────────────────────────────────────
// On the Mac, after `higgsfield auth login`:
//   node modules/higgsfield-auth.js --push     upload local credentials to Supabase
//   node modules/higgsfield-auth.js            hydrate + verify (what Railway does)
if (import.meta.url === (await import("url")).pathToFileURL(process.argv[1]).href) {
  const run = async () => {
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
