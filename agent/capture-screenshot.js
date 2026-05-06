import fs from "fs";
import path from "path";
import { COMPANY_DOMAINS } from "./fetch-company-logo.js";

export function detectCompanyFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  return Object.keys(COMPANY_DOMAINS).find((k) => lower.includes(k)) ?? null;
}

// Render a clean BCG-branded proof card from headline text.
// Never shows site chrome, nav, paywalls, or ads.
async function renderHeadlineCard(browser, headline, domain, outputPath) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1100, height: 360 });

  const escaped = headline
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Scale font down for long headlines
  const fontSize = headline.length > 110 ? 32 : headline.length > 70 ? 40 : 46;

  await page.setContent(`<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:1100px;height:360px;overflow:hidden;background:#080E1C;
      font-family:'Helvetica Neue',Arial,sans-serif;}
    .card{display:flex;flex-direction:column;justify-content:center;
      padding:44px 56px;height:100%;}
    .source{font-size:19px;font-weight:800;letter-spacing:4px;
      color:#FF6B00;text-transform:uppercase;margin-bottom:18px;}
    .bar{width:64px;height:4px;background:#FF6B00;border-radius:3px;
      margin-bottom:24px;box-shadow:0 0 14px rgba(255,107,0,0.8);}
    .headline{font-size:${fontSize}px;font-weight:900;color:#ffffff;
      line-height:1.25;letter-spacing:-0.3px;}
  </style></head><body>
    <div class="card">
      <div class="source">${domain}</div>
      <div class="bar"></div>
      <div class="headline">${escaped}</div>
    </div>
  </body></html>`);

  await page.screenshot({ path: outputPath });
  await page.close();
}

export async function captureSourceScreenshot(url, outputPath) {
  try {
    const { chromium } = await import("playwright");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 900 });

    // Short timeout — we only need the <head> to load for OG tags
    try {
      await page.goto(url, { timeout: 12000, waitUntil: "domcontentloaded" });
    } catch {
      // Even a partial load may have the head with OG tags
    }

    const domain = (() => {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
    })();

    // ── TWITTER: screenshot the actual tweet card ─────────────────────────────
    const isTwitter = url.includes("x.com") || url.includes("twitter.com");
    if (isTwitter) {
      try {
        await page.waitForSelector('article[data-testid="tweet"]', { timeout: 8000 });
        const tweet = await page.$('article[data-testid="tweet"]');
        if (tweet) {
          await tweet.screenshot({ path: outputPath });
          await browser.close();
          console.log(`[Agent X] Screenshot captured (tweet): ${outputPath}`);
          return outputPath;
        }
      } catch { /* fall through */ }
    }

    // ── EXTRACT HEADLINE — OG tag is most reliable (works through paywalls) ──
    const headline = await page.evaluate(() => {
      // 1. OpenGraph title — in <head>, never blocked by paywalls
      const og = document.querySelector('meta[property="og:title"]');
      if (og) {
        const t = og.getAttribute("content")?.trim();
        if (t && t.length > 15) return t;
      }
      // 2. Twitter card title
      const tw = document.querySelector('meta[name="twitter:title"]');
      if (tw) {
        const t = tw.getAttribute("content")?.trim();
        if (t && t.length > 15) return t;
      }
      // 3. Document title (strip site name after " | " or " - ")
      const docTitle = document.title?.trim();
      if (docTitle) {
        const clean = docTitle.split(/\s[|\-–—]\s/)[0].trim();
        if (clean.length > 15) return clean;
      }
      // 4. Any h1 on the page
      const h1 = document.querySelector("h1");
      if (h1) {
        const t = h1.textContent?.trim();
        if (t && t.length > 15) return t;
      }
      return null;
    });

    if (headline) {
      await renderHeadlineCard(browser, headline, domain, outputPath);
      await browser.close();
      console.log(`[Agent X] Proof card: "${headline.slice(0, 70)}..." → ${outputPath}`);
      return outputPath;
    }

    // ── HARD FALLBACK: if no headline found at all, skip screenshot ──────────
    await browser.close();
    console.log(`[Agent X] No headline found for ${domain} — skipping proof card`);
    return null;
  } catch (err) {
    console.warn(`[Agent X] Screenshot failed for ${url}: ${err.message}`);
    return null;
  }
}
