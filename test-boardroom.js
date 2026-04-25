import "dotenv/config";
import { writeFileSync } from "fs";
import { generateImage } from "./agent/generate-image.js";

const postText = `Most business owners spend 4 hours manually following up with leads every single day.
They write the same emails. They forget callbacks. They lose deals to response time.
I automated my entire follow-up sequence in one afternoon. It runs while I sleep.
The businesses winning right now aren't bigger. They just have fewer bottlenecks.`;

console.log("[Test] Running BOARDROOM mode test...");
const buf = await generateImage(postText);
if (!buf) {
  console.error("[Test] FAILED — generateImage returned null");
  process.exit(1);
}
writeFileSync("test_boardroom.png", buf);
console.log("[Test] Saved test_boardroom.png ✓");
