import puppeteer from "puppeteer";

const WIDTH  = 1200;
const HEIGHT = 675;

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Map section color → rgba for gradient overlay
function toAlpha(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function buildSectionCard(section, idx) {
  const raw   = section.color;
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(raw) ? raw : "#FF6B00";
  const glow  = toAlpha(color, 0.10);
  const glow2 = toAlpha(color, 0.04);

  const points = (section.points || []).map((p, i) => `
    <li>
      <span class="pt-num" style="background:${color};color:#0B1628">${i + 1}</span>
      <span class="pt-text">${escHtml(p)}</span>
    </li>`).join("");

  return `<div class="section-card" style="
    --c: ${color};
    --glow: ${glow};
    --glow2: ${glow2};
  ">
    <div class="section-tag" style="color:${color}">${escHtml(section.heading)}</div>
    <ul class="section-pts">${points}</ul>
  </div>`;
}

function buildHtml(content) {
  const sections = (content.sections || []).map(buildSectionCard).join("\n");
  const colCount = Math.min(content.sections?.length || 3, 3);

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
  background: #0B1628; font-family: 'Space Grotesk', sans-serif;
}

.wrap {
  width: ${WIDTH}px; height: ${HEIGHT}px;
  background: linear-gradient(145deg, #0D1E38 0%, #0B1628 60%, #0A1420 100%);
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}

/* Geometric background decoration */
.geo {
  position: absolute; right: -80px; top: -80px;
  width: 520px; height: 520px; opacity: 0.045; pointer-events: none;
}

/* Orange top accent bar */
.accent-bar {
  height: 8px; width: 100%; flex-shrink: 0;
  background: linear-gradient(90deg, #FF6B00 0%, #FF9A50 50%, #FF6B00 100%);
}

/* Header */
.header {
  padding: 22px 52px 18px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.title {
  font-size: 46px; font-weight: 800; color: white;
  letter-spacing: -1px; line-height: 1; text-wrap: balance;
}
.subtitle {
  font-size: 18px; font-weight: 500; color: #FF6B00; letter-spacing: 0.2px;
}

/* Divider */
.divider {
  height: 1.5px; margin: 0 52px; flex-shrink: 0;
  background: linear-gradient(90deg, #FF6B00 0%, rgba(255,107,0,0.12) 60%, transparent 100%);
}

/* Section cards row */
.sections-row {
  display: grid;
  grid-template-columns: repeat(${colCount}, 1fr);
  gap: 18px; flex: 1; min-height: 0;
  padding: 18px 52px 0;
}

.section-card {
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,0.07);
  border-left: 4px solid var(--c);
  padding: 22px 24px 20px;
  display: flex; flex-direction: column; gap: 16px; min-height: 0;
  background: linear-gradient(135deg, var(--glow) 0%, var(--glow2) 40%, transparent 70%);
  position: relative; overflow: hidden;
}
.section-card::after {
  content: '';
  position: absolute; right: -30px; bottom: -30px;
  width: 100px; height: 100px; border-radius: 50%;
  background: var(--c); opacity: 0.05;
  pointer-events: none;
}

.section-tag {
  font-size: 19px; font-weight: 700; letter-spacing: -0.2px; line-height: 1.2;
}

.section-pts {
  list-style: none; display: flex; flex-direction: column; gap: 11px; flex: 1;
}

.section-pts li {
  display: flex; align-items: flex-start; gap: 11px;
}

.pt-num {
  width: 23px; height: 23px; border-radius: 50%;
  font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}

.pt-text {
  font-size: 14.5px; color: #C2D4E8; line-height: 1.5; font-weight: 400;
}

/* Footer */
.footer {
  padding: 0 52px 16px; flex-shrink: 0; margin-top: 12px;
  display: flex; justify-content: center;
}
.footer-text { font-size: 12px; color: #3A5070; letter-spacing: 0.5px; font-weight: 500; }
</style>
</head>
<body>
<div class="wrap">
  <svg class="geo" viewBox="0 0 520 520">
    <circle cx="260" cy="260" r="220" fill="none" stroke="white" stroke-width="2"/>
    <circle cx="260" cy="260" r="155" fill="none" stroke="white" stroke-width="1.5"/>
    <circle cx="260" cy="260" r="90" fill="none" stroke="white" stroke-width="1"/>
    <line x1="40" y1="260" x2="480" y2="260" stroke="white" stroke-width="1"/>
    <line x1="260" y1="40" x2="260" y2="480" stroke="white" stroke-width="1"/>
  </svg>

  <div class="accent-bar"></div>

  <div class="header">
    <div class="title">${escHtml(content.title || "")}</div>
    <div class="subtitle">${escHtml(content.subtitle || "")}</div>
  </div>

  <div class="divider"></div>

  <div class="sections-row">${sections}</div>

  <div class="footer">
    <div class="footer-text">${escHtml(content.footer || "@DrevonBullock • Bullock Consulting Group")}</div>
  </div>
</div>
</body>
</html>`;
}

export async function renderCheatsheet(content) {
  const html = buildHtml(content);
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

// ─── INSTAGRAM VERTICAL — 1080x1350 (4:5) ────────────────────────────────────
// Cards stacked vertically with larger fonts — fills the full frame.

function buildVerticalSectionCard(section, idx) {
  const raw   = section.color;
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(raw) ? raw : "#FF6B00";
  const glow  = toAlpha(color, 0.12);
  const glow2 = toAlpha(color, 0.05);
  const points = (section.points || []).map((p, i) => `
    <li>
      <span class="vpt-num" style="background:${color};color:#0B1628">${i + 1}</span>
      <span class="vpt-text">${escHtml(p)}</span>
    </li>`).join("");
  return `<div class="vsection-card" style="--c:${color};--glow:${glow};--glow2:${glow2}">
    <div class="vsection-tag" style="color:${color}">${escHtml(section.heading)}</div>
    <ul class="vsection-pts">${points}</ul>
  </div>`;
}

function buildVerticalHtml(content) {
  const sections = (content.sections || []).map(buildVerticalSectionCard).join("\n");
  const W = 1080;
  const H = 1350;
  const colCount = Math.min(content.sections?.length || 3, 3);
  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #0B1628; font-family: 'Space Grotesk', sans-serif; }
.wrap {
  width: ${W}px; height: ${H}px;
  background: linear-gradient(145deg, #0D1E38 0%, #0B1628 60%, #0A1420 100%);
  display: flex; flex-direction: column; position: relative; overflow: hidden;
}
.geo {
  position: absolute; right: -60px; top: -60px;
  width: 600px; height: 600px; opacity: 0.04; pointer-events: none;
}
.accent-bar { height: 10px; width: 100%; flex-shrink: 0; background: linear-gradient(90deg, #FF6B00 0%, #FF9A50 50%, #FF6B00 100%); }
.header { padding: 36px 56px 26px; flex-shrink: 0; }
.title { font-size: 70px; font-weight: 800; color: white; letter-spacing: -2px; line-height: 1; }
.subtitle { font-size: 26px; font-weight: 500; color: #FF6B00; margin-top: 10px; }
.divider { height: 2px; margin: 0 56px; flex-shrink: 0; background: linear-gradient(90deg, #FF6B00 0%, rgba(255,107,0,0.1) 60%, transparent 100%); }
.vsections-col {
  display: flex; flex-direction: column; gap: 20px; flex: 1; min-height: 0; padding: 22px 56px 0;
}
.vsection-card {
  flex: 1; border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.07);
  border-left: 5px solid var(--c); padding: 28px 30px 24px;
  display: flex; flex-direction: column; gap: 18px; min-height: 0;
  background: linear-gradient(135deg, var(--glow) 0%, var(--glow2) 40%, transparent 70%);
  position: relative; overflow: hidden;
}
.vsection-card::after {
  content: ''; position: absolute; right: -40px; bottom: -40px;
  width: 140px; height: 140px; border-radius: 50%;
  background: var(--c); opacity: 0.05; pointer-events: none;
}
.vsection-tag { font-size: 26px; font-weight: 700; letter-spacing: -0.3px; }
.vsection-pts { list-style: none; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.vsection-pts li { display: flex; align-items: flex-start; gap: 14px; }
.vpt-num {
  width: 30px; height: 30px; border-radius: 50%;
  font-size: 14px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 2px;
}
.vpt-text { font-size: 19px; color: #C2D4E8; line-height: 1.5; font-weight: 400; }
.footer { padding: 0 56px 22px; flex-shrink: 0; margin-top: 14px; display: flex; justify-content: center; }
.footer-text { font-size: 16px; color: #3A5070; letter-spacing: 0.5px; font-weight: 500; }
</style>
</head>
<body>
<div class="wrap">
  <svg class="geo" viewBox="0 0 600 600">
    <circle cx="300" cy="300" r="250" fill="none" stroke="white" stroke-width="2"/>
    <circle cx="300" cy="300" r="180" fill="none" stroke="white" stroke-width="1.5"/>
    <circle cx="300" cy="300" r="110" fill="none" stroke="white" stroke-width="1"/>
    <line x1="50" y1="300" x2="550" y2="300" stroke="white" stroke-width="1"/>
    <line x1="300" y1="50" x2="300" y2="550" stroke="white" stroke-width="1"/>
  </svg>
  <div class="accent-bar"></div>
  <div class="header">
    <div class="title">${escHtml(content.title || "")}</div>
    <div class="subtitle">${escHtml(content.subtitle || "")}</div>
  </div>
  <div class="divider"></div>
  <div class="vsections-col">${sections}</div>
  <div class="footer"><div class="footer-text">${escHtml(content.footer || "@DrevonBullock • Bullock Consulting Group")}</div></div>
</div>
</body>
</html>`;
}

export async function renderVerticalCheatsheet(content) {
  const html = buildVerticalHtml(content);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
