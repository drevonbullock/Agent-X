import Anthropic from "@anthropic-ai/sdk";
import { renderQuoteCard } from "../images/render-quote-card.js";
import { generateGeminiImage } from "../images/gemini.js";
import { generateDalleImage } from "../images/dalle.js";

const client = new Anthropic();

// Ask Claude to decide: QUOTE MODE (branded text card) or VISUAL MODE (cinematic AI image).
// If VISUAL, Claude also writes the optimal image prompt.
async function selectImageMode(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are choosing the visual mode for a LinkedIn post image.

POST:
"""
${postText}
"""

QUOTE MODE — a branded dark card with a key phrase in large text, orange accents, author byline.
Best for: philosophical takes, opinions, reflections, punchy statements, build-in-public updates.

VISUAL MODE — a cinematic AI-generated illustration matching the post's theme.
Best for: AI/tech tips, explainers, process concepts, technical ideas that benefit from a visual metaphor.

Respond with valid JSON only. No explanation, no markdown.
If QUOTE: {"mode":"quote"}
If VISUAL: {"mode":"visual","imagePrompt":"<cinematic prompt — dark futuristic aesthetic, orange neon accents, no text in image>"}`,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  // Strip markdown code fences if the model wraps the JSON
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(json);
}

export async function generateImage(postText) {
  let decision;
  try {
    decision = await selectImageMode(postText);
  } catch (err) {
    console.warn(`[Agent X] Image mode selection failed, defaulting to QUOTE: ${err.message}`);
    decision = { mode: "quote" };
  }

  console.log(`[Agent X] Image mode: ${decision.mode.toUpperCase()}`);

  if (decision.mode === "quote") {
    return renderQuoteCard(postText);
  }

  // VISUAL mode — Gemini Imagen 3, fall back to DALL-E if unavailable
  try {
    console.log(`[Agent X] Generating Gemini image...`);
    return await generateGeminiImage(decision.imagePrompt);
  } catch (err) {
    console.warn(`[Agent X] Gemini image failed, falling back to DALL-E: ${err.message}`);
    return generateDalleImage(postText);
  }
}
