import Anthropic from "@anthropic-ai/sdk";
import { renderBoardroom, renderVerticalBoardroom } from "../images/render-boardroom.js";
import { renderCheatsheet, renderVerticalCheatsheet } from "../images/render-cheatsheet.js";
import { renderNewsScreenshot } from "../images/render-news-screenshot.js";
import { fetchNewsUrl } from "./fetch-news-url.js";
import { generateGeminiImage } from "../images/gemini.js";

const client = new Anthropic();

// ─── MODE SELECTION ───────────────────────────────────────────────────────────
// Claude picks between BOARDROOM, NEWS, or CHEATSHEET only.
// Quote cards and Gemini visual images are permanently removed.

async function selectImageMode(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are an art director selecting the visual treatment for a LinkedIn post image.

POST:
"""
${postText}
"""

---

MODE SELECTION — pick exactly one of these three:

BOARDROOM — "The Boardroom" comic strip: Signal (hoodie, AI guy, always right) vs Noise (suit, manual guy, always wrong).
This is the DEFAULT. Use it for anything about business, AI, automation, hiring, productivity, companies, founders, or any contrast between old-school and modern approaches.
Return: {"mode":"boardroom"}

NEWS — Playwright screenshots a real news article related to the post.
Use ONLY when the post references a specific real company, product launch, or named announcement that would have a findable news article (e.g. "OpenAI just released...", "Google announced...", "New study from MIT shows...").
Return: {"mode":"news"}

CHEATSHEET — Structured educational card with labeled sections and bullet points.
Use ONLY for "X vs Y" comparisons, step-by-step frameworks, tool comparisons with clear categories, or educational breakdowns with 2–3 distinct labeled sections.
Return: {"mode":"cheatsheet"}

When in doubt: return boardroom.

Respond with valid JSON only. No explanation, no markdown fences.`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  // Brace-walker — immune to } inside strings or trailing prose
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc)         { esc = false; continue; }
    if (ch === "\\") { esc = true;  continue; }
    if (ch === '"')  { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return JSON.parse(raw.slice(start, i + 1)); }
  }
  throw new Error("No complete JSON object found in response");
}

// ─── BOARDROOM SCRIPT GENERATOR ──────────────────────────────────────────────

async function generateBoardroomScript(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 700,
    system: `You are the writer for "The Boardroom" — a recurring comic strip about two characters:
- SIGNAL: smart AI automation builder, wears a hoodie, calm and collected, always right, lowkey smug.
- NOISE: old-school business guy, wears a suit, loud, overconfident, does everything manually, always gets exposed.

Given a LinkedIn post about AI automation for business owners, write a 5-panel comic script dramatizing the post's core idea as a funny, relatable boardroom scene between Signal and Noise.

Rules:
- Panels 1–2 (top row): Setup — Noise confidently explains his manual process. Signal reacts.
- Panels 3–5 (bottom row): Conflict and punchline — Signal reveals automation, Noise gets exposed, final panel lands the punchline.
- Max 10 words per dialogue bubble. Tight. Punchy.
- Each panel has dialogue OR action — keep it to one.
- Episode title: 2–4 punchy words describing this specific strip.
- Make the business lesson land through the comedy.

Return only valid JSON. No explanation, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `LinkedIn post:\n\n${postText}\n\nReturn JSON:
{
  "title": "The Boardroom",
  "episode": "2–4 word episode title",
  "panels": [
    { "panel": 1, "character": "NOISE", "dialogue": "text or null", "action": "text or null" },
    { "panel": 2, "character": "SIGNAL", "dialogue": "text or null", "action": "text or null" },
    { "panel": 3, "character": "NOISE", "dialogue": "text or null", "action": "text or null" },
    { "panel": 4, "character": "SIGNAL", "dialogue": "text or null", "action": "text or null" },
    { "panel": 5, "character": "NOISE", "dialogue": "text or null", "action": "text or null" }
  ]
}`,
      },
    ],
  });

  const raw = message.content[0].text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(raw);
}

// ─── CHEATSHEET CONTENT GENERATOR ────────────────────────────────────────────

async function generateCheatsheetContent(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: `You are a content designer. Given a LinkedIn post about AI automation for business owners, extract the key educational content and structure it as a visual cheatsheet.

Keep it scannable — max 3 sections, max 4 bullet points each. Sections should each teach a distinct idea.
For section border colors, use only: #FF6B00 (orange), #00D2FF (cyan), or #22c55e (green).
Return only valid JSON. No explanation, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `LinkedIn post:\n\n${postText}\n\nReturn JSON:
{
  "title": "Short punchy title, max 6 words",
  "subtitle": "One-line description, max 8 words",
  "sections": [
    {
      "heading": "Section heading",
      "color": "#FF6B00",
      "points": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "footer": "@DrevonBullock • Bullock Consulting Group"
}`,
      },
    ],
  });

  const raw = message.content[0].text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(raw);
}

// ─── BOARDROOM FALLBACK ───────────────────────────────────────────────────────
// All mode failures fall back to boardroom. No quote cards. No Gemini images.

async function renderBoardroomFallback(postText, isVertical) {
  try {
    const script = await generateBoardroomScript(postText);
    return isVertical ? await renderVerticalBoardroom(script) : await renderBoardroom(script);
  } catch (err) {
    console.warn(`[Agent X] Boardroom fallback also failed: ${err.message}`);
    return null;
  }
}

// ─── SHARED MODE DISPATCHER ───────────────────────────────────────────────────
// Allowed modes: boardroom | news | cheatsheet
// Any unknown mode falls back to boardroom.

async function dispatchMode(decision, postText, { isVertical = false } = {}) {
  const mode = decision.mode;

  if (mode === "boardroom") {
    try {
      const script = await generateBoardroomScript(postText);
      console.log(`[Agent X] Boardroom episode: "${script.episode}"`);
      return isVertical ? await renderVerticalBoardroom(script) : await renderBoardroom(script);
    } catch (err) {
      console.warn(`[Agent X] Boardroom failed: ${err.message}`);
      return null;
    }
  }

  if (mode === "news") {
    try {
      const url = await fetchNewsUrl(postText);
      if (url) return await renderNewsScreenshot(url);
      console.warn("[Agent X] No news URL found — falling back to boardroom");
    } catch (err) {
      console.warn(`[Agent X] News screenshot failed — falling back to boardroom: ${err.message}`);
    }
    return renderBoardroomFallback(postText, isVertical);
  }

  if (mode === "cheatsheet") {
    try {
      const content = await generateCheatsheetContent(postText);

      // Generate Gemini (Nano Banana Pro) background art for the cheatsheet
      let bgBase64 = null;
      try {
        const bgPrompt = isVertical
          ? `Dark abstract digital art background for a business AI cheatsheet. Deep navy and black tones (#080E1C). Subtle glowing orange circuit-trace geometry, faint grid lines, soft light beams. No text, no characters, no faces. Premium editorial feel. Vertical portrait format.`
          : `Dark abstract tech background for a business AI infographic card. Deep navy-black (#080E1C). Faint glowing orange geometric patterns, subtle circuit lines, soft light rays. No text, no people. Clean premium look. Wide landscape format.`;
        const bgBuf = await generateGeminiImage(bgPrompt);
        bgBase64 = bgBuf.toString("base64");
        console.log(`[Agent X] Nano Banana background generated for cheatsheet`);
      } catch (bgErr) {
        console.warn(`[Agent X] Gemini bg failed — using solid bg: ${bgErr.message}`);
      }

      return isVertical
        ? await renderVerticalCheatsheet(content, bgBase64)
        : await renderCheatsheet(content, bgBase64);
    } catch (err) {
      console.warn(`[Agent X] Cheatsheet failed — falling back to boardroom: ${err.message}`);
      return renderBoardroomFallback(postText, isVertical);
    }
  }

  // Unknown mode — default to boardroom
  console.warn(`[Agent X] Unknown mode "${mode}" — defaulting to boardroom`);
  return renderBoardroomFallback(postText, isVertical);
}

// ─── INSTAGRAM — 1080x1920 vertical (9:16) ───────────────────────────────────

export async function generateImageForInstagram(postText) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Instagram] Mode selection failed, defaulting to boardroom: ${err.message}`);
    decision = { mode: "boardroom" };
  }

  console.log(`[Instagram] Image mode: ${decision.mode.toUpperCase()} (9:16 vertical)`);
  return dispatchMode(decision, postText, { isVertical: true });
}

// ─── LINKEDIN — 1200x675 landscape ───────────────────────────────────────────

export async function generateImage(postText) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Agent X] Mode selection failed, defaulting to boardroom: ${err.message}`);
    decision = { mode: "boardroom" };
  }

  console.log(`[Agent X] Image mode: ${decision.mode.toUpperCase()}`);
  return dispatchMode(decision, postText, { isVertical: false });
}
