import "dotenv/config";
import { generateCinematicVideo } from "./modules/shotstack-enhance.js";
import { postReelToInstagram } from "./distributors/instagram.js";
import { postVideoToThreads } from "./distributors/threads.js";

// Test script — headline + subtext on screen 1, key points on screens 2-4
const TEST_SCRIPT = [
  {
    screen: 1,
    heading: "What separates 6-figure AI consultants from everyone else",
    body: "It's not the tools. It's not the prompts. It's the systems they build.",
  },
  {
    screen: 2,
    heading: "They automate the thinking, not just the tasks",
    body: "Tools react to inputs. Systems anticipate them. One saves minutes. The other replaces roles.",
  },
  {
    screen: 3,
    heading: "Every workflow is a product waiting to be sold",
    body: "If you built it once for yourself, someone will pay for it. That's the whole business model.",
  },
  {
    screen: 4,
    heading: "The leverage is in the architecture",
    body: "One hour of setup. Four hours of saved work every week. Compounding returns on attention.",
  },
];

const CAPTION = `What separates 6-figure AI consultants from everyone else.

It's not the tools. It's the systems.

The leverage is in the architecture.

#AIAutomation #BuildInPublic #AIConsulting`;

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  SHOTSTACK CINEMATIC PIPELINE — FULL TEST ");
  console.log("═══════════════════════════════════════════\n");

  // Step 1: Generate cinematic video via Shotstack
  const { videoUrl, renderId, totalDuration, brollUrls } = await generateCinematicVideo(TEST_SCRIPT);

  console.log(`\n[Test] ✓ Video ready`);
  console.log(`[Test]   Render ID:  ${renderId}`);
  console.log(`[Test]   Duration:   ${totalDuration}s`);
  console.log(`[Test]   Video URL:  ${videoUrl}`);
  console.log(`[Test]   B-roll URLs: ${brollUrls.length} images`);

  const results = { renderId, videoUrl, totalDuration };

  // Step 2: Instagram Reel
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ID) {
    try {
      console.log("\n[Test] Posting Instagram Reel...");
      const { mediaId, postUrl } = await postReelToInstagram(videoUrl, CAPTION);
      results.instagram = { mediaId, postUrl };
      console.log(`[Test] ✓ Instagram Reel live: ${postUrl}`);
    } catch (err) {
      console.error(`[Test] ✗ Instagram failed: ${err.message}`);
      results.instagram = { error: err.message };
    }
  } else {
    console.log("[Test] Instagram skipped — tokens not set");
    results.instagram = { skipped: true };
  }

  // Step 3: Threads video
  if (process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID) {
    try {
      console.log("\n[Test] Posting Threads video...");
      const { postId, postUrl } = await postVideoToThreads(videoUrl, CAPTION);
      results.threads = { postId, postUrl };
      console.log(`[Test] ✓ Threads video live: ${postUrl}`);
    } catch (err) {
      console.error(`[Test] ✗ Threads failed: ${err.message}`);
      results.threads = { error: err.message };
    }
  } else {
    console.log("[Test] Threads skipped — tokens not set");
    results.threads = { skipped: true };
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  RESULTS");
  console.log("═══════════════════════════════════════════");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(`[Test] Fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
