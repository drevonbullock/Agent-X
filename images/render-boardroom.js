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

const SIGNAL_CANON = `SIGNAL: slim young man (mid-20s). Short dark spiky hair swept to one side. Narrow half-lidded cyan/teal anime eyes — always looks slightly bored and superior. A subtle confident smirk. Wears a dark charcoal-navy hoodie with a kangaroo pocket and dark slim jeans. White clean sneakers. Calm, relaxed body language. Never stressed.`;

const NOISE_CANON = `NOISE: stocky middle-aged man (early 40s). Brown hair with some strands pointing upward in stress/shock. HUGE round anime eyes — whites visible all around the iris, eyebrows raised high. Frequently has sweat drops near his temples. Often open-mouthed in shock or disbelief. Navy blue business suit, white dress shirt, red tie (usually slightly askew). Black dress shoes. Papers and documents often nearby or flying around him.`;

const ART_DIRECTION = `Art style: modern anime/manga illustration. Clean bold linework with confident black outlines. Highly expressive faces — the characters' emotions should be immediately readable. Dynamic action poses. Use speed lines or radial impact lines for dramatic moments. Halftone dot patterns for shading depth. Rich detailed backgrounds that match each scene context. Each panel should have a slightly different warm or cool tone to create visual contrast.

Color palette: dark navy and charcoal for Signal's panels, warm chaotic yellows and reds for Noise's panic panels, orange-accented BCG brand feel throughout. All backgrounds must have richly detailed environmental texture — office furniture, tech equipment, stacked papers, city views, dramatic lighting.

STRICT COLOR RULES: absolutely NO solid bright green (#00FF00 or similar), NO lime green, NO neon green, NO single-color flat fills as the background. All backgrounds must have richly detailed environmental texture.

CRITICAL: NO text, NO speech bubbles, NO captions, NO written words anywhere in the image. Characters should be large, center-frame, and highly expressive.`;

// ─── LANDSCAPE — LinkedIn 1200×700 ───────────────────────────────────────────

const L_WIDTH   = 1200;
const L_HEIGHT  = 700;
const L_HEADER  = 64;
const L_FOOTER  = 28;
const L_DLOGUE  = 110;

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
    return `Panel ${i + 1}: ${char}. Mood: ${mood}. Scene context: ${scene}. Character fills the panel — large, prominent, expressive.`;
  }).join("\n\n");

  return `Create a professional 3-panel horizontal comic strip illustration for a business satire series called "The Boardroom."

The two recurring characters are:
${SIGNAL_CANON}
${NOISE_CANON}

Panel layout: 3 panels side by side in a single wide landscape image (3:1 aspect ratio). Bold black panel dividers. Each panel is a tall vertical rectangle. Fill every panel edge-to-edge with art — no empty space, no padding.

${scenes}

${ART_DIRECTION}

Output: wide landscape comic strip image, exactly 3:1 aspect ratio, 3 panels side by side, cinematic quality, no text.`;
}

// Art fills the full prow as an absolute background (background-size: 100% 100%
// stretches it to fit so no panels are ever clipped). Panel columns sit on top
// with transparent spacers + opaque dialogue bars at the bottom.
function buildLandscapeHtml(panels, artDataUrl, script) {
  const episode = script.episode ? escHtml(script.episode) : "";

  const panelCols = panels.map((p, i) => {
    const isSignal  = p.character === "SIGNAL";
    const lineColor = isSignal ? "#00B4D8" : "#D92B2B";
    const dialogue  = p.dialogue || p.action || "";
    const divider   = i > 0 ? "border-left:2px solid rgba(0,0,0,0.6);" : "";

    return `<div class="pcol" style="${divider}">
  <div class="pspacer"></div>
  <div class="pdlg" style="border-left:4px solid ${lineColor};">
    <span class="dtxt">${escHtml(dialogue)}</span>
  </div>
</div>`;
  }).join("\n");

  const artStyle = artDataUrl
    ? `background-image:url('${artDataUrl}');background-size:100% 100%;`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&family=Inter:wght@700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${L_WIDTH}px;height:${L_HEIGHT}px;overflow:hidden;background:#0d1117;}
.strip{width:${L_WIDTH}px;height:${L_HEIGHT}px;display:flex;flex-direction:column;}
/* Header — centered title, handle pinned right */
.hdr{
  height:${L_HEADER}px;flex-shrink:0;
  background:#0d1117;border-bottom:3px solid #E05D38;
  display:flex;align-items:center;justify-content:center;
  position:relative;padding:0 24px;
}
.htitle-wrap{display:flex;align-items:baseline;gap:14px;}
.htitle{font-family:'Bangers',cursive;font-size:46px;color:#fff;letter-spacing:2px;line-height:1;}
.hep{font-family:'Inter',sans-serif;font-size:18px;color:#E05D38;font-style:italic;font-weight:700;}
.hhandle{position:absolute;right:24px;font-size:11px;color:#333;font-weight:700;font-family:'Inter',sans-serif;}
/* Art row — absolute bg + panel columns on top */
.prow{flex:1;position:relative;display:flex;flex-direction:row;overflow:hidden;}
.art-bg{position:absolute;inset:0;background-color:#0d1117;background-repeat:no-repeat;${artStyle}}
.pcol{flex:1;display:flex;flex-direction:column;position:relative;z-index:1;}
.pspacer{flex:1;}
.pdlg{
  height:${L_DLOGUE}px;flex-shrink:0;
  background:rgba(8,14,28,0.92);
  border-top:1px solid rgba(255,255,255,0.06);
  display:flex;align-items:center;padding:0 20px;
}
.dtxt{
  font-family:'Comic Neue',cursive;font-size:19px;font-weight:700;
  color:#f0f0f0;line-height:1.35;
}
/* Footer */
.ftr{height:${L_FOOTER}px;flex-shrink:0;background:#0d1117;border-top:2px solid #E05D38;display:flex;align-items:center;justify-content:center;}
.ftxt{font-size:10px;color:#333;letter-spacing:0.5px;font-family:'Inter',sans-serif;}
</style>
</head>
<body>
<div class="strip">
  <div class="hdr">
    <div class="htitle-wrap">
      <span class="htitle">THE BOARDROOM</span>
      <span class="hep">— ${episode}</span>
    </div>
    <span class="hhandle">@DrevonBullock</span>
  </div>
  <div class="prow">
    <div class="art-bg"></div>
    ${panelCols}
  </div>
  <div class="ftr"><span class="ftxt">The Boardroom by BCG · AI Automation for Business Owners</span></div>
</div>
</body></html>`;
}

export async function renderBoardroom(script) {
  const panels = pickKeyPanels(script.panels);
  const prompt = buildLandscapePrompt(panels);

  let artDataUrl = "";
  try {
    const buf = await generateGeminiImage(prompt);
    artDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.warn(`[Boardroom] Gemini art failed: ${err.message} — using dark panel fallback`);
  }

  const html    = buildLandscapeHtml(panels, artDataUrl, script);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: L_WIDTH, height: L_HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

// ─── INSTAGRAM VERTICAL — 1080×1350 ──────────────────────────────────────────

const V_WIDTH  = 1080;
const V_HEIGHT = 1350;
const V_HEADER = 110;
const V_FOOTER = 56;
const V_DLOGUE = 130;

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
    return `Panel ${i + 1} (tall vertical rectangle): ${char}. Mood: ${mood}. Scene: ${scene}. Character large, expressive, fills the panel edge-to-edge.`;
  }).join("\n\n");

  return `Create a premium anime-style 3-panel vertical comic strip for "The Boardroom" business satire series.

RECURRING CHARACTERS — draw these EXACTLY the same way every time:
${SIGNAL_CANON}
${NOISE_CANON}

Panel layout: 3 tall vertical panels stacked on top of each other (full width, 1:3 height ratio total). Bold black borders between panels. Fill every panel completely — no empty space.

${scenes}

${ART_DIRECTION}

Fill each tall panel with dynamic composition — characters large and expressive, backgrounds richly detailed, use the full vertical height. Make Noise's panic scenes extremely exaggerated anime-style with dramatic impact lines.

Output: tall vertical portrait comic strip, 3 stacked panels, no text.`;
}

function buildVerticalHtml(panels, artDataUrl, script) {
  const episode  = script.episode ? escHtml(script.episode) : "";
  const panelH   = Math.floor((V_HEIGHT - V_HEADER - V_FOOTER) / 3);

  const panelRows = panels.map((p, i) => {
    const isSignal  = p.character === "SIGNAL";
    const lineColor = isSignal ? "#00B4D8" : "#D92B2B";
    const dialogue  = p.dialogue || p.action || "";
    const divider   = i > 0 ? "border-top:2px solid rgba(0,0,0,0.7);" : "";

    return `<div class="vpanel" style="height:${panelH}px;${divider}">
  <div class="vspacer"></div>
  <div class="vdlg" style="border-left:5px solid ${lineColor};">
    <span class="vdtxt">${escHtml(dialogue)}</span>
  </div>
</div>`;
  }).join("\n");

  const artStyle = artDataUrl
    ? `background-image:url('${artDataUrl}');background-size:100% 100%;`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&family=Inter:wght@700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${V_WIDTH}px;height:${V_HEIGHT}px;overflow:hidden;background:#0d1117;}
.vcanvas{width:${V_WIDTH}px;height:${V_HEIGHT}px;display:flex;flex-direction:column;}
.vhdr{
  height:${V_HEADER}px;flex-shrink:0;
  background:#0d1117;border-bottom:4px solid #E05D38;
  display:flex;align-items:center;justify-content:center;
  position:relative;padding:0 28px;
}
.vhtitle-wrap{display:flex;align-items:baseline;gap:14px;}
.vhtitle{font-family:'Bangers',cursive;font-size:58px;color:#fff;letter-spacing:3px;line-height:1;}
.vhep{font-family:'Inter',sans-serif;font-size:20px;color:#E05D38;font-style:italic;font-weight:700;}
.vhhandle{position:absolute;right:28px;font-size:13px;color:#333;font-weight:700;font-family:'Inter',sans-serif;}
.vpanels{flex:1;position:relative;display:flex;flex-direction:column;overflow:hidden;}
.art-bg{position:absolute;inset:0;background-color:#0d1117;background-repeat:no-repeat;${artStyle}}
.vpanel{flex-shrink:0;display:flex;flex-direction:column;position:relative;z-index:1;}
.vspacer{flex:1;}
.vdlg{
  height:${V_DLOGUE}px;flex-shrink:0;
  background:rgba(8,14,28,0.92);
  border-top:1px solid rgba(255,255,255,0.06);
  display:flex;align-items:center;justify-content:center;padding:0 32px;
}
.vdtxt{font-family:'Comic Neue',cursive;font-size:33px;font-weight:700;color:#f0f0f0;line-height:1.25;text-align:center;}
.vftr{height:${V_FOOTER}px;flex-shrink:0;background:#0d1117;border-top:3px solid #E05D38;display:flex;align-items:center;justify-content:center;}
.vftxt{font-size:13px;color:#333;letter-spacing:0.5px;font-family:'Inter',sans-serif;}
</style>
</head>
<body>
<div class="vcanvas">
  <div class="vhdr">
    <div class="vhtitle-wrap">
      <span class="vhtitle">THE BOARDROOM</span>
      <span class="vhep">— ${episode}</span>
    </div>
    <span class="vhhandle">@DrevonBullock</span>
  </div>
  <div class="vpanels">
    <div class="art-bg"></div>
    ${panelRows}
  </div>
  <div class="vftr"><span class="vftxt">The Boardroom by BCG · AI Automation for Business Owners</span></div>
</div>
</body></html>`;
}

export async function renderVerticalBoardroom(script) {
  const panels = pickKeyPanels(script.panels);
  const prompt = buildVerticalPrompt(panels);

  let artDataUrl = "";
  try {
    const buf = await generateGeminiImage(prompt);
    artDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.warn(`[Boardroom] Gemini art failed: ${err.message} — using dark panel fallback`);
  }

  const html    = buildVerticalHtml(panels, artDataUrl, script);
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
