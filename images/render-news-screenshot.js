import puppeteer from "puppeteer";

const BRAND_HANDLE = process.env.BRAND_HANDLE ?? "@DrevonBullock";
const BRAND_AUTHOR = process.env.BRAND_AUTHOR ?? "Drevon Bullock";

// ─── BRANDED NEWS CARD — 1080×1350 (4:5) ─────────────────────────────────────
// v2 redesign: instead of posting a raw article crop with a banner strip, the
// article screenshot is composited inside a browser-window mockup on a dark
// BCG-branded canvas — orange NEWS badge, date, domain URL bar, brand footer.
// Two passes: (1) capture the article crop, (2) render the framed card.

const CARD_W = 1080;
const CARD_H = 1350;
const SHOT_W = 1080;            // article capture viewport width
const MAX_SHOT_H = 1600;        // capture generously; the frame masks overflow

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── PASS 1 — capture the article region (headline → date/byline) ───────────

async function captureArticle(page, url) {
  await page.setViewport({ width: SHOT_W, height: 2400 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
  if (response && response.status() >= 400) {
    throw new Error(`Article returned HTTP ${response.status()} — refusing to screenshot an error page`);
  }
  await new Promise((r) => setTimeout(r, 1200));

  // Soft-404 guard: page loaded 200 but shows an error template
  const looks404 = await page.evaluate(() => {
    const t = (document.querySelector("h1")?.textContent ?? "") + " " + document.title;
    return /page not found|404|doesn.t exist|lost this page/i.test(t);
  });
  if (looks404) throw new Error("Article page looks like a 404 template — skipping");
  await page.evaluate(() => window.scrollTo(0, 0));

  // Remove junk overlays — keep the site's own header/nav intact
  await page.evaluate(() => {
    const JUNK = [
      "[id*='cookie']", "[class*='cookie-banner']", "[class*='cookie-consent']",
      "[id*='consent']", "[class*='consent-banner']",
      "[id*='gdpr']",   "[class*='gdpr']",
      "[id*='paywall']", "[class*='paywall']", "[class*='piano']",
      "[id*='modal']",  "[class*='modal--']",
      "[id*='popup']",  "[class*='popup']",
      "[id*='newsletter']", "[class*='newsletter-modal']",
      "[aria-modal='true']", "[role='dialog']",
      "[class*='advert']", "[id*='advert']", "[class*='ad-slot']", "[class*='ad-container']",
      "[class*='ad-wrapper']", "[data-ad]", "iframe[src*='ads']", "iframe[src*='doubleclick']",
    ];
    document.querySelectorAll(JUNK.join(",")).forEach((el) => el.remove());
    // Collapse empty ad placeholders that reserve big blank space
    document.querySelectorAll("div").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height > 200 && el.children.length === 0 && !el.textContent.trim()) el.remove();
    });
  });
  await new Promise((r) => setTimeout(r, 300));

  const cropInfo = await page.evaluate(() => {
    const H1_SELECTORS = [
      "article h1", "main h1",
      "[class*='article-title']", "[class*='story-title']",
      "[class*='post-title']", "[class*='entry-title']",
      "[class*='headline']", "h1",
    ];
    let h1 = null;
    for (const sel of H1_SELECTORS) {
      h1 = document.querySelector(sel);
      if (h1) break;
    }
    const h1Bot = h1 ? h1.getBoundingClientRect().bottom : 300;
    const headline = h1 ? h1.textContent.trim() : "";

    const DATE_SELECTORS = [
      "time",
      "[class*='publish']", "[class*='date']", "[class*='timestamp']",
      "[class*='byline']",  "[class*='author']", "[class*='meta']",
      "[itemprop='datePublished']", "[itemprop='dateModified']",
    ];
    let contentBottom = h1Bot + 60;
    for (const sel of DATE_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > h1Bot && r.top < h1Bot + 1500) {
          contentBottom = Math.max(contentBottom, r.bottom);
        }
      });
    }

    // Topmost visible content (site logo / header bar)
    let topY = 0;
    const headerEl = document.querySelector("header, [role='banner']");
    const scanRoot = headerEl ?? document.body;
    let minTop = Infinity;
    scanRoot.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height > 5 && r.width > 20 && r.top > 0 && r.top < 500) {
        minTop = Math.min(minTop, r.top);
      }
    });
    topY = minTop === Infinity ? 0 : Math.max(0, minTop - 8);

    return { top: topY, contentBottom: contentBottom + 48, headline };
  });

  const shotH = Math.min(cropInfo.contentBottom - cropInfo.top, MAX_SHOT_H);
  const buffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: cropInfo.top, width: SHOT_W, height: shotH },
  });

  return { buffer, shotH, headline: cropInfo.headline };
}

// ─── PASS 2 — composite the branded card ─────────────────────────────────────

function buildCardHtml({ shotBase64, shotH, domain, dateStr }) {
  // Inner card width ≈ 984 → article shot (1080 wide) scales to ~0.91
  const innerW = 984;
  const scale = innerW / SHOT_W;
  const scaledShotH = Math.round(shotH * scale);
  const maxShotBox = 1064; // px available for the screenshot inside the window

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;font-family:'Space Grotesk',sans-serif;}
.canvas{width:${CARD_W}px;height:${CARD_H}px;position:relative;display:flex;flex-direction:column;
  background:
    radial-gradient(ellipse 90% 55% at 78% -10%, rgba(255,107,0,0.16) 0%, transparent 55%),
    radial-gradient(ellipse 70% 45% at 10% 110%, rgba(0,210,255,0.10) 0%, transparent 55%),
    linear-gradient(165deg,#111e33 0%,#0d1830 45%,#0b1428 100%);
  filter:brightness(1.12);}
.grid{position:absolute;inset:0;opacity:0.05;
  background-image:linear-gradient(rgba(134,167,200,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(134,167,200,0.7) 1px,transparent 1px);
  background-size:44px 44px;}
/* Header */
.hdr{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:34px 44px 24px;flex-shrink:0;}
.hdr-left{display:flex;align-items:center;gap:16px;}
.badge{display:flex;align-items:center;gap:9px;background:#FF6B00;color:#fff;font-weight:800;font-size:21px;
  letter-spacing:2.5px;padding:11px 22px;border-radius:8px;box-shadow:0 0 34px rgba(255,107,0,0.45);}
.badge .dot{width:10px;height:10px;border-radius:50%;background:#fff;animation:none;}
.live{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;color:#86a7c8;letter-spacing:1.5px;}
.hdr-date{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:600;color:#e5e5e5;
  border:1px solid rgba(134,167,200,0.35);border-radius:8px;padding:10px 18px;background:rgba(134,167,200,0.08);}
/* Browser window */
.win-wrap{position:relative;z-index:2;flex:1;padding:0 44px;min-height:0;}
.win{height:100%;display:flex;flex-direction:column;background:#f4f5f7;border-radius:18px;overflow:hidden;
  border:1px solid rgba(134,167,200,0.28);
  box-shadow:0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(255,107,0,0.07);}
.chrome{display:flex;align-items:center;gap:14px;background:#1c2433;padding:14px 20px;flex-shrink:0;}
.lights{display:flex;gap:8px;}
.light{width:14px;height:14px;border-radius:50%;}
.urlbar{flex:1;display:flex;align-items:center;gap:10px;background:#2a3040;border-radius:8px;padding:9px 16px;}
.urlbar .lock{font-size:14px;}
.urlbar .url{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:#a3b8cc;letter-spacing:0.3px;}
.shotbox{position:relative;flex:1;overflow:hidden;background:#fff;}
.shot{display:block;width:${innerW}px;height:${scaledShotH}px;}
${scaledShotH > maxShotBox ? `.fade{position:absolute;left:0;right:0;bottom:0;height:130px;background:linear-gradient(transparent,rgba(244,245,247,0.99) 82%);}` : `.fade{display:none;}`}
/* Footer */
.ftr{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:26px 44px 32px;flex-shrink:0;}
.brand{display:flex;align-items:center;gap:13px;}
.brand-mark{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#FF6B00,#FF9A50);
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#fff;letter-spacing:-1px;}
.brand-lines{display:flex;flex-direction:column;gap:2px;}
.brand-name{font-size:19px;font-weight:700;color:#e5e5e5;letter-spacing:0.2px;}
.brand-sub{font-size:14px;font-weight:500;color:#86a7c8;letter-spacing:0.4px;}
.via{font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:500;color:#5d7288;letter-spacing:0.5px;}
</style></head><body>
<div class="canvas">
  <div class="grid"></div>
  <div class="hdr">
    <div class="hdr-left">
      <div class="badge"><span class="dot"></span>AI&nbsp;NEWS</div>
      <div class="live">// SIGNAL&nbsp;REPORT</div>
    </div>
    <div class="hdr-date">${escHtml(dateStr)}</div>
  </div>
  <div class="win-wrap">
    <div class="win">
      <div class="chrome">
        <div class="lights">
          <span class="light" style="background:#ff5f57"></span>
          <span class="light" style="background:#febc2e"></span>
          <span class="light" style="background:#28c840"></span>
        </div>
        <div class="urlbar"><span class="lock">🔒</span><span class="url">${escHtml(domain)}</span></div>
      </div>
      <div class="shotbox">
        <img class="shot" src="data:image/png;base64,${shotBase64}"/>
        <div class="fade"></div>
      </div>
    </div>
  </div>
  <div class="ftr">
    <div class="brand">
      <div class="brand-mark">BX</div>
      <div class="brand-lines">
        <span class="brand-name">${escHtml(BRAND_AUTHOR)}</span>
        <span class="brand-sub">${escHtml(BRAND_HANDLE)} • Systems that think. Results that speak.</span>
      </div>
    </div>
    <div class="via">via ${escHtml(domain)}</div>
  </div>
</div>
</body></html>`;
}

export async function renderNewsScreenshot(url) {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const { buffer, shotH } = await captureArticle(page, url);

    const dateStr = new Date()
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })
      .toUpperCase();

    const html = buildCardHtml({
      // Puppeteer ≥22 returns Uint8Array — Buffer.from is required for base64
      shotBase64: Buffer.from(buffer).toString("base64"),
      shotH,
      domain,
      dateStr,
    });

    const cardPage = await browser.newPage();
    await cardPage.setViewport({ width: CARD_W, height: CARD_H, deviceScaleFactor: 2 });
    await cardPage.setContent(html, { waitUntil: "networkidle2", timeout: 20_000 }).catch(() => {});
    return await cardPage.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
