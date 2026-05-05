import fs from "fs";
import path from "path";
import { COMPANY_DOMAINS } from "./fetch-company-logo.js";

export function detectCompanyFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  return Object.keys(COMPANY_DOMAINS).find((k) => lower.includes(k)) ?? null;
}

export async function captureSourceScreenshot(url, outputPath) {
  try {
    const { chromium } = await import("playwright");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });

    try {
      await page.goto(url, { timeout: 15000, waitUntil: "networkidle" });
    } catch {
      await page.goto(url, { timeout: 15000, waitUntil: "domcontentloaded" });
    }

    const isTwitter = url.includes("x.com") || url.includes("twitter.com");

    if (isTwitter) {
      try {
        await page.waitForSelector('article[data-testid="tweet"]', { timeout: 8000 });
        const tweet = await page.$('article[data-testid="tweet"]');
        if (tweet) {
          await tweet.screenshot({ path: outputPath });
          await browser.close();
          console.log(`[Agent X] Screenshot captured: ${outputPath}`);
          return outputPath;
        }
      } catch { /* fall through to full page */ }
    }

    await page.evaluate(() => {
      document.querySelectorAll(
        '[id*="cookie"], [class*="cookie"], [id*="popup"], [class*="modal"], [id*="banner"]'
      ).forEach((el) => el.remove());
    });

    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: 1200, height: 600 },
    });

    await browser.close();
    console.log(`[Agent X] Screenshot captured: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.warn(`[Agent X] Screenshot failed for ${url}: ${err.message}`);
    return null;
  }
}
