import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import supabase from "../supabase/client.js";
import { bestArt } from "../modules/wick-art-library.js";

// ─── RENDER A REEL FROM A REAL POST ──────────────────────────────────────────
// Dre, 2026-08-29: "if you could use both, either combo that saves money and
// keeps high quality then go for it."
//
// THE COMBO, and what each half is actually for:
//   REMOTION   renders the whole reel. Free, deterministic, and the ONLY way to
//              put legible arithmetic on screen — AI video cannot render text,
//              which is why every Wick image prompt bans generated numbers.
//              It Ken-Burns's stills that already passed the identity gate, so
//              character drift is impossible: nothing is generated.
//   OPENROUTER animates ONE ~3s opening shot, and only when a key exists. Real
//              motion where it stops the scroll, ~$1.50 instead of ~$8 a reel.
//              No key, no hero clip, reel still ships.
//
// Source of truth is a wick_posts row, so a reel says exactly what its carousel
// says — same hook, same numbers, same HOW.
//
//   node scripts/wick-render-reel.js                 newest approved post
//   node scripts/wick-render-reel.js --id <uuid>
//   node scripts/wick-render-reel.js --hero          buy the AI opening shot

const VIDEO_DIR = path.join(process.cwd(), "wick-video");
const PUBLIC_DIR = path.join(VIDEO_DIR, "public");
const OUT = path.join(VIDEO_DIR, "out");
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : null; };
const WANT_HERO = process.argv.includes("--hero");

// Pull the dollar figure out of a hook: "YOU ARE LOSING $1,000 A YEAR" -> 1000
const hookAmount = (s) => {
  const m = String(s).match(/\$\s?([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
};
// Any believable number inside an item line, for the beat's counter.
const beatAmount = (it) => {
  const m = `${it.problem} ${it.solution ?? ""}`.match(/\$\s?([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
};

async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${dest}: ${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return dest;
}

// ─── THE PAID GARNISH ────────────────────────────────────────────────────────
// image-to-video: the FIRST FRAME is an already-approved still, so the model
// animates Wick rather than inventing him. That is what keeps a generated clip
// on-model; text-to-video would re-roll the character and drift.
async function heroClip(firstFrameUrl) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { console.log("[Reel] no OPENROUTER_API_KEY — free reel, no hero clip"); return null; }

  const model = process.env.WICK_VIDEO_MODEL || "bytedance/seedance-2.0-mini";
  console.log(`[Reel] hero clip on ${model} (image-to-video, identity locked by the first frame)`);
  const res = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: "Very subtle camera push in. The candle character stays exactly as he is, " +
              "his flame flickers gently. No text, no letters, no numbers anywhere.",
      frame_images: [{ type: "first_frame", image_url: firstFrameUrl }],
    }),
  });
  const job = await res.json();
  if (!res.ok || !job.id) { console.warn(`[Reel] hero clip refused: ${JSON.stringify(job).slice(0, 160)}`); return null; }

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await (await fetch(`https://openrouter.ai/api/v1/videos/${job.id}`,
      { headers: { Authorization: `Bearer ${key}` } })).json();
    if (s.status === "completed") {
      const url = s.video?.url ?? s.url ?? s.output?.[0];
      if (!url) return null;
      const dest = path.join(PUBLIC_DIR, "hero.mp4");
      await download(url, dest);
      console.log("[Reel] hero clip in hand");
      return "hero.mp4";
    }
    if (s.status === "failed") { console.warn("[Reel] hero clip failed, shipping free reel"); return null; }
  }
  console.warn("[Reel] hero clip timed out, shipping free reel");
  return null;
}

async function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const id = arg("id");
  const q = supabase.from("wick_posts").select("id,copy,slide_urls,topic_id,status");
  const { data: post } = id
    ? await q.eq("id", id).maybeSingle()
    : await q.in("status", ["approved", "qa_pending"]).is("pulled_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!post?.copy?.items?.length) throw new Error("no usable post found (need one with items)");

  const c = post.copy;
  console.log(`[Reel] source post ${post.id.slice(0, 8)} — "${c.cover_headline}"`);

  // Backgrounds: the post's OWN slides, so the reel and carousel match. Fall
  // back to clean library art for any slot the post cannot fill.
  const spare = bestArt({ limit: 10 });
  const beats = [];
  for (let i = 0; i < Math.min(4, c.items.length); i++) {
    const it = c.items[i];
    const src = post.slide_urls?.[i + 1] ?? spare[i % spare.length]?.url;
    const local = `beat-${i}.jpg`;
    if (src) await download(src, path.join(PUBLIC_DIR, local));
    beats.push({
      title: String(it.title ?? "").slice(0, 40),
      problem: String(it.problem ?? "").slice(0, 120),
      how: String(it.how ?? it.solution ?? "").slice(0, 90),
      amount: beatAmount(it),
      image: src ? local : "",
    });
  }

  // Hook and closing frames.
  const hookSrc = post.slide_urls?.[0] ?? spare[0]?.url;
  if (hookSrc) await download(hookSrc, path.join(PUBLIC_DIR, "hook.jpg"));
  const closeSrc = post.slide_urls?.[post.slide_urls.length - 1] ?? spare[1]?.url;
  if (closeSrc) await download(closeSrc, path.join(PUBLIC_DIR, "close.jpg"));

  // If the items carry no numbers, distribute the hook's figure so the payoff
  // still adds up rather than showing a column of zeros.
  const hookTotal = hookAmount(c.cover_headline) || 1000;
  if (!beats.some((b) => b.amount > 0)) {
    const each = Math.round(hookTotal / beats.length / 10) * 10;
    beats.forEach((b) => { b.amount = each; });
  }
  const total = beats.reduce((a, b) => a + b.amount, 0) || hookTotal;

  const props = {
    hook: String(c.cover_headline ?? "").replace(/[.,\s]*HERE'?S HOW[.,\s]*$/i, "").trim(),
    beats, total,
    closing: String(c.closing_line ?? "You did not choose it. The default did.").slice(0, 90),
    heroClip: WANT_HERO ? await heroClip(hookSrc) : null,
  };

  const propsFile = path.join(VIDEO_DIR, "props.json");
  fs.writeFileSync(propsFile, JSON.stringify(props, null, 1));

  const outFile = path.join(OUT, `wick-${post.id.slice(0, 8)}.mp4`);
  console.log(`[Reel] rendering ${beats.length} beats → ${outFile}`);
  execFileSync("npx", ["remotion", "render", "src/index.ts", "WickReel", outFile,
    "--props", propsFile, "--codec=h264", "--log=error"],
    { cwd: VIDEO_DIR, stdio: "inherit", timeout: 15 * 60 * 1000 });

  const kb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\n[Reel] done: ${outFile} (${kb}KB)`);
  console.log(`[Reel] Higgsfield credits: 0 | OpenRouter: ${props.heroClip ? "~$1.50 hero clip" : "$0"}`);
  return outFile;
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
