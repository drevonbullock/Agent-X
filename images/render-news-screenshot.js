import puppeteer from "puppeteer";

const BANNER_H = 60;
const MAX_CONTENT_H = 1350 - BANNER_H; // 1290px content + 60px banner = 1350 total (4:5 Instagram max)

export async function renderNewsScreenshot(url) {
  const domain = new URL(url).hostname.replace(/^www\./, "");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 2400 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Reset scroll so getBoundingClientRect().top === document Y
    await page.evaluate(() => window.scrollTo(0, 0));

    // Remove only junk overlays — keep the site's own header/nav intact
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
      ];
      document.querySelectorAll(JUNK.join(",")).forEach((el) => el.remove());
    });

    await new Promise((r) => setTimeout(r, 300));

    // Find the crop region: y=0 (page top, includes site header) → date/byline bottom
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

      // scrollY=0 so getBCR values are document Y coordinates
      const h1Bot = h1 ? h1.getBoundingClientRect().bottom : 300;

      // Walk date/byline/author elements below the h1
      const DATE_SELECTORS = [
        "time",
        "[class*='publish']", "[class*='date']", "[class*='timestamp']",
        "[class*='byline']",  "[class*='author']", "[class*='meta']",
        "[itemprop='datePublished']", "[itemprop='dateModified']",
      ];

      let contentBottom = h1Bot + 60; // fallback: 60px below h1

      for (const sel of DATE_SELECTORS) {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          // Must be below h1 and within 1500px of h1 bottom
          if (r.bottom > h1Bot && r.top < h1Bot + 1500) {
            contentBottom = Math.max(contentBottom, r.bottom);
          }
        });
      }

      // Find the topmost visible content on the page (site logo / header bar)
      // Scans the header element first, then falls back to any visible body element
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

      return {
        top: topY,
        contentBottom: contentBottom + 48,   // 48px breathing room below date
      };
    });

    const naturalH  = cropInfo.contentBottom - cropInfo.top;
    const contentH  = Math.min(naturalH, MAX_CONTENT_H);
    const bannerTop = cropInfo.top + contentH; // absolute doc Y where banner starts

    // Inject BCG banner at the exact document position (absolute, not fixed)
    await page.evaluate(({ domainName, top }) => {
      const existing = document.getElementById("__bcg_banner__");
      if (existing) existing.remove();

      const banner = document.createElement("div");
      banner.id = "__bcg_banner__";
      banner.style.cssText = [
        "position:absolute",
        `top:${top}px`,
        "left:0",
        "width:100%",
        `height:${60}px`,
        "background:#FF6B00",
        "z-index:2147483647",
        "display:flex",
        "flex-direction:column",
        "justify-content:center",
        "align-items:center",
        "gap:3px",
        "font-family:-apple-system,Helvetica Neue,Arial,sans-serif",
      ].join(";");

      banner.innerHTML = `
        <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:0.3px">
          @DrevonBullock &bull; Bullock Consulting Group LLC
        </span>
        <span style="color:rgba(255,255,255,0.85);font-size:12px">
          Via ${domainName}
        </span>
      `;
      document.body.appendChild(banner);
    }, { domainName: domain, top: bannerTop });

    // Clip exactly the region: headline → date → BCG banner
    return await page.screenshot({
      type: "png",
      fullPage: true,
      clip: {
        x: 0,
        y: cropInfo.top,
        width: 1080,
        height: contentH + BANNER_H,
      },
    });
  } finally {
    await browser.close();
  }
}
