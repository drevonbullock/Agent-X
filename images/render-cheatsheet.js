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

function buildSectionCard(section) {
  const points = (section.points || [])
    .map(p => `<li>${escHtml(p)}</li>`)
    .join("");
  // color is a CSS hex value from Claude — passed directly into style attr
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(section.color) ? section.color : "#FF6B00";

  return `<div class="section-card" style="border-left-color:${color}">
  <div class="section-heading">${escHtml(section.heading)}</div>
  <ul class="section-points">${points}</ul>
</div>`;
}

function buildHtml(content) {
  const sections = (content.sections || []).map(buildSectionCard).join("\n");

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }

.card {
  width: ${WIDTH}px; height: ${HEIGHT}px;
  background: #1c2433;
  display: flex; flex-direction: column;
  padding: 40px 52px 28px;
  gap: 24px;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  position: relative;
}
.card::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
  background: linear-gradient(180deg, #FF6B00 0%, #FF8C3A 100%);
}

.header { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.title {
  font-size: 36px; font-weight: 800; color: #FFFFFF;
  letter-spacing: -0.5px; line-height: 1.05;
}
.subtitle { font-size: 17px; font-weight: 500; color: #FF6B00; }

.sections-row {
  display: flex; gap: 18px; flex: 1; min-height: 0;
}

.section-card {
  flex: 1; background: #243044;
  border-left: 4px solid #FF6B00;
  border-radius: 6px; padding: 20px 22px;
  display: flex; flex-direction: column; gap: 12px; min-height: 0;
}
.section-heading { font-size: 18px; font-weight: 700; color: #FFFFFF; }
.section-points { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.section-points li {
  font-size: 14px; color: #B0BEC5;
  padding-left: 18px; position: relative; line-height: 1.4;
}
.section-points li::before {
  content: '\\2192';
  position: absolute; left: 0; color: #FF6B00; font-weight: 700; font-size: 13px;
}

.footer { border-top: 2px solid #FF6B00; padding-top: 8px; display: flex; justify-content: center; flex-shrink: 0; }
.footer-text { font-size: 12px; color: #7A8BA0; letter-spacing: 0.3px; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="title">${escHtml(content.title || "")}</div>
    <div class="subtitle">${escHtml(content.subtitle || "")}</div>
  </div>
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
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
