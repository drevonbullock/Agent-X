import { launchBrowser } from "./browser.js";

const BRAND_HANDLE = process.env.BRAND_HANDLE ?? "@DrevonBullock";
const BRAND_AUTHOR = process.env.BRAND_AUTHOR ?? "Drevon Bullock";

// ─── EDITORIAL NEWS COVER — v3 (2026-07-14) ──────────────────────────────────
// No more website screenshots. The card is a magazine-style opinion cover
// (Dre's references: "The News" / Campaign ME cards): full-bleed B&W duotone
// photo pulled from the article's og:image, kicker pill, big bold headline
// (og:title), one dek line of crucial info (og:description), quote mark +
// accent bar, brand mark. 1080×1350. Falls back to a textured navy canvas
// when the article has no usable image.

const CARD_W = 1080;
const CARD_H = 1350;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeEntities(s) {
  return String(s ?? "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ").trim();
}

// Headline shrinks with length so it always fits the lower third
function fitHeadline(text) {
  const len = String(text ?? "").length;
  if (len <= 45) return 76;
  if (len <= 70) return 64;
  if (len <= 95) return 55;
  return 48;
}

// ─── SOURCE EXTRACTION — meta tags only, no page render ─────────────────────

function metaContent(html, patterns) {
  for (const p of patterns) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`,
      "i"
    );
    const m = html.match(re);
    if (m) return decodeEntities(m[1] ?? m[2]);
  }
  return null;
}

async function fetchArticleMeta(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (res.status >= 400) {
    throw new Error(`Article returned HTTP ${res.status} — refusing to render an error page`);
  }
  const html = await res.text();

  const title =
    metaContent(html, ["og:title", "twitter:title"]) ||
    decodeEntities((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, "")) ||
    decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""));

  if (!title || /page not found|404|access denied/i.test(title)) {
    throw new Error("No usable headline in article meta — skipping");
  }

  const dek = metaContent(html, ["og:description", "twitter:description", "description"]) ?? "";
  const imageUrl = metaContent(html, ["og:image", "twitter:image"]);

  let imageBase64 = null;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, { headers: { "User-Agent": UA, Referer: url } });
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        if (buf.length > 10_000) {
          const mime = imgRes.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
          imageBase64 = `data:${mime};base64,${buf.toString("base64")}`;
        }
      }
    } catch { /* no image — textured fallback canvas */ }
  }

  // Strip the site name suffix news CMSs append ("Headline | TechCrunch")
  const cleanTitle = title.replace(/\s*[|·–-]\s*[^|·–-]{2,30}$/,
    (m) => (m.length < title.length * 0.4 ? "" : m)).trim();

  return { title: cleanTitle, dek, imageBase64 };
}

// ─── CARD RENDER ─────────────────────────────────────────────────────────────

function buildCardHtml({ title, dek, imageBase64, domain, dateStr }) {
  const headlinePx = fitHeadline(title);
  const dekText = dek.length > 180 ? dek.slice(0, 177).replace(/\s+\S*$/, "") + "…" : dek;

  const photoLayer = imageBase64
    ? `<img class="photo" src="${imageBase64}" alt=""/>`
    : `<div class="photo-fallback"></div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=JetBrains+Mono:wght@500;700&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;font-family:'Space Grotesk',sans-serif;background:#0d1830;}
.canvas{position:relative;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;}
/* Full-bleed B&W duotone photo */
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  filter:grayscale(1) contrast(1.08) brightness(0.92);}
.photo-fallback{position:absolute;inset:0;
  background:radial-gradient(ellipse 90% 60% at 75% 20%,rgba(255,107,0,0.20) 0%,transparent 60%),
  linear-gradient(165deg,#16233c 0%,#0d1830 60%,#0a1226 100%);}
.photo-fallback::after{content:"";position:absolute;inset:0;opacity:0.18;
  background-image:radial-gradient(circle,#FF6B00 1.7px,transparent 2px);background-size:16px 16px;
  -webkit-mask-image:linear-gradient(120deg,transparent 40%,#000 100%);mask-image:linear-gradient(120deg,transparent 40%,#000 100%);}
/* Navy tint + legibility gradient (refs: dark lower third) */
.tint{position:absolute;inset:0;background:rgba(13,24,48,0.28);mix-blend-mode:multiply;}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,
  rgba(10,15,28,0.30) 0%,rgba(10,15,28,0.05) 30%,rgba(10,15,28,0.42) 58%,rgba(8,12,24,0.96) 86%,#080c18 100%);}
.grain{position:absolute;inset:0;opacity:0.10;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E");}
/* Brand mark top-left (refs: the C circle) */
.mark{position:absolute;top:44px;left:52px;z-index:10;width:64px;height:64px;border-radius:16px;
  background:linear-gradient(135deg,#FF6B00,#FF9A50);display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:26px;color:#fff;letter-spacing:-1px;box-shadow:0 8px 24px rgba(0,0,0,0.45);}
/* Date chip top-right */
.date{position:absolute;top:52px;right:52px;z-index:10;font-family:'JetBrains Mono',monospace;
  font-size:17px;font-weight:700;color:#f2ede3;letter-spacing:2px;
  background:rgba(8,12,24,0.55);border:1.5px solid rgba(242,237,227,0.35);padding:9px 16px;border-radius:8px;}
/* Lower-third editorial block (refs 2/3) */
.block{position:absolute;left:52px;right:52px;bottom:120px;z-index:10;display:flex;gap:26px;}
.rail{width:6px;flex-shrink:0;background:#FF6B00;border-radius:3px;
  box-shadow:0 0 18px rgba(255,107,0,0.55);}
.qmark{position:absolute;left:-4px;top:-84px;font-family:'Instrument Serif',serif;font-style:italic;
  font-size:120px;line-height:1;color:#FF6B00;text-shadow:0 4px 20px rgba(0,0,0,0.5);}
.textcol{flex:1;position:relative;}
.kicker{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;
  letter-spacing:3px;color:#0d1830;background:#FF6B00;padding:8px 18px;margin-bottom:22px;}
.headline{font-size:${headlinePx}px;font-weight:800;color:#fff;line-height:1.12;letter-spacing:-1.5px;
  text-shadow:0 4px 26px rgba(0,0,0,0.65);}
.dek{margin-top:20px;font-size:29px;line-height:1.42;color:#dce6f0;font-weight:500;max-width:900px;
  text-shadow:0 2px 14px rgba(0,0,0,0.6);}
/* Footer */
.ftr{position:absolute;left:52px;right:52px;bottom:42px;z-index:10;display:flex;
  align-items:center;justify-content:space-between;}
.by{font-size:17px;font-weight:700;color:#f2ede3;letter-spacing:0.3px;}
.by span{color:#8fa5bd;font-weight:500;}
.via{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:#8fa5bd;letter-spacing:0.5px;}
</style></head><body>
<div class="canvas">
  ${photoLayer}
  <div class="tint"></div>
  <div class="shade"></div>
  <div class="grain"></div>
  <div class="mark">BX</div>
  <div class="date">${escHtml(dateStr)}</div>
  <div class="block">
    <div class="rail"><div class="qmark">&ldquo;</div></div>
    <div class="textcol">
      <div class="kicker">AI NEWS</div>
      <div class="headline">${escHtml(title)}</div>
      ${dekText ? `<div class="dek">${escHtml(dekText)}</div>` : ""}
    </div>
  </div>
  <div class="ftr">
    <div class="by">${escHtml(BRAND_AUTHOR)} <span>&bull; ${escHtml(BRAND_HANDLE)}</span></div>
    <div class="via">via ${escHtml(domain)}</div>
  </div>
</div>
</body></html>`;
}

export async function renderNewsScreenshot(url) {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const { title, dek, imageBase64 } = await fetchArticleMeta(url);

  const dateStr = new Date()
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })
    .toUpperCase();

  const html = buildCardHtml({ title, dek, imageBase64, domain, dateStr });

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CARD_W, height: CARD_H, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 20_000 }).catch(() => {});
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
