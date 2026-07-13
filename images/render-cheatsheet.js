import puppeteer from "puppeteer";

const BRAND_HANDLE = process.env.BRAND_HANDLE ?? "@DrevonBullock";
const BRAND_NICHE  = process.env.BRAND_NICHE  ?? "AI automation for small businesses";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hexToRgb(hex) {
  const h = /^#[0-9A-Fa-f]{3,6}$/.test(hex) ? hex : "#FF6B00";
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

// Brand default — reproduces the original look exactly when no theme is passed.
const DEFAULT_THEME = {
  accent: "#FF6B00",
  accentLight: "#FF9A50",
  bg: "#060c18",
  fontHeading: "Space Grotesk",
  fontMono: "JetBrains Mono",
  fontLink: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap",
};

// ─── LANDSCAPE — LinkedIn 1200×675 ───────────────────────────────────────────

const L_W = 1200;
const L_H = 675;

function buildLandscapeColumn(section, idx) {
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(section.color) ? section.color : "#FF6B00";
  const { r, g, b } = hexToRgb(color);
  const colorBg  = `rgba(${r},${g},${b},0.10)`;
  const colorBd  = `rgba(${r},${g},${b},0.25)`;
  const num      = String(idx + 1).padStart(2, "0");
  const badge    = section.badge ? `<div class="lbadge" style="color:${color};background:${colorBg};border:1px solid ${colorBd};">${escHtml(section.badge)}</div>` : "";
  const what     = section.what  ? `<p class="lwhat">${escHtml(section.what)}</p>` : "";
  const points   = (section.points || []).map(p =>
    `<li><span class="ldot" style="background:${color}"></span><span class="lptxt">${escHtml(p)}</span></li>`
  ).join("");
  const tags     = (section.tags || []).map(t =>
    `<span class="ltag">${escHtml(t)}</span>`
  ).join("");
  const divider  = idx > 0 ? "border-left:1px solid rgba(255,255,255,0.07);" : "";

  return `<div class="lcol" style="${divider}">
  <div class="lcol-inner" style="border-left:4px solid ${color};">
    <div class="lnum" style="color:${color};">${num}</div>
    ${badge}
    <h3 class="lhead" style="color:${color};">${escHtml(section.heading)}</h3>
    ${what}
    <ul class="llist">${points}</ul>
    ${tags ? `<div class="ltags">${tags}</div>` : ""}
  </div>
</div>`;
}

function buildLandscapeHtml(content, bgBase64, theme = DEFAULT_THEME) {
  const cols   = (content.sections || []).slice(0, 3).map(buildLandscapeColumn).join("\n");
  const a = theme.accent, aL = theme.accentLight;
  const { r: ar, g: ag, b: ab } = hexToRgb(a);
  const { r: br, g: bgc, b: bb } = hexToRgb(theme.bg);
  const bgRgb = `${br},${bgc},${bb}`;
  const bgLayer = bgBase64
    ? `<div class="lbg" style="background-image:url('data:image/png;base64,${bgBase64}')"></div>`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="${theme.fontLink}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${L_W}px;height:${L_H}px;overflow:hidden;background:${theme.bg};font-family:'${theme.fontHeading}',sans-serif;}
.lwrap{width:${L_W}px;height:${L_H}px;position:relative;display:flex;flex-direction:column;}
.lbg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.34;filter:saturate(1.4) brightness(1.1);}
.loverlay{position:absolute;inset:0;background:linear-gradient(140deg,rgba(${bgRgb},0.88) 0%,rgba(${bgRgb},0.78) 100%);}
.lcontent{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;}
.ltopbar{height:5px;flex-shrink:0;background:linear-gradient(90deg,${a},${aL},${a});}
.lhdr{padding:16px 40px 10px;flex-shrink:0;display:flex;align-items:flex-end;justify-content:space-between;}
.ltitle{font-size:46px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1;}
.lsubtitle{font-size:18px;font-weight:600;color:${a};margin-top:5px;}
.lhandle{font-size:12px;color:#6a7e95;font-weight:600;}
.lhr{height:1.5px;margin:0 40px;flex-shrink:0;background:linear-gradient(90deg,${a} 0%,rgba(${ar},${ag},${ab},0.08) 60%,transparent 100%);}
.lcols{flex:1;display:grid;grid-template-columns:repeat(3,1fr);min-height:0;padding:12px 28px 0;}
.lcol{padding:0 8px;display:flex;flex-direction:column;}
.lcol-inner{flex:1;padding:16px 20px 16px 22px;display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.07);}
.lnum{font-family:'${theme.fontMono}',monospace;font-size:12px;font-weight:700;letter-spacing:2px;opacity:0.7;}
.lbadge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:2px;padding:4px 10px;border-radius:4px;width:fit-content;}
.lhead{font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.1;}
.lwhat{font-size:14.5px;color:#6a7e95;line-height:1.4;font-weight:500;}
.llist{list-style:none;display:flex;flex-direction:column;gap:9px;flex:1;}
.llist li{display:flex;align-items:flex-start;gap:9px;}
.ldot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:8px;}
.lptxt{font-size:15px;color:#c4d4e4;line-height:1.4;font-weight:400;}
.ltags{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;}
.ltag{font-size:11px;color:#4a6070;padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);font-weight:600;letter-spacing:0.3px;}
.lfooter{padding:0 40px 11px;flex-shrink:0;display:flex;justify-content:center;}
.lftxt{font-size:11px;color:#5d7288;letter-spacing:0.5px;}
</style>
</head>
<body>
<div class="lwrap">
  ${bgLayer}
  <div class="loverlay"></div>
  <div class="lcontent">
    <div class="ltopbar"></div>
    <div class="lhdr">
      <div>
        <div class="ltitle">${escHtml(content.title || "")}</div>
        <div class="lsubtitle">${escHtml(content.subtitle || "")}</div>
      </div>
      <div class="lhandle">${BRAND_HANDLE}</div>
    </div>
    <div class="lhr"></div>
    <div class="lcols">${cols}</div>
    <div class="lfooter"><div class="lftxt">${BRAND_HANDLE} · ${BRAND_NICHE}</div></div>
  </div>
</div>
</body></html>`;
}

export async function renderCheatsheet(content, bgImageBase64, theme = DEFAULT_THEME) {
  const html    = buildLandscapeHtml(content, bgImageBase64 || null, theme);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: L_W, height: L_H, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

// ─── INSTAGRAM VERTICAL — 1080×1350 ──────────────────────────────────────────
// Redesigned: colored full-width header bar per section, "WHAT IT IS" /
// "WHERE TO USE" sub-labels, 2-column bullet grid — matches reference infographic style.

const V_W = 1080;
const V_H = 1350;

function buildVerticalCard(section, idx) {
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(section.color) ? section.color : "#FF6B00";
  const { r, g, b } = hexToRgb(color);
  const headerBg = `rgba(${r},${g},${b},0.18)`;
  const headerBd = `rgba(${r},${g},${b},0.40)`;
  const num      = String(idx + 1).padStart(2, "0");
  const badge    = section.badge ? escHtml(section.badge) : "";
  const what     = section.what  ? `
  <div class="vsub-section">
    <div class="vsub-label">WHAT IT IS</div>
    <p class="vwhat">${escHtml(section.what)}</p>
  </div>` : "";

  // Split points into 2 columns
  const pts = section.points || [];
  const gridItems = pts.map(p =>
    `<div class="vgrid-item"><span class="vdot" style="background:${color}"></span><span>${escHtml(p)}</span></div>`
  ).join("");

  const tags = (section.tags || []).map(t =>
    `<span class="vtag" style="color:${color};border-color:rgba(${r},${g},${b},0.30);">${escHtml(t)}</span>`
  ).join("");

  const topBorder = idx > 0 ? "border-top:2px solid rgba(255,255,255,0.05);" : "";

  return `<div class="vcard" style="${topBorder}">
  <!-- Colored header bar -->
  <div class="vcard-hdr" style="background:${headerBg};border-bottom:2px solid ${headerBd};border-left:5px solid ${color};">
    <span class="vnum" style="color:${color};">${num}</span>
    ${badge ? `<span class="vbadge" style="color:${color};">● ${badge}</span>` : ""}
    <h3 class="vhead" style="color:#fff;">${escHtml(section.heading)}</h3>
  </div>
  ${what}
  <!-- 2-column bullet grid -->
  ${gridItems ? `<div class="vsub-section vsub-use">
    <div class="vsub-label">WHERE TO USE</div>
    <div class="vgrid">${gridItems}</div>
  </div>` : ""}
  ${tags ? `<div class="vtag-row">${tags}</div>` : ""}
</div>`;
}

function buildVerticalHtml(content, bgBase64, theme = DEFAULT_THEME) {
  const cards  = (content.sections || []).slice(0, 3).map(buildVerticalCard).join("\n");
  const a = theme.accent, aL = theme.accentLight;
  const { r: ar, g: ag, b: ab } = hexToRgb(a);
  const { r: br, g: bgc, b: bb } = hexToRgb(theme.bg);
  const bgRgb = `${br},${bgc},${bb}`;
  const bgLayer = bgBase64
    ? `<div class="vbg" style="background-image:url('data:image/png;base64,${bgBase64}')"></div>`
    : "";

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="${theme.fontLink}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${V_W}px;height:${V_H}px;overflow:hidden;background:${theme.bg};font-family:'${theme.fontHeading}',sans-serif;}
.vwrap{width:${V_W}px;height:${V_H}px;position:relative;display:flex;flex-direction:column;}
.vbg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.34;filter:saturate(1.4) brightness(1.1);}
.voverlay{position:absolute;inset:0;background:linear-gradient(160deg,rgba(${bgRgb},0.88) 0%,rgba(${bgRgb},0.78) 100%);}
.vcontent{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;}
/* Top accent */
.vtopbar{height:7px;flex-shrink:0;background:linear-gradient(90deg,${a},${aL},${a});}
/* Header */
.vhdr{padding:28px 52px 16px;flex-shrink:0;}
.vtitle{font-size:80px;font-weight:800;color:#fff;letter-spacing:-3px;line-height:1;margin-bottom:10px;}
.vsubtitle{font-size:32px;font-weight:600;color:${a};line-height:1.2;}
.vhandle{font-size:16px;color:#6a7e95;font-weight:600;margin-top:8px;}
.vhr{height:2px;margin:0 52px;flex-shrink:0;background:linear-gradient(90deg,${a} 0%,rgba(${ar},${ag},${ab},0.06) 65%,transparent 100%);}
/* Cards */
.vcards{flex:1;display:flex;flex-direction:column;min-height:0;padding:10px 40px 0;}
/* Individual card */
.vcard{flex:1;display:flex;flex-direction:column;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;overflow:hidden;}
/* Colored header bar */
.vcard-hdr{padding:18px 26px;display:flex;align-items:center;gap:14px;flex-shrink:0;}
.vnum{font-family:'${theme.fontMono}',monospace;font-size:15px;font-weight:700;letter-spacing:2px;flex-shrink:0;opacity:0.8;}
.vbadge{font-size:13px;font-weight:800;letter-spacing:2px;flex-shrink:0;}
.vhead{font-size:32px;font-weight:800;letter-spacing:-0.8px;line-height:1.1;}
/* Sub-sections */
.vsub-section{padding:14px 26px;flex-shrink:0;}
.vsub-use{flex:1;}
.vsub-label{font-size:11px;font-weight:800;letter-spacing:2.5px;color:#2e4060;margin-bottom:10px;}
.vwhat{font-size:22px;color:#ddeaf5;line-height:1.4;font-weight:500;}
/* 2-column grid */
.vgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;}
.vgrid-item{display:flex;align-items:flex-start;gap:10px;font-size:20px;color:#eaf2fa;line-height:1.35;font-weight:500;}
.vdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:7px;}
/* Tag row */
.vtag-row{display:flex;flex-wrap:wrap;gap:8px;padding:12px 26px 16px;flex-shrink:0;border-top:1px solid rgba(255,255,255,0.05);}
.vtag{font-size:13px;font-weight:700;padding:6px 16px;border-radius:20px;border:1px solid;letter-spacing:0.3px;}
/* Footer */
.vfooter{padding:0 52px 18px;flex-shrink:0;text-align:center;}
.vftxt{font-size:15px;color:#5d7288;letter-spacing:0.5px;}
</style>
</head>
<body>
<div class="vwrap">
  ${bgLayer}
  <div class="voverlay"></div>
  <div class="vcontent">
    <div class="vtopbar"></div>
    <div class="vhdr">
      <div class="vtitle">${escHtml(content.title || "")}</div>
      <div class="vsubtitle">${escHtml(content.subtitle || "")}</div>
      <div class="vhandle">${BRAND_HANDLE}</div>
    </div>
    <div class="vhr"></div>
    <div class="vcards">${cards}</div>
    <div class="vfooter"><div class="vftxt">${BRAND_HANDLE} · ${BRAND_NICHE}</div></div>
  </div>
</div>
</body></html>`;
}

export async function renderVerticalCheatsheet(content, bgImageBase64, theme = DEFAULT_THEME) {
  const html    = buildVerticalHtml(content, bgImageBase64 || null, theme);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: V_W, height: V_H, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
