import Anthropic from "@anthropic-ai/sdk";
import { renderQuoteCard } from "../images/render-quote-card.js";
import { generateGeminiImage } from "../images/gemini.js";

const client = new Anthropic();

// Ask Claude to decide: QUOTE, DIAGRAM, or VISUAL mode for the post image.
// If DIAGRAM or VISUAL, Claude writes a detailed, topic-specific image prompt.
async function selectImageMode(postText) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an art director selecting the visual treatment for a LinkedIn post image and writing a precise image generation prompt.

POST:
"""
${postText}
"""

---

MODE SELECTION:

QUOTE MODE — Puppeteer renders a branded dark card. No image prompt needed.
Best for: punchy one-liners, strong opinions, personal reflections, build-in-public updates.

DIAGRAM MODE — AI generates a flat-design infographic visualizing the post's core concept.
Best for: frameworks, step-by-step processes, comparisons, statistics, numbered lists, mental models, before/after structures.

COMIC MODE — AI generates a comic strip that dramatizes the post's core narrative.
Best for: relatable scenarios, problem/solution arcs, before/after moments, humorous observations about AI/tech/business, anything with a punchline or ironic twist.

VISUAL MODE — AI generates a cinematic, editorial-quality photograph or illustration.
Best for: everything else — abstract ideas, atmosphere, storytelling, concepts that need a powerful visual metaphor.

---

PROMPT WRITING RULES:

For DIAGRAM mode, write a prompt that:
- Describes the specific diagram type (flowchart, comparison table, numbered steps, 2x2 matrix, pyramid, etc.)
- Names the actual concept or framework from the post — not generic "business diagram"
- Choose a color scheme that makes the information clearest for this topic: navy/gold for professional/strategic, dark/neon for tech/data, clean white/black for minimalist concepts, warm tones for human/organizational topics — let the content decide
- Flat design, clean sans-serif typography, consulting-quality layout (think HBR, McKinsey, Sequoia)
- No clip art, no drop shadows, no cheesy icons
- Ends with: "Professional quality, sharp, no visual artifacts, relevant to topic: [the post's core topic in 3–5 words]"

For COMIC mode, write a prompt that:
- First, extract the core narrative arc from the post: what is the setup, conflict, and resolution/punchline?
- Describe a 3-panel horizontal comic strip layout using that exact arc — label each panel's scene and dialogue
- Characters: relatable archetypes (stressed developer, clueless executive, skeptical founder, overconfident consultant) — no robots, no generic stick figures
- Art style: retro comic with modern sensibility — bold black outlines, flat colors, clean ink style. Reference: mid-century editorial cartoon meets Dilbert meets modern tech illustration
- Choose a color palette that matches the tone: warm yellows and reds for humor and chaos, cool blues and greens for tech and logic, high contrast black/white with one accent for dramatic or serious topics — let the mood drive the palette
- Speech bubbles: white or light fill, bold black border, short punchy dialogue lifted from the post's core idea (max 8 words per bubble)
- Panel 1: establish the problem/situation. Panel 2: the turning point or reaction. Panel 3: the resolution, punchline, or "aha" moment
- No photorealism, no lens flare, no generic clipart
- Ends with: "Professional quality, sharp, no visual artifacts, relevant to topic: [the post's core topic in 3–5 words]"

For VISUAL mode, write a prompt that:
- CRITICAL: Always make the PRIMARY SUBJECT of the image clearly related to the post's core topic (AI, automation, technology, business, data, agents, etc.). Metaphors and analogies from the post should influence the MOOD, LIGHTING, and ATMOSPHERE only — never replace the main subject. A post about AI agents using a bike metaphor should show something AI/tech related with a sense of autonomy and open-ended exploration — not a literal bike.
- Describes a specific scene or subject tied directly to the post's concept — NOT generic tech imagery
- Uses real-world grounding: physical objects, environments, materials, lighting conditions
- Style: editorial photography meets cinematic storytelling — intentional composition, strong mood
- Choose a color temperature and palette that matches the post's emotion: cool desaturated blues for analytical/serious, warm golden tones for human/optimistic, high contrast monochrome for stark/decisive, rich jewel tones for ambitious/visionary — let the feeling drive the color
- Lighting: practical and motivated — a lamp, a screen glow, morning sun, a single overhead beam. No decorative color overlays
- Strong negative space, rich textures (paper, metal, fabric, concrete), decisive framing
- Absolutely no: glowing circuits, robot suits, floating UI elements, neon grid lines, generic stock photo setups
- No text or typography in the image
- Ends with: "Professional quality, sharp, no visual artifacts, relevant to topic: [the post's core topic in 3–5 words]"

---

Respond with valid JSON only. No explanation, no markdown fences.
If QUOTE: {"mode":"quote"}
If DIAGRAM: {"mode":"diagram","imagePrompt":"<your full diagram prompt>"}
If COMIC: {"mode":"comic","imagePrompt":"<your full comic strip prompt>"}
If VISUAL: {"mode":"visual","imagePrompt":"<your full visual prompt>"}`,
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

  if (decision.mode === "diagram") {
    try {
      console.log(`[Agent X] Generating Gemini diagram...`);
      return await generateGeminiImage(decision.imagePrompt);
    } catch (err) {
      console.log(`[Agent X] Gemini failed, posting text only`);
      return null;
    }
  }

  if (decision.mode === "comic") {
    try {
      console.log(`[Agent X] Generating Gemini comic strip...`);
      return await generateGeminiImage(decision.imagePrompt);
    } catch (err) {
      console.log(`[Agent X] Gemini failed, posting text only`);
      return null;
    }
  }

  // VISUAL mode — Gemini Imagen 3
  try {
    console.log(`[Agent X] Generating Gemini image...`);
    return await generateGeminiImage(decision.imagePrompt);
  } catch (err) {
    console.log(`[Agent X] Gemini failed, posting text only`);
    return null;
  }
}
