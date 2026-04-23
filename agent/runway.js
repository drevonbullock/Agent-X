import fs from "fs";
import path from "path";

const RUNWAY_API = "https://api.runwayml.com/v1";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * Generate a short animated clip from a still image using Runway Gen-3.
 * Returns the local filename (e.g. "clip_2_1.mp4") saved to remotion-videos/public/.
 * Throws if RUNWAY_API_KEY is not set or if generation fails.
 */
export async function generateRunwayClip(imageBuffer, prompt, outputFilename, publicDir) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) throw new Error("RUNWAY_API_KEY not set");

  const b64 = imageBuffer.toString("base64");
  const promptImage = `data:image/jpeg;base64,${b64}`;

  // Create image-to-video task
  const createRes = await fetch(`${RUNWAY_API}/image_to_video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: "gen3a_turbo",
      promptImage,
      promptText: prompt,
      duration: 5,
      ratio: "768:1280",
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Runway task create failed (${createRes.status}): ${body}`);
  }

  const { id: taskId } = await createRes.json();
  console.log(`[Runway] Task created: ${taskId}`);

  // Poll until SUCCEEDED or FAILED
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${RUNWAY_API}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!pollRes.ok) continue;
    const task = await pollRes.json();

    if (task.status === "SUCCEEDED") {
      const videoUrl = task.output?.[0];
      if (!videoUrl) throw new Error("Runway task succeeded but output URL missing");

      console.log(`[Runway] Clip ready, downloading...`);
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error(`Runway clip download failed (${videoRes.status})`);

      const buf = Buffer.from(await videoRes.arrayBuffer());
      const outPath = path.join(publicDir, outputFilename);
      fs.writeFileSync(outPath, buf);
      console.log(`[Runway] Saved: ${outputFilename} (${(buf.length / 1024).toFixed(0)} KB)`);
      return outputFilename;
    }

    if (task.status === "FAILED") {
      throw new Error(`Runway task failed: ${task.failure ?? "unknown error"}`);
    }

    console.log(`[Runway] Status: ${task.status} (${task.progress ?? "?"}%)`);
  }

  throw new Error("Runway task timed out after 2 minutes");
}
