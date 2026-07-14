import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import puppeteer from "puppeteer";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import supabase from "../supabase/client.js";
import { postCarouselToInstagram } from "../distributors/instagram.js";
import { postCarouselToThreads } from "../distributors/threads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// v2 "Collage Editorial" template (2026-07-13) — navy/orange/cyan reverse-engineering
// of the collage-sticker + brutalist-editorial reference styles. v1 kept for rollback.
const TEMPLATE_PATH = path.resolve(__dirname, "../templates/carousel-template-v2.html");
const STICKER_DIR = path.resolve(__dirname, "../assets/stickers");
const client = new Anthropic();

// Specific topics that generate concrete, save-worthy carousels.
// Exported so index.js can pick one at call time.
// Used instead of the generic AGENT_CONFIG.niche.
export const CAROUSEL_TOPICS = [
  "The 3 workflows every service business should automate before anything else",
  "How to build an AI intake system that books calls while you sleep",
  "Why most businesses lose leads — and the automation that fixes it in one week",
  "What a full AI follow-up sequence looks like for a service business",
  "The real cost of manual tasks: how to calculate what your time is actually worth",
  "AI agents vs AI tools — which one actually grows your business",
  "How to automate your client onboarding from first contact to first call",
  "The 5-minute response rule: why speed matters more than your pitch",
  "How small businesses are competing with larger companies using AI systems",
  "What changes in your business when you remove the 3 biggest manual bottlenecks",
  "The lead follow-up sequence that books 40% more calls without hiring anyone",
  "How to build a business that runs on autopilot while you focus on growth",
];

// ─── TEMPLATE CSS ─────────────────────────────────────────────────────────────
// Always read from the locked template file — never hardcode styles

function loadCss() {
  const html = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!match) throw new Error("Could not extract CSS from carousel-template.html");
  return match[1];
}

// ─── KEYWORD MAP ──────────────────────────────────────────────────────────────

const KEYWORD_MAP = {
  "ai automation":     "AUTOMATE",
  "claude code":       "CLAUDE",
  "make.com":          "MAKE",
  "agentic workflows": "AGENTS",
  "ai tools":          "TOOLS",
};

function pickKeyword(topic) {
  const t = topic.toLowerCase();
  for (const [phrase, kw] of Object.entries(KEYWORD_MAP)) {
    if (t.includes(phrase)) return kw;
  }
  return "AUTOMATE";
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Higgsfield halftone die-cut stickers (assets/stickers/*.png, transparent bg).
// Two distinct picks per carousel run (hook + CTA). Returns data URIs or "".
function pickStickers() {
  try {
    const files = fs.readdirSync(STICKER_DIR).filter((f) => f.endsWith(".png"));
    if (!files.length) return { hook: "", cta: "" };
    const shuffled = [...files].sort(() => Math.random() - 0.5);
    const toUri = (f) =>
      `data:image/png;base64,${fs.readFileSync(path.join(STICKER_DIR, f)).toString("base64")}`;
    return { hook: toUri(shuffled[0]), cta: toUri(shuffled[1] ?? shuffled[0]) };
  } catch {
    return { hook: "", cta: "" };
  }
}

// Headline lines auto-shrink with length so they can never wrap into chaos.
// Returns an inline font-size style for a hook/CTA line.
function fitFont(text, base = 104) {
  const len = String(text ?? "").length;
  const px = len <= 11 ? base : len <= 15 ? Math.round(base * 0.84) : len <= 19 ? Math.round(base * 0.72) : Math.round(base * 0.6);
  return `font-size:${px}px;`;
}

// Irregular 8-point starburst (ref-style) — color via .b-orange/.b-cyan/.b-outline
const BURST_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 2 L59 36 L95 24 L68 52 L92 84 L55 66 L38 98 L36 62 L4 72 L28 46 L8 18 L44 34 Z"/></svg>`;

// Replace all {{PLACEHOLDER}} values in slide HTML.
// Raw keys injected unescaped (already-safe data URIs / SVG).
// All other values are HTML-escaped.
const RAW_KEYS = new Set(["BG_IMAGE_PATH", "ICONS_SVG", "STICKER_HOOK", "STICKER_CTA", "BURST", "LINE1_SIZE", "LINE2_SIZE", "LINE3_SIZE"]);

function fillSlide(slideHtml, vars) {
  let html = slideHtml.replaceAll("{{BURST}}", BURST_SVG);
  for (const [key, val] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, RAW_KEYS.has(key) ? (val ?? "") : escHtml(val));
  }
  return html;
}

// Build a full HTML document using the locked template CSS
function buildPage(css, slideBody) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${css}
</style>
</head>
<body>
${slideBody}
</body>
</html>`;
}

// ─── SLIDE HTML — exact structure from templates/carousel-template.html ───────
// CSS is loaded from the file. HTML structure matches the template exactly.
// Update both the template file AND these strings if the layout ever changes.

const HOOK_SLIDE = `<div class="slide" id="slide" data-type="hook">
  <div class="topo"></div>
  <div class="halftone" style="top:120px;right:0;width:380px;height:300px;"></div>

  <div class="burst b-orange" style="top:170px;right:88px;width:130px;height:130px;transform:rotate(14deg);">{{BURST}}</div>
  <div class="burst b-cyan" style="bottom:420px;right:400px;width:64px;height:64px;transform:rotate(-20deg);">{{BURST}}</div>
  <div class="burst b-outline" style="bottom:130px;left:610px;width:110px;height:110px;transform:rotate(28deg);">{{BURST}}</div>

  <div class="top-row">
    <div class="handle-mono">@drevonbullock.ai</div>
    <div class="tag-chip">{{TOPIC_TAG}}</div>
  </div>

  <div class="note" style="right:110px;top:730px;max-width:330px;"><span class="dot"></span>{{NOTE}}</div>

  <div class="sticker" style="bottom:210px;right:70px;width:330px;transform:rotate(-7deg);">
    <img src="{{STICKER_HOOK}}" alt="">
  </div>

  <div class="hook-flow">
    <div class="hook-stack">
      <div class="hook-line" style="{{LINE1_SIZE}}">{{HEADLINE_LINE1}}</div>
      <div class="hook-line" style="{{LINE2_SIZE}}"><span class="hl">{{HEADLINE_LINE2}}</span></div>
      <div class="hook-line" style="{{LINE3_SIZE}}"><span class="serifit">{{HEADLINE_LINE3}}</span></div>
    </div>
    <div class="hook-sub"><b>What you'll get:</b> {{SUBTEXT}}</div>
    <div class="hook-swipe">SWIPE &#x2192; ALL {{SLIDE_COUNT}} SLIDES</div>
  </div>

  <div class="footer-row">
    <div class="sig">@DrevonBullock &bull; BCG</div>
    <div class="share-save">SHARE &amp; SAVE &#x2197;</div>
  </div>
  <div class="grain"></div>
</div>`;

const CONTENT_SLIDE = `<div class="slide" id="slide" data-type="content">
  <div class="topo"></div>
  <div class="halftone" style="bottom:0;left:0;width:420px;height:260px;"></div>

  <div class="burst b-cyan" style="top:118px;right:210px;width:74px;height:74px;transform:rotate(18deg);">{{BURST}}</div>
  <div class="burst b-outline" style="bottom:96px;right:96px;width:92px;height:92px;transform:rotate(-14deg);">{{BURST}}</div>

  <div class="top-row">
    <div class="handle-mono">@drevonbullock.ai</div>
    <div class="tag-chip">{{SLIDE_TAG}}</div>
  </div>

  <div class="content-head">
    <div class="content-headline">{{HEADLINE}} <span class="serifit">{{HEADLINE_ACCENT}}</span></div>
  </div>

  <div class="rows">
    <div class="row">
      <div class="row-num">01</div>
      <div><div class="row-title"><span class="u">{{POINT_1_TITLE}}</span></div><div class="row-body">{{POINT_1_BODY}}</div></div>
    </div>
    <div class="row">
      <div class="row-num">02</div>
      <div><div class="row-title"><span class="u">{{POINT_2_TITLE}}</span></div><div class="row-body">{{POINT_2_BODY}}</div></div>
    </div>
    <div class="row">
      <div class="row-num">03</div>
      <div><div class="row-title"><span class="u">{{POINT_3_TITLE}}</span></div><div class="row-body">{{POINT_3_BODY}}</div></div>
    </div>
  </div>

  <div class="footer-row">
    <div class="sig">@DrevonBullock &bull; BCG</div>
    <div class="page-num">{{SLIDE_NUM}}</div>
    <div class="share-save">SHARE &amp; SAVE &#x2197;</div>
  </div>
  <div class="grain"></div>
</div>`;

const CTA_SLIDE = `<div class="slide" id="slide" data-type="cta">
  <div class="topo"></div>
  <div class="halftone" style="top:0;right:0;width:440px;height:280px;"></div>

  <div class="burst b-orange" style="top:150px;left:620px;width:96px;height:96px;transform:rotate(-16deg);">{{BURST}}</div>
  <div class="burst b-cyan" style="bottom:480px;right:130px;width:70px;height:70px;transform:rotate(22deg);">{{BURST}}</div>

  <div class="top-row">
    <div class="handle-mono">@drevonbullock.ai</div>
    <div class="tag-chip">{{TOPIC_TAG}}</div>
  </div>

  <div class="sticker" style="top:640px;right:64px;width:270px;transform:rotate(6deg);">
    <img src="{{STICKER_CTA}}" alt="">
  </div>

  <div class="cta-flow">
    <div class="cta-stack">
      <div class="cta-line" style="{{LINE1_SIZE}}">{{CTA_LINE1}}</div>
      <div class="cta-line" style="{{LINE2_SIZE}}"><span class="hl">{{CTA_LINE2}}</span></div>
      <div class="cta-line" style="{{LINE3_SIZE}}"><span class="serifit" style="color:#00D2FF;">{{CTA_LINE3}}</span></div>
    </div>
    <div class="cta-body">{{CTA_BODY}}</div>
    <div class="keyword-card">
      <div class="kc-label">FREE: {{RESOURCE}}</div>
      <div class="kc-line">Comment <span class="kw">&quot;{{KEYWORD}}&quot;</span> and it's yours</div>
    </div>
    <div class="follow-pill">FOLLOW &rarr; @drevonbullock.ai</div>
  </div>

  <div class="footer-row">
    <div class="sig">@DrevonBullock &bull; BCG</div>
    <div class="share-save">SHARE &amp; SAVE &#x2197;</div>
  </div>
  <div class="grain"></div>
</div>`;

// ─── ANIMATED VIDEO COVER (slide 1) ──────────────────────────────────────────
// Renders the hook slide as a 7s Hyperframes MP4 (1080×1350): title lines punch
// in, the orange starburst rotates, the sticker pops and wobbles, the swipe chip
// pulses. IG/Threads get { type: "video", url } as the first carousel child.
// Any failure falls back to the static hook image.

const GSAP_CDN = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`;
const COVER_DUR = 7;

async function renderHookCoverVideo(css, hookBody, ts) {
  const projectSlug = `carousel-cover-${ts}`;
  const projectDir = path.resolve(`video-projects/${projectSlug}`);
  const outputPath = path.resolve(`generated_imgs/${projectSlug}.mp4`);
  fs.mkdirSync(path.join(projectDir, "renders"), { recursive: true });
  fs.mkdirSync("generated_imgs", { recursive: true });

  fs.writeFileSync(path.join(projectDir, "hyperframes.json"), JSON.stringify({
    "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
    "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
    "paths": { "blocks": "compositions", "components": "compositions/components", "assets": "assets" },
  }, null, 2));
  fs.writeFileSync(path.join(projectDir, "meta.json"), JSON.stringify({
    id: projectSlug, name: projectSlug, createdAt: new Date().toISOString(),
  }, null, 2));

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
${css}
html,body{width:1080px;height:1350px;overflow:hidden;background:#0d1830;}
</style></head><body>
<div id="composition" class="clip" data-composition-id="carousel-cover"
  data-start="0" data-width="1080" data-height="1350" data-duration="${COVER_DUR}" data-track-index="0">
${hookBody}
</div>
<script>(() => {
  const tl = gsap.timeline({ paused: true });
  tl.fromTo('.tag-chip',{scale:0,rotation:-10},{scale:1,rotation:2,duration:0.45,ease:'back.out(2)'},0.1);
  tl.fromTo('.hook-line',{y:70,opacity:0},{y:0,opacity:1,duration:0.55,stagger:0.2,ease:'back.out(1.5)'},0.25);
  tl.fromTo('.hook-sub',{opacity:0,y:20},{opacity:1,y:0,duration:0.5,ease:'power2.out'},1.1);
  tl.fromTo('.note',{opacity:0},{opacity:1,duration:0.5,ease:'power2.out'},1.5);
  tl.fromTo('.sticker',{scale:0,rotation:-30},{scale:1,rotation:-7,duration:0.6,ease:'back.out(1.6)'},0.9);
  tl.to('.sticker',{rotation:-2,duration:0.9,yoyo:true,repeat:5,ease:'sine.inOut'},1.6);
  tl.to('.burst.b-orange',{rotation:'+=360',duration:${COVER_DUR - 0.5},ease:'none'},0.5);
  tl.to('.burst.b-cyan',{rotation:'-=200',duration:${COVER_DUR - 1},ease:'none'},1);
  tl.fromTo('.hook-swipe',{opacity:0,x:-30},{opacity:1,x:0,duration:0.45,ease:'back.out(1.6)'},1.4);
  tl.to('.hook-swipe',{scale:1.05,duration:0.55,yoyo:true,repeat:8,ease:'sine.inOut'},1.9);
  tl.to({},{duration:${COVER_DUR}},0);
  window.__timelines = window.__timelines || {};
  window.__timelines['carousel-cover'] = tl;
})();</script></body></html>`;

  fs.writeFileSync(path.join(projectDir, "index.html"), html, "utf8");
  execSync(`npx hyperframes render "${projectDir}" --output "${outputPath}" --quality standard`,
    { cwd: projectDir, stdio: "pipe", timeout: 8 * 60 * 1000 });

  const buf = fs.readFileSync(outputPath);
  const storagePath = `carousels/${ts}/cover.mp4`;
  const { error } = await supabase.storage
    .from("agent-x-videos")
    .upload(storagePath, buf, { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`Cover video upload failed: ${error.message}`);
  const { data } = supabase.storage.from("agent-x-videos").getPublicUrl(storagePath);
  console.log(`[Carousel] Video cover ready (${(buf.length / 1024 / 1024).toFixed(1)} MB): ${data.publicUrl}`);
  return data.publicUrl;
}

// ─── CONTENT GENERATION ───────────────────────────────────────────────────────

async function generateCarouselContent(topic) {
  const keyword = pickKeyword(topic);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are writing content for a LinkedIn carousel post about: "${topic}"

Generate a tight, educational carousel. Respond with valid JSON only — no markdown fences, no explanation.

Required JSON shape:
{
  "topic_tag": "3-4 word uppercase tag (e.g. AI AUTOMATION)",
  "hook": {
    "headline_line1": "first line of headline — strong verb or bold claim (max 5 words)",
    "headline_line2": "second line — continuation or contrast (max 5 words, NEVER empty)",
    "headline_line3": "accent payoff phrase in lowercase — punchy, conversational (max 4 words)",
    "note": "handwritten-style aside in lowercase (max 6 words, e.g. 'save this one for later')",
    "subtext": "1 sentence: what they will learn from this carousel (max 18 words)"
  },
  "slides": [
    {
      "slide_tag": "STEP 01",
      "headline": "slide headline without accent (3-5 words)",
      "headline_accent": "accent phrase appended to headline (1-3 words)",
      "point_1_title": "short card title (3-6 words)",
      "point_1_body": "1-2 sentences of actionable insight (max 22 words)",
      "point_2_title": "short card title (3-6 words)",
      "point_2_body": "1-2 sentences of actionable insight (max 22 words)",
      "point_3_title": "short card title (3-6 words)",
      "point_3_body": "1-2 sentences of actionable insight (max 22 words)"
    }
  ],
  "cta": {
    "cta_line1": "first headline line (max 6 words)",
    "cta_line2": "second headline line (max 6 words)",
    "cta_line3": "accent payoff line (max 5 words)",
    "cta_body": "1 sentence explaining the free resource value (max 20 words)",
    "keyword": "${keyword}",
    "resource": "name of the free resource (e.g. 'The AI Starter Kit')"
  }
}

Rules:
- slides array must have exactly 3 items with slide_tag "STEP 01", "STEP 02", "STEP 03"
- headline_line2 in hook must NEVER be an empty string — always real content
- No em dashes (—), en dashes (–), or pause hyphens
- No filler: "game changer", "revolutionary", "deep dive"
- BCG voice: bold, specific, no hype. Tesla x Jobs x Jung.`,
    }],
  });

  const raw = message.content[0].text.trim();
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("No JSON in carousel response");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc)         { esc = false; continue; }
    if (ch === "\\") { esc = true;  continue; }
    if (ch === '"')  { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return JSON.parse(raw.slice(start, i + 1)); }
  }
  throw new Error("Incomplete JSON in carousel response");
}

// ─── PUPPETEER RENDER ─────────────────────────────────────────────────────────

async function renderSlide(pageHtml, outPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    // networkidle2 allows Google Fonts to load; 20s cap ensures we don't hang
    await page.setContent(pageHtml, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    const buf = await page.screenshot({ type: "png" });
    fs.writeFileSync(outPath, buf);
    return buf;
  } finally {
    await browser.close();
  }
}

// ─── SUPABASE STORAGE UPLOAD ──────────────────────────────────────────────────

async function uploadSlide(buffer, storagePath) {
  const { error } = await supabase.storage
    .from("agent-x-images")
    .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from("agent-x-images").getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─── RENDER — generates content, renders slides, uploads to Storage ───────────
// Returns { imageUrls, caption } — no platform posting

export async function renderCarousel(topic) {
  console.log(`[Carousel] Generating content for: "${topic}"`);
  const content = await generateCarouselContent(topic);
  const css = loadCss();
  const stickers = pickStickers();
  const totalSlides = 1 + content.slides.length + 1; // hook + 3 content + cta
  const ts = Date.now();
  const tmpDir = path.join(os.tmpdir(), `carousel-${ts}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const imageUrls = [];

  const up = (s) => String(s ?? "").toUpperCase();

  // Hook — animated video cover first (Jens-style), static image fallback
  console.log(`[Carousel] Rendering slide 1/${totalSlides} — hook`);
  const hookBody = fillSlide(HOOK_SLIDE, {
    STICKER_HOOK:   stickers.hook,
    TOPIC_TAG:      content.topic_tag,
    LINE1_SIZE:     fitFont(content.hook.headline_line1),
    LINE2_SIZE:     fitFont(content.hook.headline_line2),
    LINE3_SIZE:     fitFont(content.hook.headline_line3, 110),
    HEADLINE_LINE1: up(content.hook.headline_line1),
    HEADLINE_LINE2: up(content.hook.headline_line2),
    HEADLINE_LINE3: content.hook.headline_line3, // serif italic — keep case
    NOTE:           content.hook.note ?? "save this for later",
    SUBTEXT:        content.hook.subtext,
    SLIDE_COUNT:    String(totalSlides),
  });

  let coverDone = false;
  if (process.env.CAROUSEL_VIDEO_COVER !== "false") {
    try {
      const coverUrl = await renderHookCoverVideo(css, hookBody, ts);
      imageUrls.push({ type: "video", url: coverUrl });
      coverDone = true;
    } catch (err) {
      console.warn(`[Carousel] Video cover failed (${String(err.message).slice(0, 120)}) — using static hook image`);
    }
  }

  if (!coverDone) {
    const hookBuf = await renderSlide(buildPage(css, hookBody), path.join(tmpDir, "slide-01.png"));
    imageUrls.push(await uploadSlide(hookBuf, `carousels/${ts}/slide-01.png`));
  }

  // Content slides
  for (let i = 0; i < content.slides.length; i++) {
    const s = content.slides[i];
    const num = i + 2;
    console.log(`[Carousel] Rendering slide ${num}/${totalSlides} — content`);
    const buf = await renderSlide(
      buildPage(css, fillSlide(CONTENT_SLIDE, {
        SLIDE_TAG:       s.slide_tag,
        HEADLINE:        up(s.headline),
        HEADLINE_ACCENT: s.headline_accent, // serif italic — keep case
        POINT_1_TITLE:   s.point_1_title,
        POINT_1_BODY:    s.point_1_body,
        POINT_2_TITLE:   s.point_2_title,
        POINT_2_BODY:    s.point_2_body,
        POINT_3_TITLE:   s.point_3_title,
        POINT_3_BODY:    s.point_3_body,
        SLIDE_NUM:       `${num} / ${totalSlides}`,
      })),
      path.join(tmpDir, `slide-0${num}.png`)
    );
    imageUrls.push(await uploadSlide(buf, `carousels/${ts}/slide-0${num}.png`));
  }

  // CTA
  const ctaNum = totalSlides;
  console.log(`[Carousel] Rendering slide ${ctaNum}/${totalSlides} — cta`);
  const ctaBuf = await renderSlide(
    buildPage(css, fillSlide(CTA_SLIDE, {
      STICKER_CTA:   stickers.cta,
      TOPIC_TAG:     content.topic_tag,
      LINE1_SIZE:    fitFont(content.cta.cta_line1, 92),
      LINE2_SIZE:    fitFont(content.cta.cta_line2, 92),
      LINE3_SIZE:    fitFont(content.cta.cta_line3, 96),
      CTA_LINE1:     up(content.cta.cta_line1),
      CTA_LINE2:     up(content.cta.cta_line2),
      CTA_LINE3:     content.cta.cta_line3, // serif italic — keep case
      CTA_BODY:      content.cta.cta_body,
      KEYWORD:       content.cta.keyword,
      RESOURCE:      content.cta.resource,
    })),
    path.join(tmpDir, `slide-0${ctaNum}.png`)
  );
  imageUrls.push(await uploadSlide(ctaBuf, `carousels/${ts}/slide-0${ctaNum}.png`));

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`[Carousel] ${totalSlides} slides ready.`);
  return { imageUrls, caption: buildCaption(content), content };
}

// ─── POST TO INSTAGRAM ────────────────────────────────────────────────────────

export async function generateAndPostCarousel(topic) {
  const { imageUrls, caption, content } = await renderCarousel(topic);
  console.log(`[Carousel] Posting to Instagram...`);
  const { mediaId, postUrl } = await postCarouselToInstagram(imageUrls, caption);

  const { error } = await supabase.from("posts").insert({
    content: caption,
    platform: "instagram",
    post_type: "carousel",
    hook: `${content.hook.headline_line1} ${content.hook.headline_line3}`.trim().slice(0, 200),
    format: "carousel",
    post_id: mediaId,
    post_url: postUrl,
  });
  if (error) console.warn(`[Carousel] Supabase log failed: ${error.message}`);

  console.log(`[Carousel] Instagram done. ${postUrl}`);
  return { mediaId, postUrl, slideCount: imageUrls.length };
}

// ─── POST TO THREADS ──────────────────────────────────────────────────────────

export async function generateAndPostCarouselToThreads(topic) {
  const { imageUrls, content } = await renderCarousel(topic);
  const caption = await buildThreadsCaption(content);
  console.log(`[Carousel] Threads caption: "${caption}"`);
  console.log(`[Carousel] Posting to Threads...`);
  const { postId, postUrl } = await postCarouselToThreads(imageUrls, caption);

  const { error } = await supabase.from("posts").insert({
    content: caption,
    platform: "threads",
    post_type: "carousel",
    hook: `${content.hook.headline_line1} ${content.hook.headline_line3}`.trim().slice(0, 200),
    format: "carousel",
    post_id: postId,
    post_url: postUrl,
  });
  if (error) console.warn(`[Carousel] Supabase log failed (threads): ${error.message}`);

  console.log(`[Carousel] Threads done. ${postUrl}`);
  return { postId, postUrl, slideCount: imageUrls.length };
}

async function buildThreadsCaption(content) {
  const context = [
    `Hook: ${content.hook.headline_line1} ${content.hook.headline_line2} ${content.hook.headline_line3}`,
    `Subtext: ${content.hook.subtext}`,
    `Slides: ${content.slides.map((s) => s.headline + " " + s.headline_accent).join(" / ")}`,
  ].join("\n");

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    messages: [{
      role: "user",
      content: `Write ONE punchy sentence caption for a Threads carousel post. The carousel covers:\n${context}\n\nRules: no explanation, no hashtags, no quotes, NEVER use em dashes or hyphens as pauses, under 120 chars, reads like a real person texting a sharp take. Just the sentence.`,
    }],
  });
  // Hard voice rule: no em/en dashes ever — rewrite as a comma pause
  return msg.content[0].text.trim().replace(/^["']|["']$/g, "").replace(/\s*[\u2014\u2013]\s*/g, ", ");
}

function buildCaption(content) {
  const h = content.hook;
  const cta = content.cta;
  // First 2 lines are what show before "more" on Instagram — make them count.
  // Subtext is the real hook sentence. Headline words alone don't stop the scroll.
  const firstLine = h.subtext || `${h.headline_line1} ${h.headline_line2}`.trim();
  const secondLine = `Swipe to see all ${1 + content.slides.length + 1} slides.`;

  const lines = [
    firstLine,
    secondLine,
    "",
  ];
  content.slides.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.point_1_title} — ${s.point_1_body}`);
  });
  // Instagram removed hashtag following in Dec 2024 — hashtags no longer drive reach.
  // Caption keywords and saves/DM shares are the top signals now.
  lines.push(
    "",
    `Save this. You'll want to come back to it.`,
    "",
    `Comment "${cta.keyword}" and I'll send you ${cta.resource} straight to your DMs.`,
    "",
    `AI automation. Small business systems. Time back in your week.`
  );
  return lines.join("\n").slice(0, 2200);
}

// ─── CLI TEST ─────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("carousel-generator.js")) {
  const platform = process.argv[2] ?? "instagram";
  const topic = process.argv[3] ?? "AI automation for small businesses";
  const fn = platform === "threads" ? generateAndPostCarouselToThreads : generateAndPostCarousel;
  fn(topic)
    .then(({ postUrl, slideCount }) => console.log(`\n✓ Carousel posted (${slideCount} slides): ${postUrl}`))
    .catch((err) => { console.error("[Carousel] Fatal:", err.message); process.exit(1); });
}
