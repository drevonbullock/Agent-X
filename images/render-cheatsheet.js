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

function toAlpha(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function buildSectionCard(section, idx) {
  const raw   = section.color;
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(raw) ? raw : "#FF6B00";

  const points = (section.points || []).map((p, i) => `
    <li>
      <span class="pt-dot" style="background:${color}"></span>
      <span class="pt-text">${escHtml(p)}</span>
    </li>`).join("");

  return `<div class="section-card">
    <div class="section-header" style="border-left:5px solid ${color}">
      <span class="section-tag" style="color:${color}">${escHtml(section.heading)}</span>
    </div>
    <ul class="section-pts">${points}</ul>
  </div>`;
}

// ─── LANDSCAPE — 1200×675 ─────────────────────────────────────────────────────
// bgImageBase64: optional Gemini-generated background (base64 PNG string)

function buildHtml(content, bgImageBase64) {
  const sections  = (content.sections || []).map(buildSectionCard).join("\n");
  const colCount  = Math.min(content.sections?.length || 3, 3);
  const bgLayer   = bgImageBase64
    ? `<div class="bg-img" style="background-image:url('data:image/png;base64,${bgImageBase64}')"></div>`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
  background: #080E1C; font-family: 'Space Grotesk', sans-serif;
}

.wrap {
  width: ${WIDTH}px; height: ${HEIGHT}px;
  position: relative; display: flex; flex-direction: column;
  overflow: hidden;
}

/* Background image layer (Gemini art) */
.bg-img {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0.18; filter: saturate(1.4) brightness(0.9);
}

/* Dark overlay gradient on top of bg image */
.bg-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(145deg, rgba(8,14,28,0.96) 0%, rgba(8,14,28,0.88) 50%, rgba(12,20,40,0.95) 100%);
}

/* Content — on top of bg */
.content {
  position: relative; z-index: 2;
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
}

/* Top accent bar */
.accent-bar {
  height: 5px; width: 100%; flex-shrink: 0;
  background: linear-gradient(90deg, #FF6B00 0%, #FF9A50 40%, #FF6B00 100%);
}

/* Header */
.header {
  padding: 20px 48px 14px; flex-shrink: 0;
  display: flex; align-items: flex-end; justify-content: space-between;
}
.title { font-size: 44px; font-weight: 800; color: #fff; letter-spacing: -1px; line-height: 1; }
.subtitle { font-size: 17px; font-weight: 500; color: #FF6B00; margin-top: 6px; }
.header-handle { font-size: 12px; color: #444; font-weight: 600; text-align: right; }

/* Divider */
.divider {
  height: 1.5px; margin: 0 48px; flex-shrink: 0;
  background: linear-gradient(90deg, #FF6B00 0%, rgba(255,107,0,.1) 55%, transparent 100%);
}

/* Section cards */
.sections-row {
  display: grid;
  grid-template-columns: repeat(${colCount}, 1fr);
  gap: 16px; flex: 1; min-height: 0;
  padding: 14px 48px 0;
}

.section-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 18px 20px 16px;
  display: flex; flex-direction: column; gap: 12px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
}

.section-header { padding-left: 12px; }
.section-tag {
  font-size: 17px; font-weight: 700; letter-spacing: -0.2px; line-height: 1.2;
}

.section-pts { list-style: none; display: flex; flex-direction: column; gap: 9px; flex: 1; }
.section-pts li { display: flex; align-items: flex-start; gap: 10px; }

.pt-dot {
  width: 6px; height: 6px; border-radius: 50%;
  flex-shrink: 0; margin-top: 7px;
}
.pt-text { font-size: 13.5px; color: #C8D8EC; line-height: 1.5; font-weight: 400; }

/* Footer */
.footer {
  padding: 0 48px 14px; flex-shrink: 0; margin-top: 10px;
  display: flex; justify-content: center;
}
.footer-text { font-size: 11px; color: #2e3e54; letter-spacing: 0.5px; font-weight: 500; }
</style>
</head>
<body>
<div class="wrap">
  ${bgLayer}
  <div class="bg-overlay"></div>
  <div class="content">
    <div class="accent-bar"></div>
    <div class="header">
      <div>
        <div class="title">${escHtml(content.title || "")}</div>
        <div class="subtitle">${escHtml(content.subtitle || "")}</div>
      </div>
      <div class="header-handle">@DrevonBullock · Bullock Consulting Group</div>
    </div>
    <div class="divider"></div>
    <div class="sections-row">${sections}</div>
    <div class="footer">
      <div class="footer-text">${escHtml(content.footer || "@DrevonBullock • Bullock Consulting Group")}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

export async function renderCheatsheet(content, bgImageBase64) {
  const html = buildHtml(content, bgImageBase64 || null);
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

// ─── INSTAGRAM VERTICAL — 1080×1350 (4:5) ────────────────────────────────────

function buildVerticalSectionCard(section) {
  const raw   = section.color;
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(raw) ? raw : "#FF6B00";
  const points = (section.points || []).map((p, i) => `
    <li>
      <span class="vpt-dot" style="background:${color}"></span>
      <span class="vpt-text">${escHtml(p)}</span>
    </li>`).join("");
  return `<div class="vsection-card">
    <div class="vsection-header" style="border-left:6px solid ${color}">
      <span class="vsection-tag" style="color:${color}">${escHtml(section.heading)}</span>
    </div>
    <ul class="vsection-pts">${points}</ul>
  </div>`;
}

function buildVerticalHtml(content, bgImageBase64) {
  const W = 1080;
  const H = 1350;
  const sections = (content.sections || []).map(buildVerticalSectionCard).join("\n");
  const bgLayer  = bgImageBase64
    ? `<div class="vbg-img" style="background-image:url('data:image/png;base64,${bgImageBase64}')"></div>`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #080E1C; font-family: 'Space Grotesk', sans-serif; }
.vwrap { width: ${W}px; height: ${H}px; position: relative; display: flex; flex-direction: column; overflow: hidden; }
.vbg-img {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0.2; filter: saturate(1.4) brightness(0.9);
}
.vbg-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(8,14,28,0.97) 0%, rgba(8,14,28,0.90) 50%, rgba(12,20,40,0.96) 100%);
}
.vcontent { position: relative; z-index: 2; width: 100%; height: 100%; display: flex; flex-direction: column; }
.vaccent-bar { height: 7px; width: 100%; flex-shrink: 0; background: linear-gradient(90deg, #FF6B00 0%, #FF9A50 40%, #FF6B00 100%); }
.vheader { padding: 36px 56px 24px; flex-shrink: 0; }
.vtitle { font-size: 68px; font-weight: 800; color: #fff; letter-spacing: -2px; line-height: 1; }
.vsubtitle { font-size: 26px; font-weight: 500; color: #FF6B00; margin-top: 10px; }
.vdivider { height: 2px; margin: 0 56px; flex-shrink: 0; background: linear-gradient(90deg, #FF6B00 0%, rgba(255,107,0,.1) 55%, transparent 100%); }
.vsections-col { display: flex; flex-direction: column; gap: 18px; flex: 1; min-height: 0; padding: 20px 56px 0; }
.vsection-card {
  flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 26px 28px 22px;
  display: flex; flex-direction: column; gap: 14px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
}
.vsection-header { padding-left: 14px; }
.vsection-tag { font-size: 26px; font-weight: 700; letter-spacing: -0.3px; }
.vsection-pts { list-style: none; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.vsection-pts li { display: flex; align-items: flex-start; gap: 14px; }
.vpt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 9px; }
.vpt-text { font-size: 20px; color: #C8D8EC; line-height: 1.5; font-weight: 400; }
.vfooter { padding: 0 56px 24px; flex-shrink: 0; margin-top: 14px; display: flex; justify-content: center; }
.vfooter-text { font-size: 16px; color: #2e3e54; letter-spacing: 0.5px; font-weight: 500; }
</style>
</head>
<body>
<div class="vwrap">
  ${bgLayer}
  <div class="vbg-overlay"></div>
  <div class="vcontent">
    <div class="vaccent-bar"></div>
    <div class="vheader">
      <div class="vtitle">${escHtml(content.title || "")}</div>
      <div class="vsubtitle">${escHtml(content.subtitle || "")}</div>
    </div>
    <div class="vdivider"></div>
    <div class="vsections-col">${sections}</div>
    <div class="vfooter"><div class="vfooter-text">${escHtml(content.footer || "@DrevonBullock • Bullock Consulting Group")}</div></div>
  </div>
</div>
</body>
</html>`;
}

export async function renderVerticalCheatsheet(content, bgImageBase64) {
  const html = buildVerticalHtml(content, bgImageBase64 || null);
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
