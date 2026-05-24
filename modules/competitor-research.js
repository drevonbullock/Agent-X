import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { setDynamicThemes } from "../analytics/design-variants.js";

// Mines niche competitors' top-performing Instagram graphics, reverse-engineers
// their design system with Claude vision, and synthesizes new themes into the
// optimizer's variant pool (design_themes table → setDynamicThemes at runtime).

const API_BASE = "https://graph.instagram.com/v22.0";
const client = new Anthropic();

const MAX_HANDLES = 6;        // competitors processed per run
const MAX_ACTIVE_THEMES = 4;  // dynamic themes kept live at once

// Only these fonts are allowed, so the synthesized fontLink is always a valid
// Google Fonts URL the renderer can load.
const FONT_LIBRARY = {
  "Space Grotesk": "Space+Grotesk:wght@400;500;600;700;800",
  "Sora": "Sora:wght@400;500;600;700;800",
  "Inter": "Inter:wght@400;500;600;700;800",
  "Manrope": "Manrope:wght@400;500;600;700;800",
  "Poppins": "Poppins:wght@400;500;600;700;800",
  "Montserrat": "Montserrat:wght@400;500;600;700;800",
  "Archivo": "Archivo:wght@400;500;600;700;800",
};
const FONT_NAMES = Object.keys(FONT_LIBRARY);
const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function fontLinkFor(heading) {
  const h = FONT_LIBRARY[heading] ? heading : "Space Grotesk";
  return `https://fonts.googleapis.com/css2?family=${FONT_LIBRARY[h]}&family=JetBrains+Mono:wght@500&display=swap`;
}

function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}

// Mix a color toward white for the lighter accent used in gradients.
function lighten(hex, amt = 0.38) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Cards are dark-background by design — force a dark bg if Claude returns a light one.
function ensureDarkBg(hex) {
  return HEX6.test(hex) && luminance(hex) < 0.4 ? hex : "#0a0f1a";
}

const engagement = (m) => (m.like_count ?? 0) + (m.comments_count ?? 0) * 3;

// ─── INSTAGRAM BUSINESS DISCOVERY ─────────────────────────────────────────────

async function fetchBusinessDiscovery(username) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!token || !igId) {
    console.warn("[Competitor] INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ID not set — skipping");
    return [];
  }
  const fields = `business_discovery.username(${username}){media.limit(25){id,caption,like_count,comments_count,media_type,media_url,permalink,timestamp}}`;
  try {
    const res = await fetch(`${API_BASE}/${igId}?fields=${encodeURIComponent(fields)}&access_token=${token}`);
    const j = await res.json();
    if (!res.ok) {
      console.warn(`[Competitor] @${username}: ${j?.error?.message ?? res.status}`);
      return [];
    }
    return j?.business_discovery?.media?.data ?? [];
  } catch (err) {
    console.warn(`[Competitor] @${username} fetch failed: ${err.message}`);
    return [];
  }
}

// ─── CLAUDE VISION ANALYSIS ───────────────────────────────────────────────────

async function analyzeImage(imageUrl, caption) {
  const prompt = `You are reverse-engineering a high-performing Instagram graphic in the AI-automation-for-business niche.
Analyze its visual design system and return STRICT JSON only (no prose, no code fences):
{
  "accent": "#RRGGBB (the dominant vivid accent color)",
  "background": "#RRGGBB (a DARK background color that suits this look)",
  "fontHeading": "one of: ${FONT_NAMES.join(", ")}",
  "layout": "short phrase, e.g. 'single bold headline' or '3-column grid'",
  "hookStyle": "short phrase describing the headline/hook pattern",
  "notes": "one sentence on what makes it effective"
}
Caption for context: ${(caption ?? "").slice(0, 300)}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "url", url: imageUrl } },
        { type: "text", text: prompt },
      ],
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(raw);
}

function synthesizeTheme(username, analysis) {
  const accent = HEX6.test(analysis.accent) ? analysis.accent : "#FF6B00";
  const theme = {
    id: `comp_${username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)}`,
    accent,
    accentLight: lighten(accent),
    bg: ensureDarkBg(analysis.background),
    fontHeading: FONT_LIBRARY[analysis.fontHeading] ? analysis.fontHeading : "Space Grotesk",
    fontMono: "JetBrains Mono",
    fontLink: fontLinkFor(analysis.fontHeading),
  };
  return theme;
}

// ─── ORCHESTRATION ────────────────────────────────────────────────────────────

export async function mineCompetitors() {
  const handles = (process.env.COMPETITOR_IG_HANDLES ?? "")
    .split(",").map((h) => h.trim().replace(/^@/, "")).filter(Boolean).slice(0, MAX_HANDLES);
  if (!handles.length) {
    console.log("[Competitor] COMPETITOR_IG_HANDLES not set — nothing to mine");
    return { analyzed: 0, themes: 0 };
  }

  console.log(`[Competitor] Mining ${handles.length} competitor(s): ${handles.join(", ")}`);
  let analyzed = 0, themes = 0;

  for (const username of handles) {
    const media = await fetchBusinessDiscovery(username);
    const top = media
      .filter((m) => m.media_type === "IMAGE" && m.media_url)
      .sort((a, b) => engagement(b) - engagement(a))[0];
    if (!top) { console.log(`[Competitor] @${username}: no usable image media`); continue; }

    // Dedup — skip posts we've already analyzed.
    const { data: seen } = await supabase
      .from("competitor_insights").select("id").eq("permalink", top.permalink).maybeSingle();
    if (seen) { console.log(`[Competitor] @${username}: top post already analyzed`); continue; }

    let analysis;
    try {
      analysis = await analyzeImage(top.media_url, top.caption);
    } catch (err) {
      console.warn(`[Competitor] @${username}: vision analysis failed: ${err.message}`);
      continue;
    }

    await supabase.from("competitor_insights").insert({
      username, permalink: top.permalink,
      likes: top.like_count ?? 0, comments: top.comments_count ?? 0, analysis,
    });
    analyzed++;

    const theme = synthesizeTheme(username, analysis);
    const { error } = await supabase.from("design_themes").upsert(
      { id: theme.id, theme, source: "competitor", active: true, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (!error) { themes++; console.log(`[Competitor] @${username}: synthesized theme ${theme.id} (accent ${theme.accent}, ${theme.fontHeading})`); }
  }

  await capActiveThemes();
  await loadDynamicThemes();
  console.log(`[Competitor] Done — ${analyzed} analyzed, ${themes} themes synthesized`);
  return { analyzed, themes };
}

// Keep only the most recently updated dynamic themes live, so the variant pool
// stays small enough for the optimizer to gather real signal per theme.
async function capActiveThemes() {
  const { data } = await supabase
    .from("design_themes").select("id").eq("source", "competitor")
    .order("updated_at", { ascending: false });
  const stale = (data ?? []).slice(MAX_ACTIVE_THEMES).map((r) => r.id);
  if (stale.length) await supabase.from("design_themes").update({ active: false }).in("id", stale);
}

// Load active dynamic themes into the in-process variant pool. Called at startup
// and after each mining run.
export async function loadDynamicThemes() {
  const { data, error } = await supabase
    .from("design_themes").select("theme").eq("active", true);
  if (error) { console.warn(`[Competitor] loadDynamicThemes failed: ${error.message}`); return; }
  const themes = (data ?? []).map((r) => r.theme);
  setDynamicThemes(themes);
  if (themes.length) console.log(`[Competitor] Loaded ${themes.length} dynamic theme(s) into variant pool`);
}

// CLI: node modules/competitor-research.js
const isMain = process.argv[1]?.endsWith("competitor-research.js");
if (isMain) {
  mineCompetitors().then(() => process.exit(0)).catch((err) => {
    console.error(`[Competitor] Fatal: ${err.message}`);
    process.exit(1);
  });
}
