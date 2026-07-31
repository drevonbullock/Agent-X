import puppeteer from "puppeteer";

// ─── SHARED PUPPETEER LAUNCHER ───────────────────────────────────────────────
// Chrome's NEW headless mode (headless: true) started hanging on
// Page.captureScreenshot on macOS after a Chrome auto-update (2026-07-31):
// launch and setContent succeed, then the screenshot never returns and the call
// dies on protocolTimeout. The old headless shell renders the same page in ~1s.
//
// Every renderer in this project goes through here so a future Chrome change is
// a one-line fix instead of eight. PUPPETEER_HEADLESS overrides the mode.

const MODES = process.env.PUPPETEER_HEADLESS
  ? [process.env.PUPPETEER_HEADLESS]
  : ["shell", true];

const BASE_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

export async function launchBrowser(extra = {}) {
  let lastErr;
  for (const headless of MODES) {
    try {
      return await puppeteer.launch({
        headless,
        args: [...BASE_ARGS, ...(extra.args ?? [])],
        protocolTimeout: extra.protocolTimeout ?? 120_000,
        ...Object.fromEntries(Object.entries(extra).filter(([k]) => !["args", "protocolTimeout"].includes(k))),
      });
    } catch (err) {
      lastErr = err;
      console.warn(`[Browser] headless=${headless} failed to launch (${String(err.message).slice(0, 80)}) — trying next mode`);
    }
  }
  throw lastErr ?? new Error("No usable headless mode");
}

// Render an HTML string to an image buffer. Retries once in the alternate
// headless mode if the screenshot itself hangs, which is the failure we hit.
export async function renderToImage(html, {
  width, height, deviceScaleFactor = 1,
  type = "jpeg", quality = 90, waitUntil = "networkidle2", timeout = 30_000,
} = {}) {
  let lastErr;
  for (const headless of MODES) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless,
        args: BASE_ARGS,
        protocolTimeout: 120_000,
      });
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor });
      await page.setContent(html, { waitUntil, timeout }).catch(() => {});
      const shot = await page.screenshot(
        type === "png" ? { type: "png" } : { type: "jpeg", quality }
      );
      return Buffer.from(shot);
    } catch (err) {
      lastErr = err;
      console.warn(`[Browser] render failed on headless=${headless}: ${String(err.message).slice(0, 90)}`);
    } finally {
      await browser?.close().catch(() => {});
    }
  }
  throw lastErr;
}
