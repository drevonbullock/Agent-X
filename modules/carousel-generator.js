import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import puppeteer from "puppeteer";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import supabase from "../supabase/client.js";
import { postCarouselToInstagram } from "../distributors/instagram.js";
import { postCarouselToThreads } from "../distributors/threads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "../templates/carousel-template.html");
const BG_PATH = path.resolve(__dirname, "../remotion-videos/public/dre_square_v3.png");
const client = new Anthropic();

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

function getBgDataUrl() {
  const buf = fs.readFileSync(BG_PATH);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// Icons SVG for content slides — sized to 80x80 by template CSS
const ICONS_SVG = [
  `<svg viewBox="0 0 24 24" fill="none" stroke="#00D2FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="#00D2FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="#00D2FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
].join("\n");

// Replace all {{PLACEHOLDER}} values in slide HTML.
// BG_IMAGE_PATH and ICONS_SVG injected raw (they're already safe HTML/data URLs).
// All other values are HTML-escaped.
function fillSlide(slideHtml, vars) {
  let html = slideHtml
    .replace(/\{\{BG_IMAGE_PATH\}\}/g, vars.BG_IMAGE_PATH ?? "")
    .replace(/\{\{ICONS_SVG\}\}/g, vars.ICONS_SVG ?? "");

  for (const [key, val] of Object.entries(vars)) {
    if (key === "BG_IMAGE_PATH" || key === "ICONS_SVG") continue;
    html = html.replaceAll(`{{${key}}}`, escHtml(val));
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
  <img class="bg-image" src="{{BG_IMAGE_PATH}}" alt="">
  <div class="bg-gradient"></div>
  <div class="bg-grid"></div>

  <svg class="geo" viewBox="0 0 1080 1080">
    <circle cx="540" cy="540" r="400" fill="none" stroke="#00D2FF" stroke-width="2"/>
    <circle cx="540" cy="540" r="290" fill="none" stroke="#00D2FF" stroke-width="1"/>
    <circle cx="540" cy="540" r="180" fill="none" stroke="#00D2FF" stroke-width="1"/>
    <line x1="140" y1="540" x2="940" y2="540" stroke="#00D2FF" stroke-width="1"/>
    <line x1="540" y1="140" x2="540" y2="940" stroke="#00D2FF" stroke-width="1"/>
  </svg>

  <div class="vignette"></div>
  <div class="bracket btl"></div>
  <div class="bracket btr"></div>
  <div class="bracket bbl"></div>
  <div class="bracket bbr"></div>

  <div class="hook-content">
    <div class="topic-tag">{{TOPIC_TAG}}</div>
    <div class="hook-headline">{{HEADLINE_LINE1}}<br>{{HEADLINE_LINE2}}<br><span class="accent">{{HEADLINE_LINE3}}</span></div>
    <div class="hook-divider"></div>
    <div class="hook-sub">{{SUBTEXT}}</div>
    <div class="swipe-cta">Swipe to see all {{SLIDE_COUNT}} &nbsp;&#x203A;</div>
  </div>

  <div class="footer">
    <div class="signature">D R E &apos; V O N &nbsp; B U L L O C K</div>
    <div class="share-save">Share &amp; Save &#x2197;</div>
  </div>
</div>`;

const CONTENT_SLIDE = `<div class="slide" id="slide" data-type="content">
  <img class="bg-image" src="{{BG_IMAGE_PATH}}" alt="">
  <div class="bg-gradient"></div>
  <div class="bg-grid"></div>
  <div class="vignette"></div>
  <div class="bracket btl"></div>
  <div class="bracket btr"></div>
  <div class="bracket bbl"></div>
  <div class="bracket bbr"></div>

  <div class="content-wrap">
    <div class="slide-tag">{{SLIDE_TAG}}</div>
    <div class="content-headline">{{HEADLINE}}<br><span class="accent">{{HEADLINE_ACCENT}}</span></div>
    <div class="content-divider"></div>
    <div class="icons-row">{{ICONS_SVG}}</div>
    <div class="cards-list">
      <div class="card">
        <div class="card-num">01</div>
        <div><div class="card-title">{{POINT_1_TITLE}}</div><div class="card-sub">{{POINT_1_BODY}}</div></div>
      </div>
      <div class="card">
        <div class="card-num">02</div>
        <div><div class="card-title">{{POINT_2_TITLE}}</div><div class="card-sub">{{POINT_2_BODY}}</div></div>
      </div>
      <div class="card">
        <div class="card-num">03</div>
        <div><div class="card-title">{{POINT_3_TITLE}}</div><div class="card-sub">{{POINT_3_BODY}}</div></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="signature">D R E &apos; V O N &nbsp; B U L L O C K</div>
    <div class="footer-right">
      <div class="slide-num">{{SLIDE_NUM}}</div>
      <div class="share-save">Share &amp; Save &#x2197;</div>
    </div>
  </div>
</div>`;

const CTA_SLIDE = `<div class="slide" id="slide" data-type="cta">
  <img class="bg-image" src="{{BG_IMAGE_PATH}}" alt="">
  <div class="bg-gradient"></div>
  <div class="bg-grid"></div>

  <svg class="geo" viewBox="0 0 1080 1080">
    <circle cx="540" cy="540" r="400" fill="none" stroke="#00D2FF" stroke-width="2"/>
    <circle cx="540" cy="540" r="270" fill="none" stroke="#00D2FF" stroke-width="1"/>
    <line x1="140" y1="540" x2="940" y2="540" stroke="#00D2FF" stroke-width="1"/>
    <line x1="540" y1="140" x2="540" y2="940" stroke="#00D2FF" stroke-width="1"/>
  </svg>

  <div class="vignette"></div>
  <div class="bracket btl"></div>
  <div class="bracket btr"></div>
  <div class="bracket bbl"></div>
  <div class="bracket bbr"></div>

  <div class="cta-content">
    <div class="cta-tag">{{TOPIC_TAG}}</div>
    <div class="cta-headline">{{CTA_LINE1}}<br>{{CTA_LINE2}}<br><span class="accent">{{CTA_LINE3}}</span></div>
    <div class="cta-divider"></div>
    <div class="cta-sub">{{CTA_BODY}}</div>
    <div class="comment-cta">Comment <span class="keyword">"{{KEYWORD}}"</span> for the free {{RESOURCE}}</div>
    <div class="follow-btn">Follow @drevonbullock.ai</div>
  </div>

  <div class="footer">
    <div class="signature">D R E &apos; V O N &nbsp; B U L L O C K</div>
    <div class="share-save">Share &amp; Save &#x2197;</div>
  </div>
</div>`;

// ─── CONTENT GENERATION ───────────────────────────────────────────────────────

async function generateCarouselContent(topic) {
  const keyword = pickKeyword(topic);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
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
    "headline_line3": "accent payoff line — the punchiest part (max 5 words)",
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
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
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
  const bg = getBgDataUrl();
  const totalSlides = 1 + content.slides.length + 1; // hook + 3 content + cta
  const ts = Date.now();
  const tmpDir = path.join(os.tmpdir(), `carousel-${ts}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const imageUrls = [];

  // Hook
  console.log(`[Carousel] Rendering slide 1/${totalSlides} — hook`);
  const hookBuf = await renderSlide(
    buildPage(css, fillSlide(HOOK_SLIDE, {
      BG_IMAGE_PATH:  bg,
      TOPIC_TAG:      content.topic_tag,
      HEADLINE_LINE1: content.hook.headline_line1,
      HEADLINE_LINE2: content.hook.headline_line2,
      HEADLINE_LINE3: content.hook.headline_line3,
      SUBTEXT:        content.hook.subtext,
      SLIDE_COUNT:    String(totalSlides),
    })),
    path.join(tmpDir, "slide-01.png")
  );
  imageUrls.push(await uploadSlide(hookBuf, `carousels/${ts}/slide-01.png`));

  // Content slides
  for (let i = 0; i < content.slides.length; i++) {
    const s = content.slides[i];
    const num = i + 2;
    console.log(`[Carousel] Rendering slide ${num}/${totalSlides} — content`);
    const buf = await renderSlide(
      buildPage(css, fillSlide(CONTENT_SLIDE, {
        BG_IMAGE_PATH:   bg,
        ICONS_SVG:       ICONS_SVG,
        SLIDE_TAG:       s.slide_tag,
        HEADLINE:        s.headline,
        HEADLINE_ACCENT: s.headline_accent,
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
      BG_IMAGE_PATH: bg,
      TOPIC_TAG:     content.topic_tag,
      CTA_LINE1:     content.cta.cta_line1,
      CTA_LINE2:     content.cta.cta_line2,
      CTA_LINE3:     content.cta.cta_line3,
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
  const { imageUrls, caption, content } = await renderCarousel(topic);
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

function buildCaption(content) {
  const h = content.hook;
  const cta = content.cta;
  const lines = [
    `${h.headline_line1} ${h.headline_line2} ${h.headline_line3}`.trim(),
    "",
    h.subtext,
    "",
  ];
  content.slides.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.point_1_title} — ${s.point_1_body}`);
  });
  lines.push("", `Comment "${cta.keyword}" and I'll send you ${cta.resource} straight to your DMs.`);
  lines.push("", "#AIAutomation #BCG");
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
