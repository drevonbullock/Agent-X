// Headless capture: every frame is drawn by code in Chromium, grabbed, and
// piped into ffmpeg. Deterministic: renderAt(t) is a pure function of time.
//
//   node render.mjs --film test-chessboard                      full video
//   node render.mjs --film test-chessboard --stills 3,15,40     PNG stills only
//   node render.mjs --film test-chessboard --from 10 --to 20    a slice
//   node render.mjs ... --scale 0.5                             fast half-res draft
//   node render.mjs ... --audio films/x/mix.wav                 mux audio
import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FILM = arg("film", "test-chessboard");
const SCALE = +arg("scale", 1);
const W = Math.round(1920 * SCALE / 2) * 2, H = Math.round(1080 * SCALE / 2) * 2;
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUTDIR = path.join(ROOT, "out", FILM);
fs.mkdirSync(OUTDIR, { recursive: true });
// ffmpeg: $FFMPEG, else the pip imageio-ffmpeg static build if present, else PATH
const IMAGEIO_FF = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";
const FFMPEG = process.env.FFMPEG || (fs.existsSync(IMAGEIO_FF) ? IMAGEIO_FF : "ffmpeg");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

// Linux cloud boxes have no GPU -> software GL (slow). On a Mac, use the real GPU.
const browser = await chromium.launch(process.platform === "darwin"
  ? { args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] }
  : { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.log("[page error]", e.message));
await page.goto(`http://localhost:${port}/film.html?film=${FILM}&w=${W}&h=${H}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const { duration, fps } = await page.evaluate(() => window.FILM);

const b64 = (d) => Buffer.from(d.split(",")[1], "base64");
const stills = arg("stills");
if (stills) {
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    const f = path.join(OUTDIR, `still_${String(t).replace(".", "_")}.png`);
    fs.writeFileSync(f, b64(await page.evaluate(() => window.grab("image/png"))));
    console.log("still", f);
  }
} else {
  const from = +arg("from", 0), to = Math.min(+arg("to", duration), duration);
  const n = Math.round((to - from) * fps);
  const silent = path.join(OUTDIR, `video_${from}-${to}${SCALE !== 1 ? `_x${SCALE}` : ""}.mp4`);
  const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", silent], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await page.evaluate((t) => window.renderAt(t), t);
    const buf = b64(await page.evaluate(() => window.grab("image/jpeg", 0.95)));
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 30 === 0) {
      const el = (Date.now() - t0) / 1000, eta = (el / (i + 1)) * (n - i - 1);
      console.log(`frame ${i}/${n}  t=${t.toFixed(2)}s  ${(el / (i + 1)).toFixed(2)}s/frame  eta ${Math.round(eta)}s`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  let final = silent;
  const audio = arg("audio");
  if (audio) {
    final = silent.replace(".mp4", "_final.mp4");
    await new Promise((r) => spawn(FFMPEG, ["-y", "-loglevel", "error", "-i", silent, "-ss", String(from), "-i", audio,
      "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", final], { stdio: "inherit" }).on("close", r));
  }
  console.log("done", final, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
server.close();
