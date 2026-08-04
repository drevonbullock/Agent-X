import "dotenv/config";
import { pathToFileURL } from "url";
import supabase from "../supabase/client.js";
import { notifyOps } from "./notify.js";

// ─── RLS GUARD ───────────────────────────────────────────────────────────────
// On 2026-08-03 Supabase flagged wick_reels and wick_generated_topics as
// publicly readable AND writable. Both had been created ad-hoc by migration;
// Postgres does not enable RLS on CREATE TABLE, and nothing in this codebase
// ever checked. The hole was open from the day those tables were created until
// an email happened to catch it.
//
// This module exists so the next one is caught in seconds, not weeks. It runs
// at boot and daily, and it does NOT depend on anyone remembering a rule.
//
// WHY ZERO POLICIES IS CORRECT HERE: Agent X connects with the service role,
// which bypasses RLS entirely. RLS-enabled with no policies means the app keeps
// full access and anon gets nothing. Adding a policy would GRANT access. So the
// only thing worth checking is "is RLS on", never "does a policy exist".

// Authoritative check via the rls_audit() function (service role only).
export async function findUnprotectedTables() {
  const { data, error } = await supabase.rpc("rls_audit");
  if (error) throw new Error(`rls_audit failed: ${error.message}`);
  return (data ?? []).map((r) => r.unprotected_table ?? r);
}

// Close the hole. Safe by construction: enabling RLS with no policy can only
// REMOVE anon access, and the service role the app uses is unaffected.
export async function protectTables(tables) {
  const fixed = [];
  for (const t of tables) {
    // Identifier is quoted via format(%I) inside the function, and the name
    // comes from pg_class rather than user input, so this cannot be injected.
    const { error } = await supabase.rpc("rls_protect", { target: t });
    if (error) console.error(`[RLS] could not protect ${t}: ${error.message}`);
    else { fixed.push(t); console.log(`[RLS] enabled row level security on ${t}`); }
  }
  return fixed;
}

// Boot check. Never throws: a failed audit must not stop the agent posting, but
// it must be impossible to miss in the logs, and it pings the OPS channel (not
// the Wick content channel) so it reaches a phone.
export async function checkRls({ autoFix = process.env.RLS_AUTOFIX !== "false" } = {}) {
  let unprotected;
  try {
    unprotected = await findUnprotectedTables();
  } catch (err) {
    console.warn(`[RLS] ⚠️ audit could not run (${err.message}). If this persists the guard is blind.`);
    return { ok: false, unprotected: [], checked: false };
  }

  if (!unprotected.length) {
    console.log("[RLS] ✅ every public table has row level security enabled");
    return { ok: true, unprotected: [], checked: true };
  }

  const list = unprotected.join(", ");
  console.error(`[RLS] ❌ PUBLICLY EXPOSED TABLE${unprotected.length > 1 ? "S" : ""}: ${list}`);
  console.error("[RLS]    Anyone with the project URL and the anon key can read, edit and delete these rows.");

  let fixed = [];
  if (autoFix) {
    fixed = await protectTables(unprotected);
  } else {
    console.error("[RLS]    RLS_AUTOFIX=false — not fixing. Run: node modules/rls-guard.js --fix");
  }

  const still = unprotected.filter((t) => !fixed.includes(t));
  await notifyOps(
    `🔒 RLS ALERT\n\nExposed table${unprotected.length > 1 ? "s" : ""}: ${list}\n` +
    (fixed.length ? `Auto-protected: ${fixed.join(", ")}\n` : "") +
    (still.length ? `STILL EXPOSED: ${still.join(", ")}\nFix now: node modules/rls-guard.js --fix` : "All closed."),
  );

  return { ok: still.length === 0, unprotected, fixed, checked: true };
}

// CLI: node modules/rls-guard.js          audit only
//      node modules/rls-guard.js --fix    audit and protect
//
// pathToFileURL, not `file://${argv[1]}` — this repo lives under "C.C. Agent X"
// and the space percent-encodes in import.meta.url but not in argv, so the
// naive comparison silently never matches and the CLI does nothing.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fix = process.argv.includes("--fix");
  checkRls({ autoFix: fix }).then((r) => {
    if (!r.checked) process.exit(2);
    process.exit(r.ok ? 0 : 1);   // non-zero so CI or a pre-deploy hook can fail
  });
}
