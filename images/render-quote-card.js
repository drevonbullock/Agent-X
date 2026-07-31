import { launchBrowser } from "./browser.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQ_BG_PATH = path.resolve(__dirname, "../assets/dre_square_v3.png");

const WIDTH = 1200;
const HEIGHT = 675;

function extractHeroQuote(postText) {
  const clean = postText.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  const firstSentence = clean.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(" ").filter(Boolean);
  return words.slice(0, 12).join(" ");
}

function buildHtml(quote, author, title, handle) {
  // Safe JSON interpolation — no template injection risk
  const q = JSON.stringify(quote);
  const a = JSON.stringify(author);
  const t = JSON.stringify(title);
  const h = JSON.stringify(handle);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }

    .card {
      position: relative;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: linear-gradient(135deg, #0A0A0A 0%, #111111 60%, #1A1008 100%);
    }
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 0% 0%, rgba(255,107,0,0.14) 0%, transparent 55%);
    }
    .accent-bar {
      position: absolute;
      left: 0; top: 0; bottom: 0; width: 8px;
      background: linear-gradient(180deg, #FF8C3A 0%, #FF6B00 100%);
    }
    .bottom-border {
      position: absolute;
      bottom: 0; left: 0; right: 0; height: 4px;
      background: #EA580C;
    }
    .ghost-quote {
      position: absolute;
      top: -60px; left: 28px;
      font-size: 320px; font-weight: 700;
      font-family: Georgia, "Times New Roman", serif;
      color: #FF6B00; opacity: 0.06; line-height: 1;
      user-select: none;
    }
    .quote-area {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 80px 8px;
    }
    .quote-text {
      color: #FFFFFF;
      text-align: center;
      font-weight: 700;
      line-height: 1.25;
      text-shadow: 0 0 40px rgba(255,107,0,0.25);
      max-width: 920px;
      word-break: break-word;
    }
    .bottom-strip {
      position: relative;
      height: 90px;
    }
    .separator {
      position: absolute;
      top: 0; left: 36px; right: 36px; height: 1px;
      background: rgba(255,107,0,0.35);
    }
    .strip-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.5);
    }
    .strip-content {
      position: relative;
      display: flex; align-items: center; justify-content: space-between;
      height: 100%; padding: 0 36px;
    }
    .author-info { display: flex; flex-direction: column; gap: 4px; }
    .author-name { color: #FFFFFF; font-weight: 700; font-size: 22px; }
    .author-title { color: #FF8C3A; font-weight: 400; font-size: 18px; }
    .handle { color: #FF6B00; font-weight: 600; font-size: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="accent-bar"></div>
    <div class="bottom-border"></div>
    <div class="ghost-quote">&ldquo;</div>
    <div class="quote-area">
      <p class="quote-text" id="quote"></p>
    </div>
    <div class="bottom-strip">
      <div class="separator"></div>
      <div class="strip-overlay"></div>
      <div class="strip-content">
        <div class="author-info">
          <span class="author-name" id="author"></span>
          <span class="author-title" id="title"></span>
        </div>
        <span class="handle" id="handle"></span>
      </div>
    </div>
  </div>
  <script>
    document.getElementById("quote").textContent  = ${q};
    document.getElementById("author").textContent = ${a};
    document.getElementById("title").textContent  = ${t};
    document.getElementById("handle").textContent = ${h};

    // Auto-fit font size so quote always fits within the card
    const el = document.getElementById("quote");
    for (let size = 72; size >= 32; size -= 2) {
      el.style.fontSize = size + "px";
      if (el.scrollWidth <= 920 && el.scrollHeight <= 430) break;
    }
  </script>
</body>
</html>`;
}

// ─── INSTAGRAM SQUARE CARD — 1080x1080 ───────────────────────────────────────
// Uses dre_square_v3.png as the background layer.

export async function renderSquareCard(postText, {
  author = "Drevon Bullock",
  title  = "AI Consultant • BCG",
  handle = "@DrevonBullock",
} = {}) {
  const SQ = 1080;
  const quote = extractHeroQuote(postText);

  const bgBase64 = fs.readFileSync(SQ_BG_PATH).toString("base64");
  const bgDataUrl = `data:image/png;base64,${bgBase64}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${SQ}px; height: ${SQ}px; overflow: hidden; }
    .card {
      position: relative; width: ${SQ}px; height: ${SQ}px;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .bg {
      position: absolute; inset: 0;
      background: url("${bgDataUrl}") center/cover no-repeat;
    }
    .overlay {
      position: absolute; inset: 0;
      background: rgba(4, 8, 18, 0.55);
    }
    .accent-left {
      position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
      background: linear-gradient(180deg, #00D2FF 0%, #0099CC 100%);
    }
    .bottom-border {
      position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
      background: #00D2FF;
    }
    .ghost-quote {
      position: absolute; top: -40px; left: 24px;
      font-size: 340px; font-weight: 700;
      font-family: Georgia, serif;
      color: #00D2FF; opacity: 0.07; line-height: 1;
    }
    .quote-area {
      position: relative; flex: 1;
      display: flex; align-items: center; justify-content: center;
      padding: 60px 72px 16px;
    }
    .quote-text {
      color: #FFFFFF; text-align: center; font-weight: 700; line-height: 1.3;
      text-shadow: 0 0 48px rgba(0,210,255,0.2); max-width: 860px; word-break: break-word;
    }
    .bottom-strip {
      position: relative; height: 110px;
    }
    .separator {
      position: absolute; top: 0; left: 32px; right: 32px; height: 1px;
      background: rgba(0,210,255,0.3);
    }
    .strip-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
    .strip-content {
      position: relative; display: flex; align-items: center;
      justify-content: space-between; height: 100%; padding: 0 32px;
    }
    .author-info { display: flex; flex-direction: column; gap: 4px; }
    .author-name { color: #FFFFFF; font-weight: 700; font-size: 24px; }
    .author-title { color: #B4C8DA; font-weight: 400; font-size: 18px; }
    .handle { color: #00D2FF; font-weight: 600; font-size: 22px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bg"></div>
    <div class="overlay"></div>
    <div class="accent-left"></div>
    <div class="bottom-border"></div>
    <div class="ghost-quote">&ldquo;</div>
    <div class="quote-area">
      <p class="quote-text" id="quote"></p>
    </div>
    <div class="bottom-strip">
      <div class="separator"></div>
      <div class="strip-overlay"></div>
      <div class="strip-content">
        <div class="author-info">
          <span class="author-name" id="author"></span>
          <span class="author-title" id="title"></span>
        </div>
        <span class="handle" id="handle"></span>
      </div>
    </div>
  </div>
  <script>
    document.getElementById("quote").textContent  = ${JSON.stringify(quote)};
    document.getElementById("author").textContent = ${JSON.stringify(author)};
    document.getElementById("title").textContent  = ${JSON.stringify(title)};
    document.getElementById("handle").textContent = ${JSON.stringify(handle)};

    const el = document.getElementById("quote");
    for (let size = 80; size >= 32; size -= 2) {
      el.style.fontSize = size + "px";
      if (el.scrollWidth <= 860 && el.scrollHeight <= 580) break;
    }
  </script>
</body>
</html>`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SQ, height: SQ, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

export async function renderQuoteCard(postText, {
  author = "Drevon Bullock",
  title  = "AI Consultant • Bullock Consulting Group",
  handle = "@DrevonBullock",
} = {}) {
  const quote = extractHeroQuote(postText);
  const html  = buildHtml(quote, author, title, handle);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const buffer = await page.screenshot({ type: "png" });
    return buffer;
  } finally {
    await browser.close();
  }
}

// ─── INSTAGRAM VERTICAL CARD — 1080x1350 (4:5) ───────────────────────────────

export async function renderVerticalCard(postText, {
  author = "Drevon Bullock",
  title  = "AI Consultant • BCG",
  handle = "@drevonbullock.ai",
} = {}) {
  const W = 1080;
  const H = 1350;
  const quote = extractHeroQuote(postText);
  const bgBase64 = fs.readFileSync(SQ_BG_PATH).toString("base64");
  const bgDataUrl = `data:image/png;base64,${bgBase64}`;
  const q = JSON.stringify(quote);
  const a = JSON.stringify(author);
  const t = JSON.stringify(title);
  const h = JSON.stringify(handle);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
    .card {
      position: relative; width: ${W}px; height: ${H}px;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .bg { position: absolute; inset: 0; background: url("${bgDataUrl}") center/cover no-repeat; }
    .overlay { position: absolute; inset: 0; background: rgba(4,8,18,0.62); }
    .accent-left {
      position: absolute; left: 0; top: 0; bottom: 0; width: 8px;
      background: linear-gradient(180deg, #00D2FF 0%, #0099CC 100%);
    }
    .bottom-border { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: #00D2FF; }
    .ghost-quote {
      position: absolute; top: -60px; left: 32px;
      font-size: 500px; font-weight: 700; font-family: Georgia, serif;
      color: #00D2FF; opacity: 0.06; line-height: 1;
    }
    .quote-area {
      position: relative; flex: 1;
      display: flex; align-items: center; justify-content: center;
      padding: 80px 80px 30px;
    }
    .quote-text {
      color: #FFF; text-align: center; font-weight: 700; line-height: 1.3;
      text-shadow: 0 0 60px rgba(0,210,255,0.2); word-break: break-word;
    }
    .bottom-strip { position: relative; height: 160px; }
    .separator { position: absolute; top: 0; left: 40px; right: 40px; height: 1px; background: rgba(0,210,255,0.3); }
    .strip-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
    .strip-content {
      position: relative; display: flex; align-items: center;
      justify-content: space-between; height: 100%; padding: 0 44px;
    }
    .author-info { display: flex; flex-direction: column; gap: 6px; }
    .author-name { color: #FFF; font-weight: 700; font-size: 32px; }
    .author-title { color: #B4C8DA; font-size: 24px; }
    .handle { color: #00D2FF; font-weight: 600; font-size: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bg"></div>
    <div class="overlay"></div>
    <div class="accent-left"></div>
    <div class="bottom-border"></div>
    <div class="ghost-quote">&ldquo;</div>
    <div class="quote-area">
      <p class="quote-text" id="quote"></p>
    </div>
    <div class="bottom-strip">
      <div class="separator"></div>
      <div class="strip-overlay"></div>
      <div class="strip-content">
        <div class="author-info">
          <span class="author-name" id="author"></span>
          <span class="author-title" id="title"></span>
        </div>
        <span class="handle" id="handle"></span>
      </div>
    </div>
  </div>
  <script>
    document.getElementById("quote").textContent  = ${q};
    document.getElementById("author").textContent = ${a};
    document.getElementById("title").textContent  = ${t};
    document.getElementById("handle").textContent = ${h};
    const el = document.getElementById("quote");
    for (let size = 110; size >= 42; size -= 4) {
      el.style.fontSize = size + "px";
      if (el.scrollWidth <= 920 && el.scrollHeight <= 1400) break;
    }
  </script>
</body>
</html>`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}
