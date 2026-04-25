import puppeteer from "puppeteer";

const WIDTH = 1200;
const HEIGHT = 800;

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// SIGNAL — hoodie, half-closed eyes, smug smile. Same every strip.
const SIGNAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 106" width="70" height="106">
  <rect x="0" y="53" width="11" height="38" rx="5" fill="#2D3748"/>
  <rect x="59" y="53" width="11" height="38" rx="5" fill="#2D3748"/>
  <rect x="10" y="51" width="50" height="55" rx="10" fill="#2D3748"/>
  <ellipse cx="35" cy="54" rx="19" ry="9" fill="#374561"/>
  <rect x="22" y="81" width="26" height="18" rx="4" fill="#1A2233"/>
  <circle cx="35" cy="28" r="21" fill="#F4C9A8"/>
  <path d="M14 24 Q16 7 35 7 Q54 7 56 24 Q50 16 35 18 Q20 16 14 24Z" fill="#252525"/>
  <path d="M24 22 Q28 20 32 22" stroke="#252525" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M38 22 Q42 20 46 22" stroke="#252525" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="28" cy="27" rx="3.5" ry="2" fill="#1A1A1A"/>
  <ellipse cx="42" cy="27" rx="3.5" ry="2" fill="#1A1A1A"/>
  <path d="M26 36 Q35 42 44 37" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

// NOISE — suit and tie, wide eyes, open mouth. Same every strip.
const NOISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 106" width="70" height="106">
  <rect x="0" y="53" width="11" height="38" rx="4" fill="#1E3A5F"/>
  <rect x="59" y="53" width="11" height="38" rx="4" fill="#1E3A5F"/>
  <rect x="10" y="51" width="50" height="55" rx="6" fill="#1E3A5F"/>
  <path d="M28 51 L35 73 L42 51Z" fill="#EEEEEE"/>
  <path d="M32 55 L35 77 L38 55Z" fill="#CC2222"/>
  <rect x="32" y="51" width="6" height="7" rx="2" fill="#AA1111"/>
  <circle cx="35" cy="28" r="21" fill="#F2A880"/>
  <path d="M14 22 Q16 7 35 7 Q54 7 56 22 Q50 14 35 16 Q22 14 14 22Z" fill="#3D2B1F"/>
  <path d="M35 7 Q33 12 30 18" stroke="#2A1A10" stroke-width="1.5" fill="none"/>
  <path d="M22 19 Q26 17 31 19" stroke="#3D2B1F" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M39 19 Q44 17 48 19" stroke="#3D2B1F" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="27" cy="27" rx="5" ry="5" fill="white"/>
  <ellipse cx="43" cy="27" rx="5" ry="5" fill="white"/>
  <ellipse cx="27.5" cy="27.5" rx="3" ry="3" fill="#1A1A1A"/>
  <ellipse cx="43.5" cy="27.5" rx="3" ry="3" fill="#1A1A1A"/>
  <path d="M24 38 Q35 46 46 38" stroke="#333" stroke-width="2" fill="#F07070" fill-opacity="0.6" stroke-linecap="round"/>
</svg>`;

function renderPanel(panel, index) {
  const charSvg = panel.character === "SIGNAL" ? SIGNAL_SVG : NOISE_SVG;
  const charClass = panel.character === "SIGNAL" ? "signal" : "noise";

  const bubbleHtml = panel.dialogue
    ? `<div class="bubble-wrap"><div class="bubble">${escHtml(panel.dialogue)}</div></div>`
    : `<div class="bubble-placeholder"></div>`;

  const actionHtml = panel.action
    ? `<div class="action-text">${escHtml(panel.action)}</div>`
    : "";

  return `<div class="panel">
  <span class="panel-num">${index + 1}</span>
  ${bubbleHtml}
  <div class="char-wrap">
    ${charSvg}
    <span class="char-name ${charClass}">${escHtml(panel.character)}</span>
  </div>
  ${actionHtml}
</div>`;
}

function buildHtml(script) {
  const panels = Array.isArray(script.panels) ? script.panels : [];
  const top    = panels.slice(0, 2).map((p, i) => renderPanel(p, i)).join("\n");
  const bottom = panels.slice(2, 5).map((p, i) => renderPanel(p, i + 2)).join("\n");
  const episode = script.episode
    ? `<span class="episode">&mdash; ${escHtml(script.episode)}</span>`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #F5F5F0; }

.strip {
  width: ${WIDTH}px; height: ${HEIGHT}px;
  display: flex; flex-direction: column;
  padding: 14px 18px 10px; gap: 10px;
}

.header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 10px; border-bottom: 2.5px solid #1A1A1A; flex-shrink: 0;
}
.header-left { display: flex; flex-direction: column; gap: 3px; }
.header-title {
  font-size: 28px; font-weight: 700; color: #111;
  font-family: Georgia, "Times New Roman", serif;
  display: flex; align-items: baseline; gap: 10px;
}
.episode { font-size: 14px; font-weight: 400; color: #666; font-style: italic; }
.header-sub { font-size: 12px; color: #777; font-style: italic; font-family: Georgia, serif; }
.header-handle {
  font-size: 11px; color: #FF6B00; font-weight: 700;
  font-family: -apple-system, sans-serif; text-align: right;
}

.row { display: flex; gap: 10px; flex: 1; min-height: 0; }

.panel {
  flex: 1; background: #FFFFFF; border: 2px solid #111; border-radius: 8px;
  display: flex; flex-direction: column; align-items: center;
  justify-content: flex-start; padding: 10px 8px 8px;
  position: relative; overflow: hidden; min-height: 0;
}
.panel-num {
  position: absolute; top: 5px; left: 7px;
  font-size: 9px; color: #CCCCCC; font-family: -apple-system, sans-serif; font-weight: 600;
}

.bubble-wrap { width: 100%; display: flex; justify-content: center; margin-bottom: 12px; flex-shrink: 0; }
.bubble {
  position: relative; background: #FFFFFF; border: 2px solid #111; border-radius: 12px;
  padding: 5px 10px; font-size: 12px; font-weight: 700; color: #111;
  font-family: -apple-system, sans-serif; text-align: center; max-width: 94%; line-height: 1.3;
}
.bubble::after {
  content: ''; position: absolute; bottom: -11px; left: 50%; transform: translateX(-50%);
  border-left: 7px solid transparent; border-right: 7px solid transparent;
  border-top: 11px solid #111;
}
.bubble::before {
  content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
  border-left: 5px solid transparent; border-right: 5px solid transparent;
  border-top: 9px solid #FFFFFF; z-index: 1;
}
.bubble-placeholder { height: 48px; flex-shrink: 0; }

.char-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; }
.char-name { font-size: 10px; font-weight: 800; letter-spacing: 1.5px; font-family: -apple-system, sans-serif; }
.char-name.signal { color: #2D3748; }
.char-name.noise  { color: #9B2335; }

.action-text {
  font-size: 10px; color: #666; font-style: italic;
  font-family: Georgia, serif; text-align: center; margin-top: 5px;
  max-width: 95%; line-height: 1.3;
}

.footer { border-top: 2.5px solid #FF6B00; padding-top: 6px; text-align: center; flex-shrink: 0; }
.footer-text { font-size: 10px; color: #888; font-family: -apple-system, sans-serif; letter-spacing: 0.3px; }
</style>
</head>
<body>
<div class="strip">
  <div class="header">
    <div class="header-left">
      <div class="header-title">The Boardroom ${episode}</div>
      <div class="header-sub">Every week in corporate, someone learns the hard way.</div>
    </div>
    <div class="header-handle">@DrevonBullock &bull; Bullock Consulting Group</div>
  </div>
  <div class="row">${top}</div>
  <div class="row">${bottom}</div>
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
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
