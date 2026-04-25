import "dotenv/config";
import { writeFileSync } from "fs";
import { renderNewsScreenshot } from "./images/render-news-screenshot.js";
import { generateImage } from "./agent/generate-image.js";

// ── Direct renderer test — no Firecrawl needed ────────────────────────────
console.log("[Test] Rendering news screenshot from known URL...");
try {
  const buf = await renderNewsScreenshot("https://techcrunch.com");
  writeFileSync("test_news_direct.png", buf);
  console.log("[Test] Saved test_news_direct.png ✓");
} catch (err) {
  console.error("[Test] Direct renderer failed:", err.message);
}

// ── Full pipeline test — Claude selects NEWS mode if FIRECRAWL key is set ─
if (!process.env.FIRECRAWL_API_KEY) {
  console.log("[Test] FIRECRAWL_API_KEY not set — skipping full pipeline test.");
  console.log("       Add it to .env and Railway to enable NEWS mode end-to-end.");
  process.exit(0);
}

const postText = `OpenAI just announced their new operator model. This is not a chatbot upgrade.
This is an AI that can take over your computer and complete multi-step tasks on its own.
The question is not whether this will reach small businesses. It will.`;

console.log("[Test] Running NEWS mode pipeline test...");
const buf = await generateImage(postText);
if (!buf) {
  console.log("[Test] generateImage returned null (text-only LinkedIn fallback). That is expected if mode was VISUAL.");
  process.exit(0);
}
writeFileSync("test_news.png", buf);
console.log("[Test] Saved test_news.png ✓");
