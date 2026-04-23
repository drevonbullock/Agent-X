import fs from "fs";
import { execSync } from "child_process";

const TOPAZ_BASE = "https://api.topazlabs.com";
const PART_SIZE = 10 * 1024 * 1024; // 10 MB chunks

function ffmpegPath() {
  return process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";
}

function ffprobePath() {
  return process.platform === "linux" ? "/usr/bin/ffprobe" : "/opt/homebrew/bin/ffprobe";
}

// Still image 2× upscale via ffmpeg Lanczos (Topaz Video API is video-only)
export function upscaleImage(inputPath, outputPath) {
  execSync(
    `${ffmpegPath()} -y -i "${inputPath}" -vf "scale=iw*2:ih*2:flags=lanczos" "${outputPath}"`,
    { stdio: "inherit", timeout: 30000 }
  );
  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`[Upscale] Image 2×: ${outputPath} (${sizeMB} MB)`);
}

function getVideoMeta(filePath) {
  const raw = execSync(
    `${ffprobePath()} -v quiet -print_format json -show_streams -show_format "${filePath}"`,
    { encoding: "utf8" }
  );
  const data = JSON.parse(raw);
  const vid = data.streams.find((s) => s.codec_type === "video");
  const [num, den] = vid.r_frame_rate.split("/").map(Number);
  const frameRate = den ? num / den : num;
  const duration = parseFloat(data.format.duration);
  return {
    width:      vid.width,
    height:     vid.height,
    frameRate,
    duration,
    frameCount: Math.round(duration * frameRate),
    size:       parseInt(data.format.size, 10),
  };
}

export async function upscaleWithTopaz(inputPath, outputPath) {
  const apiKey = process.env.TOPAZ_API_KEY;
  if (!apiKey) throw new Error("[Topaz] TOPAZ_API_KEY not set");

  const meta = getVideoMeta(inputPath);
  console.log(`[Topaz] Input: ${meta.width}×${meta.height}, ${meta.duration.toFixed(1)}s, ${meta.frameCount} frames`);
  console.log(`[Topaz] Target: ${meta.width * 2}×${meta.height * 2} (2× Proteus)`);

  const headers = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };

  // 1. Create request
  const createRes = await fetch(`${TOPAZ_BASE}/video/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: {
        resolution: { width: meta.width, height: meta.height },
        container: "mp4",
        size: meta.size,
        duration: meta.duration,
        frameRate: meta.frameRate,
        frameCount: meta.frameCount,
      },
      output: {
        resolution: { width: meta.width * 2, height: meta.height * 2 },
        container: "mp4",
      },
      filters: [{ name: "upscale", model: "proteus", upscale_factor: 2 }],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`[Topaz] Create request failed ${createRes.status}: ${err}`);
  }
  const { requestId } = await createRes.json();
  console.log(`[Topaz] Request ID: ${requestId}`);

  // 2. Accept — receive signed upload URLs
  const acceptRes = await fetch(`${TOPAZ_BASE}/video/${requestId}/accept`, {
    method: "PATCH",
    headers,
  });
  if (!acceptRes.ok) {
    const err = await acceptRes.text();
    throw new Error(`[Topaz] Accept failed ${acceptRes.status}: ${err}`);
  }
  const { uploadUrls } = await acceptRes.json();
  console.log(`[Topaz] Uploading in ${uploadUrls.length} part(s)...`);

  // 3. Upload parts
  const fileBuffer = fs.readFileSync(inputPath);
  const etags = [];
  for (let i = 0; i < uploadUrls.length; i++) {
    const start = i * PART_SIZE;
    const chunk = fileBuffer.slice(start, Math.min(start + PART_SIZE, fileBuffer.length));
    const upRes = await fetch(uploadUrls[i], {
      method: "PUT",
      body: chunk,
      headers: { "Content-Length": String(chunk.length) },
    });
    if (!upRes.ok) throw new Error(`[Topaz] Part ${i + 1} upload failed: ${upRes.status}`);
    etags.push({ partNumber: i + 1, etag: upRes.headers.get("etag") });
    console.log(`[Topaz] Part ${i + 1}/${uploadUrls.length} uploaded`);
  }

  // 4. Complete upload — queue the job
  const completeRes = await fetch(`${TOPAZ_BASE}/video/${requestId}/complete-upload/`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ parts: etags }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.text();
    throw new Error(`[Topaz] Complete upload failed ${completeRes.status}: ${err}`);
  }
  console.log(`[Topaz] Job queued — polling for completion...`);

  // 5. Poll for completion (every 20s, up to 30 min)
  let downloadUrl = null;
  for (let attempt = 0; attempt < 90; attempt++) {
    await new Promise((r) => setTimeout(r, 20000));
    const statusRes = await fetch(`${TOPAZ_BASE}/video/${requestId}/status`, { headers });
    const status = await statusRes.json();
    const pct = status.progress ?? 0;
    console.log(`[Topaz] ${status.status} — ${pct}%`);
    if (status.downloadUrl) { downloadUrl = status.downloadUrl; break; }
    if (status.status === "failed") throw new Error(`[Topaz] Job failed: ${JSON.stringify(status)}`);
  }
  if (!downloadUrl) throw new Error("[Topaz] Timed out (30 min) waiting for upscale");

  // 6. Download
  console.log(`[Topaz] Downloading upscaled video...`);
  const dlRes = await fetch(downloadUrl);
  if (!dlRes.ok) throw new Error(`[Topaz] Download failed: ${dlRes.status}`);
  const buf = Buffer.from(await dlRes.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  console.log(`[Topaz] Saved: ${outputPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
  return outputPath;
}
