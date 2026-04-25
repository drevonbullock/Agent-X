import "dotenv/config";
import { writeFileSync } from "fs";
import { renderBoardroom }       from "./images/render-boardroom.js";
import { renderCheatsheet }      from "./images/render-cheatsheet.js";
import { renderNewsScreenshot }  from "./images/render-news-screenshot.js";
import { renderQuoteCard }       from "./images/render-quote-card.js";

// ── 1. BOARDROOM ─────────────────────────────────────────────────────────────
console.log("[Test] 1/4 — Boardroom renderer...");
const boardroomScript = {
  title: "The Boardroom",
  episode: "The Follow-Up",
  panels: [
    { panel: 1, character: "NOISE",  dialogue: "I follow up with every lead manually. Four hours a day.", action: null },
    { panel: 2, character: "SIGNAL", dialogue: "You manually email every single lead?", action: null },
    { panel: 3, character: "NOISE",  dialogue: "Of course! Personal touch wins deals!", action: null },
    { panel: 4, character: "SIGNAL", dialogue: "My automation sent 200 follow-ups while we talked.", action: null },
    { panel: 5, character: "NOISE",  dialogue: null, action: "Noise stares at his spreadsheet in silence" },
  ],
};
const boardroomBuf = await renderBoardroom(boardroomScript);
writeFileSync("test_boardroom.png", boardroomBuf);
console.log("[Test] ✓ Saved test_boardroom.png");

// ── 2. CHEATSHEET ────────────────────────────────────────────────────────────
console.log("[Test] 2/4 — Cheatsheet renderer...");
const cheatsheetContent = {
  title: "MCP vs RAG",
  subtitle: "Choose the right AI approach for your business",
  sections: [
    {
      heading: "MCP (Model Context Protocol)",
      color: "#FF6B00",
      points: [
        "Connects AI to live tools and real-time data",
        "Your agent can take direct actions",
        "Perfect for booking, emails, CRM updates",
        "Best for: agents that DO things",
      ],
    },
    {
      heading: "RAG (Retrieval Augmented Generation)",
      color: "#00D2FF",
      points: [
        "Searches a knowledge base for relevant info",
        "Returns context chunks to the model",
        "Great for Q&A on docs and product catalogs",
        "Best for: agents that ANSWER things",
      ],
    },
    {
      heading: "Business Reality",
      color: "#22c55e",
      points: [
        "Most businesses need both technologies",
        "They serve completely different purposes",
        "Confusing them is why chatbots feel dumb",
        "Start with the use case, then pick the tool",
      ],
    },
  ],
  footer: "@DrevonBullock • Bullock Consulting Group",
};
const cheatsheetBuf = await renderCheatsheet(cheatsheetContent);
writeFileSync("test_cheatsheet.png", cheatsheetBuf);
console.log("[Test] ✓ Saved test_cheatsheet.png");

// ── 3. NEWS SCREENSHOT ───────────────────────────────────────────────────────
console.log("[Test] 3/4 — News screenshot renderer...");
const newsBuf = await renderNewsScreenshot("https://techcrunch.com/category/artificial-intelligence/");
writeFileSync("test_news.png", newsBuf);
console.log("[Test] ✓ Saved test_news.png");

// ── 4. QUOTE CARD ────────────────────────────────────────────────────────────
console.log("[Test] 4/4 — Quote card renderer...");
const quoteBuf = await renderQuoteCard(
  "The automation isn't the product. The time it gives back is."
);
writeFileSync("test_quote.png", quoteBuf);
console.log("[Test] ✓ Saved test_quote.png");

console.log("\n[Test] All 4 renderers passed.");
