import puppeteer from "puppeteer";
import { generateGeminiImage } from "./gemini.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function pickKeyPanels(panels) {
  const all = Array.isArray(panels) ? panels : [];
  if (all.length >= 5) return [all[0], all[3], all[4]];
  if (all.length >= 3) return [all[0], all[1], all[2]];
  const padded = [...all];
  while (padded.length < 3) padded.push({ character: "NOISE", dialogue: "...", action: null });
  return padded;
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── CHARACTER CANON ──────────────────────────────────────────────────────────
// These descriptions are injected into every Gemini prompt so characters stay
// consistent across every single strip, no matter the topic.

const SIGNAL_CANON = `SIGNAL: slim young man (mid-20s). Short dark spiky hair swept to one side. Narrow half-lidded cyan/teal anime eyes — always looks slightly bored and superior. A subtle confident smirk. Wears a dark charcoal-navy hoodie with a kangaroo pocket and dark slim jeans. White clean sneakers. Calm, relaxed body language. Never stressed.`;

const NOISE_CANON = `NOISE: stocky middle-aged man (early 40s). Brown hair with some strands pointing upward in stress/shock. HUGE round anime eyes — whites visible all around the iris, eyebrows raised high. Frequently has sweat drops near his temples. Often open-mouthed in shock or disbelief. Navy blue business suit, white dress shirt, red tie (usually slightly askew). Black dress shoes. Papers and documents often nearby or flying around him.`;

const ART_DIRECTION = `Art style: modern anime/manga illustration. Clean bold linework with confident black outlines. Highly expressive faces — the characters' emotions should be immediately readable. Dynamic action poses. Use speed lines or radial impact lines for dramatic moments. Halftone dot patterns for shading depth. Rich detailed backgrounds that match each scene context. Each panel should have a slightly different warm or cool tone to create visual contrast. Color palette: dark navy / charcoal for Signal's panels, warm chaotic colors for Noise's panic panels, orange-accented BCG brand feel throughout. CRITICAL: NO text, NO speech bubbles, NO captions, NO words anywhere in the image — text is added as an overlay layer separately.`;

// ─── HORIZONTAL — LinkedIn 1200×700 ──────────────────────────────────────────

const WIDTH  = 1200;
const HEIGHT = 700;

function buildLandscapePrompt(panels) {
  const scenes = panels.map((p, i) => {
    const isSignal = p.character === "SIGNAL";
    const char = isSignal ? "SIGNAL" : "NOISE";
    const mood = isSignal
      ? "calm, cool, slightly smug — half-lidded eyes, barely even paying attention"
      : (i === 2
          ? "completely shocked — jaw dropped, huge eyes, sweat drops everywhere, maybe stumbling back"
          : "overconfident, animated, gesturing with both hands, grinning");
    const scene = p.action
      ? p.action
      : (isSignal ? "standing casually, one hand in hoodie pocket" : "at a cluttered office desk with papers everywhere");
    return `Panel ${i + 1}: ${char}. Mood: ${mood}. Scene context: ${scene}.`;
  }).join("\n\n");

  return `Create a professional 3-panel horizontal comic strip illustration for a business satire series called "The Boardroom."

The two recurring characters are:
${SIGNAL_CANON}
${NOISE_CANON}

Panel layout: 3 panels side by side in a single wide landscape image (3:1 aspect ratio). Thin bold black panel dividers between them. Each panel is a vertical rectangle.

${scenes}

${ART_DIRECTION}

Output: wide landscape comic strip image, 3 panels, cinematic quality, no text.`;
}

function buildLandscapeOverlayHtml(panels, artDataUrl, script) {
  const episode = script.episode ? `— ${escHtml(script.episode)}` : "";
  const PANEL_ACCENT = ["#E05D38", "#00B4D8", "#D92B2B"];

  const bubbles = panels.map((p, i) => {
    if (!p.dialogue) return "";
    const isSignal   = p.character === "SIGNAL";
    const borderCol  = isSignal ? "#00B4D8" : "#D92B2B";
    const shadowCol  = isSignal ? "#00B4D8" : "#D92B2B";
    // Position bubble near top of each panel (panels are roughly 1/3 each)
    const leftPct = (i * 33.33 + 1).toFixed(1);
    return `<div class="bubble" style="
      left:${leftPct}%;
      width:31%;
      border-color:${borderCol};
      box-shadow:3px 3px 0 ${shadowCol};
    ">${escHtml(p.dialogue)}<span class="bubble-tail" style="border-top-color:${borderCol}"></span></div>`;
  }).join("\n");

  const names = panels.map((p, i) => {
    const isSignal  = p.character === "SIGNAL";
    const color     = isSignal ? "#00B4D8" : "#D92B2B";
    const leftPct   = (i * 33.33 + 1).toFixed(1);
    return `<div class="char-label" style="left:${leftPct}%;width:31%;color:${color};border-top:2px solid ${PANEL_ACCENT[i]}">${escHtml(p.character)}</div>`;
  }).join("\n");

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&family=Inter:wght@700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #0d1117; }
.strip { width: ${WIDTH}px; height: ${HEIGHT}px; display: flex; flex-direction: column; }
/* Header */
.header {
  height: 52px; flex-shrink: 0;
  background: #0d1117;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; border-bottom: 3px solid #E05D38;
}
.title { font-family: 'Bangers', cursive; font-size: 36px; color: #fff; letter-spacing: 2px; }
.ep { font-family: 'Inter', sans-serif; font-size: 13px; color: #E05D38; font-style: italic; margin-left: 10px; }
.handle { font-size: 11px; color: #444; font-weight: 700; }
/* Art area */
.art-area {
  flex: 1; position: relative; overflow: hidden;
}
.art-area img { width: 100%; height: 100%; object-fit: cover; display: block; }
/* Speech bubbles */
.bubble {
  position: absolute; top: 8px;
  background: white; border: 3px solid #111; border-radius: 16px;
  padding: 8px 12px; font-family: 'Comic Neue', sans-serif;
  font-size: 15px; font-weight: 700; color: #111;
  line-height: 1.3; text-align: center;
  z-index: 10;
}
.bubble-tail {
  position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 8px solid transparent; border-right: 8px solid transparent;
  border-top: 14px solid #111;
  display: block;
}
/* Character labels */
.char-label {
  position: absolute; bottom: 0;
  font-size: 10px; font-weight: 800; letter-spacing: 3px;
  font-family: 'Inter', sans-serif; text-align: center;
  padding: 4px 0; background: rgba(0,0,0,0.6);
  z-index: 10;
}
/* Footer */
.footer {
  height: 28px; flex-shrink: 0;
  background: #0d1117; border-top: 2px solid #E05D38;
  display: flex; align-items: center; justify-content: center;
}
.footer-text { font-size: 10px; color: #444; letter-spacing: 0.5px; font-family: 'Inter', sans-serif; }
</style>
</head>
<body>
<div class="strip">
  <div class="header">
    <div style="display:flex;align-items:baseline">
      <span class="title">THE BOARDROOM</span>
      <span class="ep">${episode}</span>
    </div>
    <span class="handle">@DrevonBullock · Bullock Consulting Group</span>
  </div>
  <div class="art-area">
    <img src="${artDataUrl}" alt=""/>
    ${bubbles}
    ${names}
  </div>
  <div class="footer">
    <span class="footer-text">The Boardroom by BCG · AI Automation for Business Owners</span>
  </div>
</div>
</body>
</html>`;
}

export async function renderBoardroom(script) {
  const panels = pickKeyPanels(script.panels);
  const prompt = buildLandscapePrompt(panels);

  // Generate art with Gemini (Nano Banana Pro)
  let artDataUrl;
  try {
    const buf = await generateGeminiImage(prompt);
    artDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.warn(`[Boardroom] Gemini art failed: ${err.message} — using placeholder`);
    // Solid dark background fallback so overlay still renders
    artDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  const html    = buildLandscapeOverlayHtml(panels, artDataUrl, script);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

// ─── INSTAGRAM VERTICAL — 1080×1350 ──────────────────────────────────────────

const V_WIDTH  = 1080;
const V_HEIGHT = 1350;
const V_HEADER_H = 110;
const V_FOOTER_H = 64;

function buildVerticalPrompt(panels) {
  const scenes = panels.map((p, i) => {
    const isSignal = p.character === "SIGNAL";
    const char = isSignal ? "SIGNAL" : "NOISE";
    const mood = isSignal
      ? "relaxed and confident — half-lidded eyes, cool smirk, hands in hoodie pocket"
      : (i === 2
          ? "completely overwhelmed — huge shocked eyes, sweat drops, hands up, papers flying everywhere"
          : "overconfident and loud — big grin, gesturing with both hands, leaning forward");
    const scene = p.action || (isSignal ? "casual minimal office desk with laptop" : "chaotic cluttered desk with paper stacks everywhere");
    return `Panel ${i + 1} (tall vertical rectangle): ${char}. Mood: ${mood}. Scene: ${scene}. Panel ${i === 0 ? "sets up the conflict" : i === 1 ? "escalates tension" : "delivers the punchline with maximum dramatic impact"}.`;
  }).join("\n\n");

  return `Create a premium anime-style 3-panel vertical comic strip for "The Boardroom" business satire series.

RECURRING CHARACTERS — draw these EXACTLY the same way every time:
${SIGNAL_CANON}
${NOISE_CANON}

Panel layout: 3 tall vertical panels stacked on top of each other (full width, 1:3 height ratio total). Bold black borders between panels.

${scenes}

${ART_DIRECTION}

Extra emphasis for vertical format: fill each tall panel with dynamic composition — characters large and expressive, backgrounds detailed, use the full vertical height. Make Noise's panic scenes extremely exaggerated anime-style with dramatic impact lines radiating outward.

Output: tall vertical portrait comic strip, 3 stacked panels, no text.`;
}

function buildVerticalOverlayHtml(panels, artDataUrl, script) {
  const episode   = script.episode ? `— ${escHtml(script.episode)}` : "";
  const artAreaH  = V_HEIGHT - V_HEADER_H - V_FOOTER_H;
  const panelH    = Math.floor(artAreaH / 3);

  const bubbles = panels.map((p, i) => {
    if (!p.dialogue) return "";
    const isSignal  = p.character === "SIGNAL";
    const borderCol = isSignal ? "#00B4D8" : "#D92B2B";
    const topPx     = V_HEADER_H + i * panelH + 12;
    return `<div class="vbubble" style="top:${topPx}px;border-color:${borderCol};box-shadow:3px 3px 0 ${borderCol}">${escHtml(p.dialogue)}<span class="vbt" style="border-top-color:${borderCol}"></span></div>`;
  }).join("\n");

  const labels = panels.map((p, i) => {
    const isSignal  = p.character === "SIGNAL";
    const color     = isSignal ? "#00B4D8" : "#D92B2B";
    const bottomPx  = V_HEIGHT - V_FOOTER_H - (3 - i) * panelH + panelH - 36;
    return `<div class="vlabel" style="top:${bottomPx}px;color:${color}">${escHtml(p.character)}</div>`;
  }).join("\n");

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&family=Inter:wght@700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${V_WIDTH}px; height: ${V_HEIGHT}px; overflow: hidden; background: #0d1117; }
.canvas { width: ${V_WIDTH}px; height: ${V_HEIGHT}px; display: flex; flex-direction: column; }
.vheader {
  height: ${V_HEADER_H}px; flex-shrink: 0;
  background: #0d1117; border-bottom: 4px solid #E05D38;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px;
}
.vtitle { font-family: 'Bangers', cursive; font-size: 54px; color: #fff; letter-spacing: 3px; }
.vep { font-size: 16px; color: #E05D38; font-style: italic; margin-left: 10px; font-family: 'Inter', sans-serif; }
.vhandle { font-size: 13px; color: #444; font-weight: 700; text-align: right; font-family: 'Inter', sans-serif; line-height: 1.5; }
.vart-area { flex: 1; position: relative; overflow: hidden; }
.vart-area img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vbubble {
  position: absolute; left: 50%; transform: translateX(-50%);
  width: 78%; background: white; border: 3px solid #111;
  border-radius: 18px; padding: 14px 20px;
  font-family: 'Comic Neue', sans-serif; font-size: 28px; font-weight: 700;
  color: #111; line-height: 1.3; text-align: center; z-index: 10;
  box-shadow: 3px 3px 0 #111;
}
.vbt {
  position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 10px solid transparent; border-right: 10px solid transparent;
  border-top: 16px solid #111; display: block;
}
.vlabel {
  position: absolute; left: 0; width: 100%;
  font-size: 14px; font-weight: 800; letter-spacing: 3px;
  font-family: 'Inter', sans-serif; text-align: center;
  padding: 5px 0; background: rgba(0,0,0,0.65); z-index: 10;
}
.vfooter {
  height: ${V_FOOTER_H}px; flex-shrink: 0;
  background: #0d1117; border-top: 3px solid #E05D38;
  display: flex; align-items: center; justify-content: center;
}
.vfooter-text { font-size: 14px; color: #444; letter-spacing: 0.5px; font-family: 'Inter', sans-serif; }
</style>
</head>
<body>
<div class="canvas">
  <div class="vheader">
    <div style="display:flex;align-items:baseline">
      <span class="vtitle">THE BOARDROOM</span>
      <span class="vep">${episode}</span>
    </div>
    <div class="vhandle">@DrevonBullock<br>Bullock Consulting Group</div>
  </div>
  <div class="vart-area">
    <img src="${artDataUrl}" alt=""/>
    ${bubbles}
    ${labels}
  </div>
  <div class="vfooter">
    <span class="vfooter-text">The Boardroom by BCG · AI Automation for Business Owners</span>
  </div>
</div>
</body>
</html>`;
}

export async function renderVerticalBoardroom(script) {
  const panels = pickKeyPanels(script.panels);
  const prompt = buildVerticalPrompt(panels);

  let artDataUrl;
  try {
    const buf = await generateGeminiImage(prompt);
    artDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.warn(`[Boardroom] Gemini art failed: ${err.message} — using placeholder`);
    artDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  const html    = buildVerticalOverlayHtml(panels, artDataUrl, script);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: V_WIDTH, height: V_HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
