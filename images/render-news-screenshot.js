import { chromium } from "playwright";

export async function renderNewsScreenshot(url) {
  const domain = new URL(url).hostname.replace(/^www\./, "");

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    // Let images and layout settle
    await page.waitForTimeout(800);

    // Inject fixed BCG banner at bottom — on top of everything
    await page.evaluate((domainName) => {
      const existing = document.getElementById("__bcg_banner__");
      if (existing) existing.remove();

      const banner = document.createElement("div");
      banner.id = "__bcg_banner__";
      banner.style.cssText = [
        "position:fixed",
        "bottom:0",
        "left:0",
        "right:0",
        "height:56px",
        "background:#FF6B00",
        "z-index:2147483647",
        "display:flex",
        "flex-direction:column",
        "justify-content:center",
        "align-items:center",
        "gap:2px",
        "font-family:-apple-system,Helvetica Neue,Arial,sans-serif",
      ].join(";");

      banner.innerHTML = `
        <span style="color:#fff;font-size:15px;font-weight:700;letter-spacing:0.3px">
          @DrevonBullock &bull; Bullock Consulting Group LLC
        </span>
        <span style="color:rgba(255,255,255,0.85);font-size:12px">
          Via ${domainName}
        </span>
      `;

      document.body.appendChild(banner);
    }, domain);

    return await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    });
  } finally {
    await browser.close();
  }
}
