import "dotenv/config";
import supabase from "../supabase/client.js";

// ─── META TOKEN MANAGER ───────────────────────────────────────────────────────
// Instagram + Threads long-lived tokens die every 60 days. Meta lets you
// refresh a still-valid token (>24h old) for a fresh 60-day window. This module:
//   1. initTokens()    — startup: load freshest token (Supabase vs env), validate
//                        against the live API, log status LOUDLY if dead.
//   2. refreshTokens() — cron (every 3 days): refresh both tokens, persist the
//                        new ones to Supabase so they survive deploys. Railway
//                        env vars become a bootstrap seed only.
// Distributors read process.env at call time, so this module keeps
// process.env.INSTAGRAM_ACCESS_TOKEN / THREADS_ACCESS_TOKEN up to date.

const PLATFORMS = {
  instagram: {
    envKey: "INSTAGRAM_ACCESS_TOKEN",
    validateUrl: (t) =>
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${encodeURIComponent(t)}`,
    refreshUrl: (t) =>
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t)}`,
  },
  threads: {
    envKey: "THREADS_ACCESS_TOKEN",
    validateUrl: (t) =>
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(t)}`,
    refreshUrl: (t) =>
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(t)}`,
  },
};

async function loadStoredToken(platform) {
  const { data, error } = await supabase
    .from("platform_tokens")
    .select("access_token, refreshed_at, expires_at")
    .eq("platform", platform)
    .maybeSingle();
  if (error) {
    console.warn(`[Tokens] ${platform}: DB read failed (${error.message})`);
    return null;
  }
  return data;
}

async function saveToken(platform, accessToken, expiresInSec) {
  const now = new Date();
  const expiresAt = expiresInSec
    ? new Date(now.getTime() + expiresInSec * 1000)
    : null;
  const { error } = await supabase.from("platform_tokens").upsert({
    platform,
    access_token: accessToken,
    refreshed_at: now.toISOString(),
    expires_at: expiresAt?.toISOString() ?? null,
  });
  if (error) console.warn(`[Tokens] ${platform}: DB save failed (${error.message})`);
}

async function validateToken(platform, token) {
  try {
    const res = await fetch(PLATFORMS[platform].validateUrl(token));
    const body = await res.json();
    if (body.error) return { valid: false, reason: body.error.message };
    return { valid: true, username: body.username };
  } catch (err) {
    // Network failure ≠ dead token — treat as unknown, don't overwrite anything
    return { valid: null, reason: err.message };
  }
}

// ─── STARTUP ─────────────────────────────────────────────────────────────────
// For each platform: prefer the Supabase-stored token (it survives refreshes),
// fall back to the env seed, validate whichever wins, and shout if it's dead.

export async function initTokens() {
  const active = (process.env.BRAND_PLATFORMS ?? "linkedin")
    .split(",")
    .map((p) => p.trim());

  for (const platform of Object.keys(PLATFORMS)) {
    if (!active.includes(platform)) continue;
    const { envKey } = PLATFORMS[platform];
    const envToken = process.env[envKey];
    const stored = await loadStoredToken(platform);

    // Stored token wins when it exists and is newer than a plain env seed.
    const candidates = [
      stored?.access_token && { source: "supabase", token: stored.access_token },
      envToken && { source: "env", token: envToken },
    ].filter(Boolean);

    if (!candidates.length) {
      console.error(`[Tokens] ❌ ${platform}: NO TOKEN anywhere (env ${envKey} empty, no DB row)`);
      continue;
    }

    let ok = false;
    for (const c of candidates) {
      const check = await validateToken(platform, c.token);
      if (check.valid) {
        process.env[envKey] = c.token;
        if (c.source === "env" && stored?.access_token !== c.token) {
          await saveToken(platform, c.token, 60 * 24 * 3600); // seed/overwrite DB, assume fresh 60d
        }
        console.log(`[Tokens] ✅ ${platform}: valid (${c.source}, @${check.username})`);
        ok = true;
        break;
      } else if (check.valid === false) {
        console.warn(`[Tokens] ${platform}: ${c.source} token dead — ${check.reason}`);
      } else {
        // network unknown — keep the candidate, don't block startup
        process.env[envKey] = c.token;
        console.warn(`[Tokens] ⚠️ ${platform}: could not validate (${check.reason}) — using ${c.source} token unverified`);
        ok = true;
        break;
      }
    }

    if (!ok) {
      console.error(
        `[Tokens] ❌❌ ${platform.toUpperCase()} TOKEN EXPIRED — posting is DOWN for this platform. ` +
        `Regenerate a long-lived token in the Meta developer dashboard and update Railway env var ${envKey}.`
      );
    }
  }
}

// ─── REFRESH LOOP ────────────────────────────────────────────────────────────
// Meta refresh rules: token must be valid and >24h old. Refreshing every
// 3 days keeps a 60-day token perpetually alive.

export async function refreshTokens() {
  const active = (process.env.BRAND_PLATFORMS ?? "linkedin")
    .split(",")
    .map((p) => p.trim());

  for (const platform of Object.keys(PLATFORMS)) {
    if (!active.includes(platform)) continue;
    const { envKey, refreshUrl } = PLATFORMS[platform];
    const token = process.env[envKey];
    if (!token) continue;

    try {
      const res = await fetch(refreshUrl(token));
      const body = await res.json();
      if (body.access_token) {
        process.env[envKey] = body.access_token;
        await saveToken(platform, body.access_token, body.expires_in);
        const days = Math.round((body.expires_in ?? 0) / 86400);
        console.log(`[Tokens] 🔄 ${platform}: refreshed, next expiry in ${days}d`);
      } else {
        console.error(
          `[Tokens] ❌ ${platform}: refresh REJECTED — ${body.error?.message ?? JSON.stringify(body)}. ` +
          `If expired, regenerate manually and update Railway ${envKey}.`
        );
      }
    } catch (err) {
      console.warn(`[Tokens] ${platform}: refresh network error (${err.message}) — will retry next cycle`);
    }
  }
}

// ─── ANTHROPIC KEY HEALTH ────────────────────────────────────────────────────
// Every post starts with a Claude call — if the key is dead or out of credits,
// the WHOLE system is down on every platform. Costs ~1 token per boot.

// ─── LINKEDIN TOKEN HEALTH ───────────────────────────────────────────────────
// LinkedIn tokens expire ~60 days and CANNOT be auto-refreshed (no refresh-token
// grant here). When dead, LinkedIn silently posts text-only. Shout at boot so
// Dre knows to re-run `node auth/linkedin-auth.js`.

export async function checkLinkedInToken() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) {
    console.error("[Tokens] ❌❌ LINKEDIN_ACCESS_TOKEN not set — LinkedIn images are DOWN.");
    return;
  }
  try {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      console.log("[Tokens] ✅ linkedin: valid");
    } else if (res.status === 401) {
      console.error(
        "[Tokens] ❌❌ LINKEDIN TOKEN EXPIRED — posts go out as TEXT-ONLY (no images/cheatsheets/news cards). " +
        "Re-run `node auth/linkedin-auth.js` and update Railway env var LINKEDIN_ACCESS_TOKEN."
      );
    } else {
      console.warn(`[Tokens] ⚠️ linkedin: unexpected status ${res.status}`);
    }
  } catch (err) {
    console.warn(`[Tokens] linkedin check network error (${err.message}) — not blocking startup`);
  }
}

export async function checkAnthropicCredit() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[Health] ❌❌ ANTHROPIC_API_KEY not set — ALL content generation is DOWN.");
    return;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    const body = await res.json();
    if (body.error) {
      console.error(
        `[Health] ❌❌ ANTHROPIC API REJECTED this key — ALL content generation is DOWN ` +
        `on every platform: ${body.error.message}`
      );
    } else {
      console.log("[Health] ✅ Anthropic API key OK");
    }
  } catch (err) {
    console.warn(`[Health] Anthropic check network error (${err.message}) — will not block startup`);
  }
}

// Telegram is how Dre finds out a Wick post published and how he pulls one he
// does not want. If it is misconfigured the posts still go out, so the failure
// is invisible: it looks like a quiet bot rather than a broken one. Check it at
// boot the same as every other credential.
export async function checkTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(
      `[Health] ⚠️ Telegram not configured (${!token ? "TELEGRAM_BOT_TOKEN" : "TELEGRAM_CHAT_ID"} missing) ` +
      `— Wick posts will still publish, but with no notification and no pull switch.`
    );
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const body = await res.json();
    if (!body.ok) {
      console.error(`[Health] ❌ Telegram bot token rejected: ${body.description} — no publish alerts, no pull switch.`);
      return false;
    }
    console.log(`[Health] ✅ Telegram OK (@${body.result.username} → chat ${chatId})`);
    return true;
  } catch (err) {
    console.warn(`[Health] Telegram check network error (${err.message}) — will not block startup`);
    return false;
  }
}

// CLI: node modules/token-manager.js [--refresh]
if (process.argv[1]?.endsWith("token-manager.js")) {
  const run = process.argv.includes("--refresh") ? refreshTokens : initTokens;
  run().then(() => process.exit(0));
}
