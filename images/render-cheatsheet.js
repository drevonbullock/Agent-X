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
// v3 "Glass Infographic" (2026-07-13): frosted-glass section cards over the
// Higgsfield background art + dense electric-infographic chrome — eyebrow +
// ribbon title block, icon header pills, 2×2 point grids, colored tag chips,
// 3-cell footer strip. Reverse-engineered from Dre's two references.

const V_W = 1080;
const V_H = 1350;

// White glyph icons rotated per section (bolt / target / gears)
const SECTION_ICONS = [
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
];

function buildVerticalCard(section, idx) {
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(section.color) ? section.color : "#FF6B00";
  const { r, g, b } = hexToRgb(color);
  const icon = SECTION_ICONS[idx % SECTION_ICONS.length];
  const badge = section.badge ? escHtml(section.badge) : "";

  const pts = section.points || [];
  const gridItems = pts.map(p =>
    `<div class="vcell"><span class="vcheck" style="color:${color};border-color:rgba(${r},${g},${b},0.5);background:rgba(${r},${g},${b},0.12);">✓</span><span>${escHtml(p)}</span></div>`
  ).join("");

  const tags = (section.tags || []).map(t =>
    `<span class="vtag" style="color:#0d1830;background:${color};">${escHtml(t)}</span>`
  ).join("");

  return `<div class="vcard">
  <div class="vcard-hdr">
    <div class="vpill" style="background:rgba(${r},${g},${b},0.16);border:1.5px solid rgba(${r},${g},${b},0.55);">
      <span class="vicon" style="color:${color};">${icon}</span>
      <h3 class="vhead">${escHtml(section.heading)}</h3>
    </div>
    ${badge ? `<span class="vbadge" style="color:${color};">${badge}</span>` : ""}
  </div>
  ${section.what ? `<p class="vwhat">${escHtml(section.what)}</p>` : ""}
  ${gridItems ? `<div class="vgrid">${gridItems}</div>` : ""}
  ${tags ? `<div class="vtag-row">${tags}</div>` : ""}
</div>`;
}

function buildVerticalHtml(content, bgBase64, theme = DEFAULT_THEME) {
  const cards  = (content.sections || []).slice(0, 3).map(buildVerticalCard).join("\n");
  const a = theme.accent, aL = theme.accentLight;
  const { r: br, g: bgc, b: bb } = hexToRgb(theme.bg);
  const bgRgb = `${br},${bgc},${bb}`;
  const bgLayer = bgBase64
    ? `<div class="vbg" style="background-image:url('data:image/png;base64,${bgBase64}')"></div>`
    : "";

  // Title splits: last word becomes the accent word (ref: "GRAPHIC DESIGN")
  const titleWords = String(content.title || "").split(/\s+/).filter(Boolean);
  const accentWord = titleWords.length > 1 ? titleWords.pop() : "";
  const titleMain  = titleWords.join(" ");

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
<link href="${theme.fontLink}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${V_W}px;height:${V_H}px;overflow:hidden;background:${theme.bg};font-family:'${theme.fontHeading}',sans-serif;}
.vwrap{width:${V_W}px;height:${V_H}px;position:relative;display:flex;flex-direction:column;}
/* Background art shows through the glass — much higher presence than v2 */
.vbg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.55;filter:saturate(1.35) brightness(1.15);}
.voverlay{position:absolute;inset:0;background:
  radial-gradient(ellipse 80% 40% at 85% 0%,rgba(0,210,255,0.10) 0%,transparent 60%),
  linear-gradient(165deg,rgba(${bgRgb},0.72) 0%,rgba(${bgRgb},0.55) 50%,rgba(${bgRgb},0.75) 100%);}
/* Halftone dot patches (top-right / bottom-left, ref 2) */
.vdots{position:absolute;pointer-events:none;opacity:0.22;z-index:1;
  background-image:radial-gradient(circle,${a} 1.7px,transparent 2px);background-size:15px 15px;}
.vcontent{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;padding:0 44px;}
/* ── TITLE BLOCK ── */
.veyebrow{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:34px;flex-shrink:0;}
.veyebrow .line{height:3px;width:64px;background:${a};box-shadow:0 0 12px rgba(255,107,0,0.8);}
.veyebrow .line.thin{height:1.5px;width:34px;opacity:0.6;}
.veyebrow-txt{font-family:'${theme.fontMono}',monospace;font-size:20px;font-weight:700;letter-spacing:6px;color:#cfe0ef;}
.vtitle{text-align:center;font-size:86px;font-weight:800;color:#fff;letter-spacing:-2.5px;line-height:1.02;margin-top:10px;flex-shrink:0;
  text-shadow:0 4px 30px rgba(0,0,0,0.6);text-transform:uppercase;}
.vtitle .acc{color:#00D2FF;text-shadow:0 0 40px rgba(0,210,255,0.55);}
.vribbon{align-self:center;margin-top:14px;flex-shrink:0;background:${a};color:#0d1830;
  font-size:26px;font-weight:800;letter-spacing:6px;padding:10px 44px;text-transform:uppercase;
  clip-path:polygon(3% 0,97% 0,100% 50%,97% 100%,3% 100%,0 50%);box-shadow:0 6px 24px rgba(255,107,0,0.35);}
/* ── GLASS CARDS ── */
.vcards{flex:1;display:flex;flex-direction:column;gap:18px;min-height:0;margin-top:24px;}
.vcard{flex:1;display:flex;flex-direction:column;padding:20px 28px;border-radius:22px;min-height:0;
  background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.16);
  backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);
  box-shadow:0 16px 40px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.18);}
.vcard-hdr{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-shrink:0;}
.vpill{display:flex;align-items:center;gap:14px;border-radius:14px;padding:10px 20px;}
.vicon{width:34px;height:34px;flex-shrink:0;display:flex;}
.vicon svg{width:100%;height:100%;}
.vhead{font-size:31px;font-weight:800;letter-spacing:-0.6px;color:#fff;line-height:1;}
.vbadge{font-family:'${theme.fontMono}',monospace;font-size:14px;font-weight:700;letter-spacing:2.5px;flex-shrink:0;}
.vwhat{font-size:21px;color:#dcebf7;line-height:1.35;font-weight:500;margin-top:12px;flex-shrink:0;}
.vgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;margin-top:14px;flex:1;align-content:center;}
.vcell{display:flex;align-items:flex-start;gap:11px;font-size:19.5px;color:#f0f6fc;line-height:1.3;font-weight:500;}
.vcheck{width:26px;height:26px;border-radius:8px;border:1.5px solid;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;margin-top:0;}
.vtag-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;flex-shrink:0;}
.vtag{font-size:14px;font-weight:800;padding:5px 16px;border-radius:6px;letter-spacing:0.5px;}
/* ── FOOTER STRIP (ref 2) ── */
.vfooter{display:flex;align-items:stretch;gap:0;margin:20px 0 26px;flex-shrink:0;border-radius:16px;overflow:hidden;
  background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.14);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
.vf-cell{flex:1;display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 8px;}
.vf-cell + .vf-cell{border-left:1.5px solid rgba(255,255,255,0.12);}
.vf-mark{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,${a},${aL});
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;flex-shrink:0;}
.vf-txt{font-size:16px;font-weight:700;color:#e8f1f9;letter-spacing:0.3px;}
.vf-sub{font-family:'${theme.fontMono}',monospace;font-size:14px;font-weight:500;color:#9fb4c8;letter-spacing:0.5px;}
</style>
</head>
<body>
<div class="vwrap">
  ${bgLayer}
  <div class="voverlay"></div>
  <div class="vdots" style="top:0;right:0;width:340px;height:220px;"></div>
  <div class="vdots" style="bottom:0;left:0;width:300px;height:190px;"></div>
  <div class="vcontent">
    <div class="veyebrow">
      <span class="line thin"></span><span class="line"></span>
      <span class="veyebrow-txt">THE ULTIMATE</span>
      <span class="line"></span><span class="line thin"></span>
    </div>
    <div class="vtitle">${escHtml(titleMain)} ${accentWord ? `<span class="acc">${escHtml(accentWord)}</span>` : ""}</div>
    <div class="vribbon">${escHtml(content.subtitle || "Cheat Sheet")}</div>
    <div class="vcards">${cards}</div>
    <div class="vfooter">
      <div class="vf-cell"><span class="vf-mark">BX</span><span class="vf-txt">${BRAND_HANDLE}</span></div>
      <div class="vf-cell"><span class="vf-sub">Systems that think.</span></div>
      <div class="vf-cell"><span class="vf-sub">Results that speak.</span></div>
    </div>
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
