import Anthropic from "@anthropic-ai/sdk";
import { renderQuoteCard, renderVerticalCard } from "../images/render-quote-card.js";
import { generateGeminiImage } from "../images/gemini.js";
import { renderBoardroom, renderVerticalBoardroom } from "../images/render-boardroom.js";
import { renderCheatsheet, renderVerticalCheatsheet } from "../images/render-cheatsheet.js";
import { renderNewsScreenshot } from "../images/render-news-screenshot.js";
import { fetchNewsUrl } from "./fetch-news-url.js";

const client = new Anthropic();

// ─── MODE SELECTION ───────────────────────────────────────────────────────────
// Claude picks the best visual treatment. Returns { mode, imagePrompt? }.
// Modes: quote | boardroom | news | cheatsheet | visual

async function selectImageMode(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an art director selecting the visual treatment for a LinkedIn post image.

POST:
"""
${postText}
"""

---

MODE SELECTION — pick exactly one:

QUOTE MODE — Puppeteer renders a branded dark quote card. No image prompt needed.
Best for: punchy one-liners, strong opinions, personal reflections, build-in-public updates.
Return: {"mode":"quote"}

BOARDROOM MODE — Puppeteer renders "The Boardroom" comic strip: Signal (hoodie, automated everything, smug) vs Noise (suit, manual everything, always wrong).
Best for: ANY post involving businesses, companies, or business owners — especially when it contrasts old-school vs AI-powered approaches, manual vs automated work, companies that are falling behind vs companies winning, traditional strategies vs modern ones, someone wasting time on repetitive tasks, or an industry being disrupted. If the post mentions companies, business owners, competitors, market dynamics, or organizational behavior — BOARDROOM is almost always correct. This is the DEFAULT for business content.
Return: {"mode":"boardroom"}

NEWS MODE — Playwright screenshots a real news article related to the post topic.
Best for: posts that name a specific company, product, or announcement (e.g. "OpenAI just...", "Google released...", "New study shows..."). Must reference a real, findable news event with a specific headline.
Return: {"mode":"news"}

CHEATSHEET MODE — Puppeteer renders a structured educational card with titled sections and bullet points.
Best for: "X vs Y" comparisons, framework breakdowns, "the difference between...", tool reviews with structured pros/cons, numbered lists of distinct concepts, anything where the educational value is in 2–3 clearly labeled categories with bullet points under each.
Return: {"mode":"cheatsheet"}

VISUAL MODE — Gemini Imagen 3 generates a cinematic editorial photograph or illustration.
Best for: deeply philosophical or emotional content about human experience, identity, or abstract life concepts — with absolutely NO business characters, companies, or organizational contrast. Must be a genuinely abstract topic where none of the above modes could dramatize it.
NEVER use VISUAL for: posts about companies, business owners, industry trends, market competition, AI adoption, productivity, automation, or any organizational scenario — use BOARDROOM instead.
Use VISUAL only as a last resort when the post is purely philosophical with zero business context.

---

PROMPT RULES — VISUAL mode only:

Write a prompt that:
- Makes the PRIMARY SUBJECT clearly related to the post's core topic (AI, automation, business, data). Metaphors influence MOOD and ATMOSPHERE only — never the main subject.
- Describes a specific scene tied to the concept — NOT generic tech imagery
- Uses real-world grounding: physical objects, environments, lighting conditions
- Style: editorial photography meets cinematic storytelling
- Color temperature matches the post's emotion: cool blues for analytical, warm gold for human/optimistic, monochrome for stark, jewel tones for ambitious
- Lighting: practical and motivated (lamp, screen glow, morning sun). No decorative overlays
- Strong negative space, rich textures, decisive framing
- No: glowing circuits, robot suits, floating UI, neon grids, stock setups
- No text or typography in the image
- Ends with: "Professional quality, sharp, no visual artifacts, relevant to topic: [3–5 word topic]"

---

Respond with valid JSON only. No explanation, no markdown fences.
If QUOTE:      {"mode":"quote"}
If BOARDROOM:  {"mode":"boardroom"}
If NEWS:       {"mode":"news"}
If CHEATSHEET: {"mode":"cheatsheet"}
If VISUAL:     {"mode":"visual","imagePrompt":"<full prompt>"}`,
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

// ─── SHARED MODE DISPATCHER ───────────────────────────────────────────────────
// Returns a Buffer. Falls back to the provided fallbackFn if a mode errors.

async function dispatchMode(decision, postText, { fallbackFn, isVertical = false }) {
  const mode = decision.mode;

  if (mode === "quote") {
    return isVertical ? renderVerticalCard(postText) : renderQuoteCard(postText);
  }

  if (mode === "boardroom") {
    try {
      const script = await generateBoardroomScript(postText);
      console.log(`[Agent X] Boardroom episode: "${script.episode}"`);
      return isVertical ? await renderVerticalBoardroom(script) : await renderBoardroom(script);
    } catch (err) {
      console.warn(`[Agent X] Boardroom failed, falling back: ${err.message}`);
      return fallbackFn(postText);
    }
  }

  if (mode === "news") {
    try {
      const url = await fetchNewsUrl(postText);
      if (url) return await renderNewsScreenshot(url);
      console.warn("[Agent X] No news URL found — falling back");
    } catch (err) {
      console.warn(`[Agent X] News screenshot failed, falling back: ${err.message}`);
    }
    return fallbackFn(postText);
  }

  if (mode === "cheatsheet") {
    try {
      const content = await generateCheatsheetContent(postText);
      return isVertical ? await renderVerticalCheatsheet(content) : await renderCheatsheet(content);
    } catch (err) {
      console.warn(`[Agent X] Cheatsheet failed, falling back: ${err.message}`);
      return fallbackFn(postText);
    }
  }

  // VISUAL — Gemini Imagen 3
  const prompt = isVertical
    ? `${decision.imagePrompt} Vertical 9:16 portrait format, 1080x1920 pixels.`
    : decision.imagePrompt;

  try {
    console.log(`[Agent X] Generating Gemini image...`);
    const buf = await generateGeminiImage(prompt);
    if (buf) return buf;
    throw new Error("Gemini returned null");
  } catch (err) {
    console.warn(`[Agent X] Gemini failed: ${err.message}`);
    return isVertical ? fallbackFn(postText) : null;
  }
}

// ─── INSTAGRAM — 1080x1920 vertical (9:16) ───────────────────────────────────

export async function generateImageForInstagram(postText) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Instagram] Mode selection failed, defaulting to QUOTE: ${err.message}`);
    decision = { mode: "quote" };
  }

  console.log(`[Instagram] Image mode: ${decision.mode.toUpperCase()} (9:16 vertical)`);

  return dispatchMode(decision, postText, {
    fallbackFn: renderVerticalCard,
    isVertical: true,
  });
}

// ─── LINKEDIN — 1200x675 landscape ───────────────────────────────────────────

export async function generateImage(postText) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Agent X] Mode selection failed, defaulting to QUOTE: ${err.message}`);
    decision = { mode: "quote" };
  }

  console.log(`[Agent X] Image mode: ${decision.mode.toUpperCase()}`);

  return dispatchMode(decision, postText, {
    fallbackFn: renderQuoteCard,
    isSquare: false,
  });
}
