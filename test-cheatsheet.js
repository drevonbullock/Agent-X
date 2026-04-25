import "dotenv/config";
import { writeFileSync } from "fs";
import { generateImage } from "./agent/generate-image.js";

const postText = `MCP vs RAG — here is what the difference actually means for your business and which one you need.

MCP (Model Context Protocol) connects your AI to live tools and real-time data. Your agent can take action.
RAG (Retrieval Augmented Generation) searches a knowledge base and returns relevant chunks. Good for Q&A.

If you want your AI to book appointments, send emails, or update your CRM — that is MCP territory.
If you want your AI to answer questions about your documents or product catalog — that is RAG.
Most businesses need both. But they are not the same thing, and confusing them is why your chatbot feels dumb.`;

console.log("[Test] Running CHEATSHEET mode test...");
const buf = await generateImage(postText);
if (!buf) {
  console.error("[Test] FAILED — generateImage returned null");
  process.exit(1);
}
writeFileSync("test_cheatsheet.png", buf);
console.log("[Test] Saved test_cheatsheet.png ✓");
