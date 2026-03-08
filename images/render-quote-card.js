import puppeteer from "puppeteer";

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

export async function renderQuoteCard(postText, {
  author = "Drevon Bullock",
  title  = "AI Consultant • Bullock Consulting Group",
  handle = "@DrevonBullock",
} = {}) {
  const quote = extractHeroQuote(postText);
  const html  = buildHtml(quote, author, title, handle);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const buffer = await page.screenshot({ type: "png" });
    return buffer; // Buffer (PNG)
  } finally {
    await browser.close();
  }
}
