import Anthropic from "@anthropic-ai/sdk";
import { renderNewsScreenshot } from "../images/render-news-screenshot.js";
import { fetchNewsUrl } from "./fetch-news-url.js";

const client = new Anthropic();

// ─── RELEVANCE GATE ──────────────────────────────────────────────────────────
// Firecrawl always returns SOMETHING from a trusted domain, so without a gate an
// opinion post gets paired with an unrelated headline and photo (a claim about
// college once matched an article about Fortune 500 CEOs). Only post a news card
// when the text actually references a real, named, findable news event.

async function isNewsWorthy(postText) {
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{
        role: "user",
        content: `Does this post reference a SPECIFIC real company, product launch, funding round, study, or named announcement that would have a dedicated news article written about it?

POST:
"""
${postText}
"""

Answer "yes" if the post names a real company, product, or institution AND describes something that happened or was announced. The event does not need to be described in detail.
Examples that are yes: "OpenAI just released a new model", "Google announced a pricing change", "a new MIT study found...".
Answer "no" for general opinions, arguments, advice, or motivational claims with no named organization and no event.
Examples that are no: "College taught you to wait for permission", "Screenshots are not a product", "AI already beats you at your job".

Reply with exactly one word: yes or no.`,
      }],
    });
    return msg.content[0].text.trim().toLowerCase().startsWith("y");
  } catch {
    return false; // gate failure → text-only, never a mismatched card
  }
}

// ─── IMAGE GENERATION — NEWS CARD ONLY (2026-07-24) ──────────────────────────
// Cheatsheet mode was removed entirely at Dre's request (it posted too
// consistently and got repetitive). The only remaining image format is the
// editorial news card (images/render-news-screenshot.js v3), built from the
// source article's og: meta tags.
//
// No article found or render fails → returns null → the caller posts text-only.
// That is intentional: a text controversy post beats a filler graphic.
//
// Both LinkedIn and Instagram use the same 1080x1350 (4:5) card, so there is
// no longer a landscape/vertical split. The `variantId` parameter is retained
// for call-site compatibility (analytics/optimizer passes it) but unused —
// the news card has no theme variants.

async function renderNewsCard(postText, label) {
  try {
    if (!(await isNewsWorthy(postText))) {
      console.log(`[${label}] Not a news post — posting text-only`);
      return null;
    }
    const url = await fetchNewsUrl(postText);
    if (!url) {
      console.log(`[${label}] No news article found — posting text-only`);
      return null;
    }
    const buf = await renderNewsScreenshot(url);
    console.log(`[${label}] News card rendered`);
    return buf;
  } catch (err) {
    console.warn(`[${label}] News card failed — posting text-only: ${err.message}`);
    return null;
  }
}

// ─── LINKEDIN ────────────────────────────────────────────────────────────────

export async function generateImage(postText, _variantId = null) {
  return renderNewsCard(postText, "Agent X");
}

// ─── INSTAGRAM ───────────────────────────────────────────────────────────────

export async function generateImageForInstagram(postText, _variantId = null) {
  return renderNewsCard(postText, "Instagram");
}
