import puppeteer from "puppeteer";

const WIDTH  = 1200;
const HEIGHT = 700;

// Pick the 3 most narratively important panels: Setup → Reveal → Punchline
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

// SIGNAL — hoodie tech bro, full body, half-lidded smug eyes, smirk
const SIGNAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240" overflow="visible">
  <!-- Shoes -->
  <ellipse cx="37" cy="233" rx="15" ry="6" fill="#222"/>
  <ellipse cx="83" cy="233" rx="15" ry="6" fill="#222"/>
  <!-- Legs -->
  <rect x="25" y="168" width="24" height="66" rx="12" fill="#4A5568"/>
  <rect x="71" y="168" width="24" height="66" rx="12" fill="#4A5568"/>
  <!-- Hoodie body -->
  <path d="M12 98 Q9 145 11 172 L109 172 Q111 145 108 98 Q88 88 60 88 Q32 88 12 98Z" fill="#2D3748"/>
  <!-- Hood collar V -->
  <path d="M40 98 Q60 112 80 98" stroke="#374559" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- Kangaroo pocket -->
  <rect x="36" y="146" width="48" height="22" rx="8" fill="#222F3E"/>
  <!-- Left arm -->
  <path d="M12 105 Q3 128 6 158" stroke="#2D3748" stroke-width="20" fill="none" stroke-linecap="round"/>
  <!-- Right arm -->
  <path d="M108 105 Q117 128 114 158" stroke="#2D3748" stroke-width="20" fill="none" stroke-linecap="round"/>
  <!-- Hands -->
  <circle cx="6" cy="160" r="12" fill="#F5C9A8"/>
  <circle cx="114" cy="160" r="12" fill="#F5C9A8"/>
  <!-- Neck -->
  <rect x="50" y="82" width="20" height="14" rx="7" fill="#F5C9A8"/>
  <!-- Head -->
  <circle cx="60" cy="48" r="40" fill="#F5C9A8"/>
  <!-- Hair -->
  <path d="M20 42 Q22 6 60 6 Q98 6 100 42 Q90 20 60 23 Q30 20 20 42Z" fill="#111"/>
  <!-- Left eye — heavy eyelid = half-lidded look -->
  <circle cx="43" cy="52" r="9" fill="#1A1A1A"/>
  <path d="M33 47 Q43 41 53 47" stroke="#F5C9A8" stroke-width="9" fill="none" stroke-linecap="round"/>
  <!-- Right eye -->
  <circle cx="77" cy="52" r="9" fill="#1A1A1A"/>
  <path d="M67 47 Q77 41 87 47" stroke="#F5C9A8" stroke-width="9" fill="none" stroke-linecap="round"/>
  <!-- Eye highlights -->
  <circle cx="40" cy="50" r="2.5" fill="white"/>
  <circle cx="74" cy="50" r="2.5" fill="white"/>
  <!-- Nose -->
  <path d="M57 62 Q60 69 63 62" stroke="#D4A078" stroke-width="2" fill="none"/>
  <!-- Smug smirk (angled right) -->
  <path d="M43 73 Q55 82 70 74" stroke="#444" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

// NOISE — stocky suit guy, full body, wide panicked eyes, open mouth, papers in hand
const NOISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240" overflow="visible">
  <!-- Shoes -->
  <ellipse cx="35" cy="233" rx="17" ry="7" fill="#111"/>
  <ellipse cx="85" cy="233" rx="17" ry="7" fill="#111"/>
  <!-- Trousers -->
  <rect x="23" y="166" width="26" height="68" rx="11" fill="#1E3A5F"/>
  <rect x="71" y="166" width="26" height="68" rx="11" fill="#1E3A5F"/>
  <!-- White shirt center panel -->
  <path d="M40 96 L60 84 L80 96 L80 168 L40 168Z" fill="#EEEEEE"/>
  <!-- Left suit jacket panel -->
  <path d="M10 96 Q8 142 10 168 L40 168 L40 96 Q24 90 10 96Z" fill="#1E3A5F"/>
  <!-- Right suit jacket panel -->
  <path d="M110 96 Q112 142 110 168 L80 168 L80 96 Q96 90 110 96Z" fill="#1E3A5F"/>
  <!-- Lapels -->
  <path d="M40 96 L60 84 L60 132 L40 148Z" fill="#19304F"/>
  <path d="M80 96 L60 84 L60 132 L80 148Z" fill="#19304F"/>
  <!-- Tie -->
  <polygon points="56,96 60,84 64,96 62,163 58,163" fill="#CC2222"/>
  <path d="M55 96 Q60 89 65 96 L62 105 L58 105Z" fill="#991111"/>
  <!-- Buttons -->
  <circle cx="60" cy="148" r="3" fill="#CCC"/>
  <circle cx="60" cy="160" r="3" fill="#CCC"/>
  <!-- Left arm (outstretched / gesturing) -->
  <path d="M10 103 Q0 122 3 150" stroke="#1E3A5F" stroke-width="22" fill="none" stroke-linecap="round"/>
  <!-- Right arm (down, papers) -->
  <path d="M110 103 Q118 126 116 152" stroke="#1E3A5F" stroke-width="20" fill="none" stroke-linecap="round"/>
  <!-- Left hand -->
  <circle cx="3" cy="152" r="13" fill="#F2A880"/>
  <!-- Right hand + papers -->
  <circle cx="116" cy="154" r="12" fill="#F2A880"/>
  <rect x="112" y="152" width="22" height="28" rx="2" fill="white" stroke="#CCC" stroke-width="1.5" transform="rotate(8,123,166)"/>
  <line x1="115" y1="159" x2="131" y2="158" stroke="#BBB" stroke-width="1.5"/>
  <line x1="115" y1="165" x2="131" y2="164" stroke="#BBB" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="50" y="80" width="20" height="16" rx="7" fill="#F2A880"/>
  <!-- Head (slightly wider for old-school look) -->
  <ellipse cx="60" cy="46" rx="44" ry="41" fill="#F2A880"/>
  <!-- Hair -->
  <path d="M16 40 Q18 5 60 5 Q102 5 104 40 Q95 16 61 19 Q26 16 16 40Z" fill="#3D2B1F"/>
  <path d="M60 5 Q57 14 53 22" stroke="#2A1A10" stroke-width="2" fill="none"/>
  <!-- Eyebrows (raised high — worried) -->
  <path d="M20 32 Q32 24 46 30" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M74 30 Q88 24 100 32" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Left eye (wide, alarmed) -->
  <circle cx="32" cy="46" r="13" fill="white" stroke="#222" stroke-width="1.5"/>
  <circle cx="34" cy="47" r="7" fill="#1A1A1A"/>
  <circle cx="31" cy="44" r="2.5" fill="white"/>
  <!-- Right eye (wide, alarmed) -->
  <circle cx="88" cy="46" r="13" fill="white" stroke="#222" stroke-width="1.5"/>
  <circle cx="90" cy="47" r="7" fill="#1A1A1A"/>
  <circle cx="87" cy="44" r="2.5" fill="white"/>
  <!-- Nose -->
  <path d="M57 60 Q60 68 63 60" stroke="#C08060" stroke-width="2" fill="none"/>
  <!-- Open shocked mouth -->
  <ellipse cx="60" cy="76" rx="14" ry="11" fill="#C03030"/>
  <ellipse cx="60" cy="74" rx="10" ry="7" fill="#992020"/>
  <path d="M46 76 Q60 87 74 76" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Sweat drop -->
  <path d="M104 24 Q107 13 110 24 Q110 33 107 35 Q104 33 104 24Z" fill="#88CCFF" opacity="0.9"/>
</svg>`;

// Panel background + accent per position
const PANEL_BG      = ["#FFFDF4", "#F0F6FF", "#F3FFF6"];
const PANEL_ACCENT  = ["#E8A020", "#4A90D9", "#22C55E"];

function renderPanel(panel, idx) {
  const isSignal = panel.character === "SIGNAL";
  const svg      = isSignal ? SIGNAL_SVG : NOISE_SVG;
  const bg       = PANEL_BG[idx]     || "#FFFDF4";
  const accent   = PANEL_ACCENT[idx] || "#E8A020";

  const bubble = panel.dialogue
    ? `<div class="bubble"><span>${escHtml(panel.dialogue)}</span></div>`
    : `<div class="bubble-empty"></div>`;

  const action = panel.action
    ? `<div class="action">${escHtml(panel.action)}</div>`
    : "";

  const charColor = isSignal ? "#2D3748" : "#9B2335";

  return `<div class="panel" style="background:${bg}; border-bottom:6px solid ${accent}">
  <span class="panel-num">${idx + 1}</span>
  ${bubble}
  <div class="char-area">${svg}</div>
  <div class="char-name" style="color:${charColor}">${escHtml(panel.character)}</div>
  ${action}
</div>`;
}

function buildHtml(script) {
  const panels  = pickKeyPanels(script.panels);
  const episode = script.episode
    ? `<span class="episode">&mdash; ${escHtml(script.episode)}</span>`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:ital,wght@0,700;1,400&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #F5F0E8; }

.strip {
  width: ${WIDTH}px; height: ${HEIGHT}px;
  display: flex; flex-direction: column;
  padding: 16px 20px 14px; gap: 0;
  font-family: 'Inter', sans-serif;
}

/* ── Header ── */
.header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: 12px; border-bottom: 3px solid #1A1A1A; flex-shrink: 0;
}
.title-row {
  font-family: 'Bangers', cursive;
  font-size: 38px; color: #111; letter-spacing: 1.5px;
  display: flex; align-items: baseline; gap: 10px;
}
.episode { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 400; color: #777; font-style: italic; letter-spacing: 0; }
.header-sub { font-size: 12px; color: #999; font-style: italic; margin-top: 3px; }
.header-handle { font-size: 11px; color: #FF6B00; font-weight: 700; text-align: right; line-height: 1.5; }

/* ── Panel row ── */
.panels-row {
  display: flex; gap: 14px; flex: 1; min-height: 0; padding-top: 14px;
}

.panel {
  flex: 1; border: 3px solid #1A1A1A; border-radius: 10px;
  display: flex; flex-direction: column; align-items: center;
  padding: 14px 12px 10px; position: relative; overflow: hidden;
}
.panel-num {
  position: absolute; top: 7px; left: 10px;
  font-size: 10px; color: #CCC; font-weight: 700; font-family: 'Inter', sans-serif;
}

/* Speech bubble */
.bubble {
  background: white; border: 2.5px solid #1A1A1A; border-radius: 16px;
  padding: 9px 14px;
  font-family: 'Comic Neue', 'Inter', sans-serif;
  font-size: 15px; font-weight: 700; color: #111;
  text-align: center; line-height: 1.35; max-width: 92%;
  position: relative; margin-bottom: 18px; flex-shrink: 0;
  box-shadow: 3px 3px 0 #1A1A1A;
}
.bubble::after {
  content: ''; position: absolute; bottom: -15px; left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent; border-right: 10px solid transparent;
  border-top: 15px solid #1A1A1A;
}
.bubble::before {
  content: ''; position: absolute; bottom: -11px; left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent; border-right: 7px solid transparent;
  border-top: 12px solid white; z-index: 1;
}
.bubble-empty { height: 64px; flex-shrink: 0; }

/* Character */
.char-area {
  flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;
}
.char-area svg { width: 155px; height: 310px; }

.char-name {
  font-size: 11px; font-weight: 800; letter-spacing: 2.5px;
  margin-top: 6px; flex-shrink: 0; font-family: 'Inter', sans-serif;
}

.action {
  font-family: 'Comic Neue', Georgia, serif; font-style: italic;
  font-size: 12px; color: #777;
  text-align: center; margin-top: 5px; line-height: 1.3;
  max-width: 90%; flex-shrink: 0;
}

/* ── Footer ── */
.footer {
  border-top: 3px solid #FF6B00; padding-top: 8px;
  text-align: center; flex-shrink: 0; margin-top: 10px;
}
.footer-text { font-size: 11px; color: #AAA; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="strip">
  <div class="header">
    <div class="header-left">
      <div class="title-row">The Boardroom ${episode}</div>
      <div class="header-sub">Every week in corporate, someone learns the hard way.</div>
    </div>
    <div class="header-handle">@DrevonBullock &bull; Bullock Consulting Group</div>
  </div>
  <div class="panels-row">
    ${panels.map((p, i) => renderPanel(p, i)).join("\n")}
  </div>
  <div class="footer">
    <div class="footer-text">The Boardroom by BCG &bull; AI Automation for Business Owners</div>
  </div>
</div>
</body>
</html>`;
}

export async function renderBoardroom(script) {
  const html = buildHtml(script);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

// ─── INSTAGRAM 4:5 — 1080x1350 — Gemini art + Puppeteer text overlay ─────────
// Gemini generates cartoon character art (no text). Puppeteer overlays
// speech bubbles, title, and footer on top.  4:5 = Instagram's max portrait
// without grid cropping.

import { generateGeminiImage } from "./gemini.js";

const V_WIDTH  = 1080;
const V_HEIGHT = 1350; // 4:5 — Instagram's max portrait without grid cropping

const V_HEADER_H = 105;
const V_FOOTER_H =  60;
const V_ART_H    = V_HEIGHT - V_HEADER_H - V_FOOTER_H; // 1185px
const V_PANEL_H  = Math.floor((V_ART_H - 20) / 3);    // 3 panels + 2×10px gaps ≈ 388px

// Build a Gemini prompt that describes the 3 scenes without mentioning text/bubbles.
function buildScenePrompt(panels) {
  const scenes = panels.map((p, i) => {
    const isSignal = p.character === "SIGNAL";
    const char = isSignal
      ? "SIGNAL: calm, confident young professional in a dark charcoal hoodie. Half-lidded smug eyes, slight smirk. Sitting at a minimal clean modern desk with a glowing laptop."
      : "NOISE: stressed overconfident businessman in a navy blue suit with a red tie. Wide round bulging eyes, round face, slightly stocky. Papers everywhere around him.";
    const mood = isSignal
      ? "relaxed, amused, a little smug"
      : (i === 2 ? "completely shocked — jaw dropped, eyes huge, sweat drop visible" : "overconfident and animated, gesturing with hands");
    const scene = p.action ? p.action : (isSignal ? "calmly working at laptop" : "at cluttered desk with papers");
    return `Panel ${i + 1}: ${char} Mood: ${mood}. Scene: ${scene}.`;
  }).join("\n\n");

  return `Create a 3-panel vertical comic strip illustration for a business humor series. Panels are stacked top to bottom, each panel is a wide landscape rectangle of equal height.

${scenes}

Character design rules (maintain consistency across all panels):
• NOISE always wears navy blue suit + red tie. Always has wide, round, expressive eyes. Slightly round/stocky build.
• SIGNAL always wears a dark charcoal hoodie. Always has a calm, half-lidded expression. Lean and relaxed posture.

Art style: Clean, modern editorial cartoon illustration. Vivid saturated colors. Very expressive character faces and body language. Strong personality contrast between characters. Each panel has a slightly warm white or cream background. Thin dark border line between panels. Professional comic book quality.

CRITICAL REQUIREMENT: Absolutely NO text, NO speech bubbles, NO letters, NO words, NO numbers anywhere in the image. Only the illustrated scenes. The image must be completely free of any written content.`;
}

export async function renderVerticalBoardroom(script) {
  const panels = pickKeyPanels(script.panels);

  // 1 — Gemini generates the cartoon art (no text)
  let artBuffer;
  try {
    artBuffer = await generateGeminiImage(buildScenePrompt(panels));
  } catch (err) {
    console.warn(`[Boardroom] Gemini art failed (${err.message}), falling back to SVG`);
    // fallback: render the horizontal SVG version and return it
    return renderBoardroom(script);
  }

  const artDataUrl = `data:image/png;base64,${artBuffer.toString("base64")}`;
  const episode    = script.episode ? escHtml(script.episode) : "";

  // 2 — Puppeteer overlays title + speech bubbles + footer on top of the art
  const bubblesHtml = panels.map((panel, idx) => {
    if (!panel.dialogue) return "";
    // Position bubble at top of its panel's vertical slice within the art area
    const top = V_HEADER_H + idx * (V_PANEL_H + 10) + 14;
    return `<div class="bubble" style="top:${top}px">${escHtml(panel.dialogue)}</div>`;
  }).join("\n");

  const html = `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${V_WIDTH}px; height: ${V_HEIGHT}px; overflow: hidden; font-family: 'Inter', sans-serif; }

.canvas { width: ${V_WIDTH}px; height: ${V_HEIGHT}px; background: #F5F0E8; display: flex; flex-direction: column; position: relative; }

/* ── Header ── */
.header {
  height: ${V_HEADER_H}px; flex-shrink: 0;
  padding: 14px 22px 12px;
  border-bottom: 3px solid #1A1A1A;
  display: flex; justify-content: space-between; align-items: flex-start;
  background: #F5F0E8; position: relative; z-index: 10;
}
.title {
  font-family: 'Bangers', cursive; font-size: 50px; color: #111; letter-spacing: 2px; line-height: 1;
}
.ep { font-family: 'Inter', sans-serif; font-size: 16px; color: #777; font-style: italic; font-weight: 400; margin-top: 3px; }
.handle { font-size: 12px; color: #FF6B00; font-weight: 700; text-align: right; line-height: 1.5; }

/* ── Gemini art fills middle ── */
.art { flex: 1; position: relative; overflow: hidden; }
.art img { width: 100%; height: 100%; object-fit: fill; display: block; }

/* ── Speech bubbles — absolute over the art ── */
.bubble {
  position: absolute; left: 50%; transform: translateX(-50%);
  width: 82%; background: white;
  border: 2.5px solid #1A1A1A; border-radius: 16px;
  padding: 12px 20px;
  font-family: 'Comic Neue', sans-serif; font-size: 26px; font-weight: 700; color: #111;
  text-align: center; line-height: 1.3; z-index: 20;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.85);
}
.bubble::after {
  content: ''; position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
  border-left: 10px solid transparent; border-right: 10px solid transparent;
  border-top: 14px solid #1A1A1A;
}
.bubble::before {
  content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
  border-left: 7px solid transparent; border-right: 7px solid transparent;
  border-top: 11px solid white; z-index: 1;
}

/* ── Footer ── */
.footer {
  height: ${V_FOOTER_H}px; flex-shrink: 0;
  border-top: 3px solid #FF6B00;
  display: flex; align-items: center; justify-content: center;
  background: #F5F0E8; position: relative; z-index: 10;
}
.footer-text { font-size: 13px; color: #AAA; letter-spacing: 0.5px; }
</style>
</head>
<body>
<div class="canvas">
  <div class="header">
    <div>
      <div class="title">THE BOARDROOM</div>
      ${episode ? `<div class="ep">&mdash; ${episode}</div>` : ""}
    </div>
    <div class="handle">@DrevonBullock<br>Bullock Consulting Group</div>
  </div>
  <div class="art">
    <img src="${artDataUrl}" alt=""/>
    ${bubblesHtml}
  </div>
  <div class="footer">
    <div class="footer-text">The Boardroom by BCG &bull; AI Automation for Business Owners</div>
  </div>
</div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: V_WIDTH, height: V_HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
