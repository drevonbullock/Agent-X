import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { esc, fitJpeg, dataUri, FONTS, renderHtml } from "./wick-render.js";

// ─── WICK STORY CAROUSEL (2026-09-15) ────────────────────────────────────────
// Dre rejected the paper layout: the same image on every slide and a marker
// highlight under every number. He asked for a layout built on what the culture
// actually engages with, and he is part of that culture.
//
// The pages he named run one system. Fox on Money (329K), Grind Hallway (302K)
// and Crux Unity (102K): a mascot in a DIFFERENT scene on every slide, very few
// words, trap-vs-fix contrast pairs, covers with the art on top and a heavy
// all-caps headline below with the key words in yellow TEXT, "swipe for more".
//
// Wick's version keeps that and adds what Dre asked for: images framed smaller
// than full bleed, one accent colour used as text only, and two interactive beats.
// A GUESS slide right after the cover hides the post's biggest number, and a
// yellow ANSWER slide later breaks the dark rhythm: the pattern interrupt.

const W = 1080, H = 1350;
const BG = "#0D0B09", CARD = "#1A1612", TEXT = "#F7F2E8", MUTED = "#A8A093", YELLOW = "#FFD23F", RED = "#FF5C4D";

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const STORY_CSS = `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${BG};font-family:'DM Sans',sans-serif;color:${TEXT};}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;
  background:radial-gradient(110% 55% at 50% 0%, #2B2015 0%, ${BG} 60%), ${BG};}
.slide::after{content:"";position:absolute;inset:0;background-image:${GRAIN};pointer-events:none;z-index:60;}
.y{color:${YELLOW};}
.top{position:absolute;left:72px;right:72px;top:54px;display:flex;justify-content:space-between;align-items:center;z-index:40;}
.pill{padding:10px 22px;border-radius:999px;background:rgba(247,242,232,0.08);border:2px solid rgba(247,242,232,0.16);
  font-weight:800;font-size:22px;letter-spacing:4px;text-transform:uppercase;color:${TEXT};}
.pill.yellow{background:${YELLOW};border-color:${YELLOW};color:${BG};}
.pill.ink{background:${BG};border-color:${BG};color:${YELLOW};}
.meta{font-weight:700;font-size:22px;letter-spacing:3px;color:${MUTED};text-transform:uppercase;}
.progress{position:absolute;left:72px;right:72px;top:116px;height:6px;border-radius:6px;background:rgba(247,242,232,0.12);z-index:40;}
.progress i{display:block;height:100%;border-radius:6px;background:${YELLOW};}
.frame{position:absolute;border-radius:30px;overflow:hidden;background:${CARD};
  box-shadow:0 30px 60px rgba(0,0,0,0.55),0 0 0 2px rgba(247,242,232,0.08);}
.frame img{width:100%;height:100%;object-fit:cover;display:block;}
.chip{display:inline-flex;align-items:center;gap:12px;align-self:flex-start;padding:8px 18px 8px 9px;border-radius:999px;
  font-weight:900;font-size:22px;letter-spacing:3px;text-transform:uppercase;}
.chip .ic{position:relative;width:30px;height:30px;border-radius:50%;flex-shrink:0;}
.chip.trap{background:rgba(255,92,77,0.14);color:${RED};}
.chip.trap .ic{background:${RED};}
.chip.trap .ic::before,.chip.trap .ic::after{content:"";position:absolute;left:7px;top:13px;width:16px;height:4px;border-radius:2px;background:${BG};}
.chip.trap .ic::before{transform:rotate(45deg);} .chip.trap .ic::after{transform:rotate(-45deg);}
/* The first box is not always a trap ("VOO costs $3 a year" is a good fact), so it is labelled neutrally. */
.chip.know{background:rgba(247,242,232,0.1);color:${TEXT};}
.chip.know .ic{background:${TEXT};}
.chip.know .ic::before{content:"";position:absolute;left:13px;top:6px;width:4px;height:11px;border-radius:2px;background:${BG};}
.chip.know .ic::after{content:"";position:absolute;left:13px;top:20px;width:4px;height:4px;border-radius:2px;background:${BG};}
.chip.fix{background:rgba(255,210,63,0.14);color:${YELLOW};}
.chip.fix .ic{background:${YELLOW};}
.chip.fix .ic::after{content:"";position:absolute;left:10px;top:5px;width:8px;height:15px;border:solid ${BG};border-width:0 4px 4px 0;transform:rotate(45deg);}
.swipe{position:absolute;left:72px;right:72px;bottom:56px;display:flex;align-items:center;justify-content:space-between;z-index:40;
  font-weight:800;font-size:24px;letter-spacing:5px;color:${MUTED};text-transform:uppercase;}
.arrow{position:relative;display:block;width:90px;height:6px;border-radius:3px;background:${YELLOW};}
.arrow::after{content:"";position:absolute;right:-1px;top:-8px;width:18px;height:18px;border:solid ${YELLOW};border-width:6px 6px 0 0;transform:rotate(45deg);}
`;

const MONEY_RE = /\$\s?[\d,]+(?:\.\d+)?|\b\d[\d,.]*%/g;
const yellowNumbers = (escaped) => escaped.replace(MONEY_RE, (m) => `<span class="y">${m}</span>`);
const inlineSendTo = (t) => String(t ?? "")
  .replace(/^(The|A|An|Your|My|Anyone|Someone|Every|Whoever|That|Those|Any)\b/, (m) => m.toLowerCase())
  .replace(/\.\s*$/, "");

// Art arrives as a URL (library or a paid Higgsfield result) or a local path.
const CACHE = path.join(os.tmpdir(), "wick-art-cache");
export async function localArt(src) {
  if (!/^https?:/i.test(src)) return src;
  fs.mkdirSync(CACHE, { recursive: true });
  const p = path.join(CACHE, crypto.createHash("sha1").update(src).digest("hex").slice(0, 16) + ".src");
  if (!fs.existsSync(p)) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`art fetch ${r.status}: ${src}`);
    fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  }
  return p;
}
const img = async (src, w, h, yBias = 0.3) => dataUri(fitJpeg(await localArt(src), w, h, yBias));

const page = (css, inner) =>
  `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>${STORY_CSS}${css}</style></head><body><div class="slide">${inner}</div></body></html>`;
const topBar = (left, index, total) =>
  `<div class="top">${left}<span class="meta">@wickswisdom${total ? ` · ${index}/${total}` : ""}</span></div>`;

// COVER — hook stack: Wick's scene (visual), the headline (text), the yellow
// badge counting what is inside (curiosity), and the swipe cue.
export async function storyCover({ image, headline, topic = "", moves = 0, index = 1, total = 0 }) {
  const text = String(headline).toUpperCase().replace(/[.,!?\s]*HERE'?S\s+HOW[.,!?\s]*$/i, "").trim();
  const len = text.length;
  const size = len <= 28 ? 112 : len <= 40 ? 98 : len <= 54 ? 86 : 74;
  const art = await img(image, 900, 640, 0.25);
  const css = `
.art{left:90px;right:90px;top:150px;height:640px;}
.badge{position:absolute;right:52px;top:104px;width:204px;height:204px;border-radius:50%;background:${YELLOW};color:${BG};z-index:45;
  display:flex;align-items:center;justify-content:center;text-align:center;transform:rotate(-12deg);box-shadow:0 18px 40px rgba(0,0,0,0.5);
  font-weight:900;font-size:26px;line-height:1.05;letter-spacing:2px;text-transform:uppercase;}
.badge b{display:block;font-family:'Anton',sans-serif;font-weight:400;font-size:84px;line-height:0.92;letter-spacing:0;}
.head{position:absolute;left:72px;right:72px;top:830px;bottom:130px;display:flex;align-items:center;z-index:30;
  font-weight:900;font-size:${size}px;line-height:0.98;letter-spacing:-1.5px;text-transform:uppercase;}`;
  return renderHtml(page(css, `
  ${topBar(`<span class="pill">${esc(topic || "Money")}</span>`, index, total)}
  <div class="frame art"><img src="${art}"></div>
  ${moves ? `<div class="badge"><div><b>${moves}</b>moves<br>inside</div></div>` : ""}
  <div class="head"><div>${yellowNumbers(esc(text))}</div></div>
  <div class="swipe"><span>Swipe for more</span><span class="arrow"></span></div>`));
}

// GUESS — the number is hidden behind a scratch-off bar, the answer lives on a
// named later slide, so the reader has a reason to swipe all the way through.
export async function storyGuess({ image, question, answerSlide, hide = null, topic = "", index = 2, total = 0 }) {
  const len = String(question).length;
  const size = len <= 50 ? 80 : len <= 80 ? 68 : 58;
  // Hide ONE number, the one the answer slide reveals. Hiding every figure left
  // the question unreadable ("SPY charges [bar] a year on [bar]").
  const bar = (m) => `<span class="redact" style="width:${(Math.max(2, m.length) * 0.5).toFixed(2)}em"></span>`;
  const redacted = hide
    ? esc(question).split(esc(hide)).map((part) => yellowNumbers(part)).join(bar(hide))
    : esc(question).replace(MONEY_RE, bar);
  const art = await img(image, 460, 460, 0.3);
  const css = `
.q{position:absolute;left:72px;right:72px;top:200px;font-weight:900;font-size:${size}px;line-height:1.1;letter-spacing:-1px;}
.redact{display:inline-block;height:0.8em;vertical-align:-0.06em;border-radius:12px;
  background:repeating-linear-gradient(-45deg,${YELLOW} 0 14px,#D9AA1E 14px 28px);}
.art{left:72px;bottom:130px;width:460px;height:460px;transform:rotate(-3deg);}
.side{position:absolute;left:600px;right:72px;bottom:170px;display:flex;flex-direction:column;gap:22px;}
.lock{font-weight:900;font-size:50px;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;}
.hint{font-weight:600;font-size:32px;line-height:1.3;color:${MUTED};}`;
  return renderHtml(page(css, `
  ${topBar(`<span class="pill yellow">Guess first</span>`, index, total)}
  <div class="q">${redacted}</div>
  <div class="frame art"><img src="${art}"></div>
  <div class="side"><div class="lock">Lock in<br>your <span class="y">guess.</span></div>
    <div class="hint">The answer is on slide ${answerSlide}. No peeking.</div></div>
  <div class="swipe"><span>Swipe</span><span class="arrow"></span></div>`));
}

// ANSWER — the pattern interrupt: the only yellow slide in the post.
export async function storyReveal({ image, number, sentence, topic = "", index = 0, total = 0 }) {
  const n = String(number);
  const numSize = Math.min(300, Math.floor(936 / (Math.max(3, n.length) * 0.47)));
  const art = await img(image, 330, 330, 0.3);
  const len = String(sentence).length;
  const sSize = len <= 60 ? 64 : len <= 90 ? 56 : 48;
  const css = `
.slide{background:${YELLOW};}
.meta{color:rgba(13,11,9,0.6);}
.num{position:absolute;left:62px;right:72px;top:190px;font-family:'Anton',sans-serif;font-size:${numSize}px;line-height:1;color:${BG};letter-spacing:-2px;}
.sent{position:absolute;left:72px;right:72px;top:${190 + numSize + 36}px;font-weight:900;font-size:${sSize}px;line-height:1.08;letter-spacing:-1px;color:${BG};}
.art{right:72px;bottom:110px;width:330px;height:330px;transform:rotate(4deg);box-shadow:0 0 0 10px ${BG},0 30px 60px rgba(0,0,0,0.3);}
.nudge{position:absolute;left:72px;right:460px;bottom:150px;font-weight:800;font-size:38px;line-height:1.18;color:${BG};}
.swipe{color:rgba(13,11,9,0.65);} .arrow,.arrow::after{background:${BG};border-color:${BG};}
.arrow::after{background:transparent;}`;
  return renderHtml(page(css, `
  ${topBar(`<span class="pill ink">The answer</span>`, index, total)}
  <div class="num">${esc(n)}</div>
  <div class="sent">${esc(sentence)}</div>
  <div class="nudge">Close to your guess? Keep going.</div>
  <div class="frame art"><img src="${art}"></div>
  <div class="swipe"><span>Swipe</span><span class="arrow"></span></div>`));
}

// ITEM — the trap and the fix, each with its OWN image, zig-zagging so the eye
// moves diagonally down the slide. The move for tonight sits at the bottom.
export async function storyItem({ trapImage, fixImage, number, title, problem, solution, how, topic = "", index = 0, total = 0 }) {
  const [a, b] = await Promise.all([img(trapImage, 400, 400, 0.3), img(fixImage, 400, 400, 0.3)]);
  const pSize = String(problem ?? "").length > 80 ? 38 : 42;
  const sSize = String(solution ?? "").length > 80 ? 40 : 46;
  const tSize = String(title ?? "").length > 26 ? 50 : 58;
  const pct = total ? Math.round((index / total) * 100) : 0;
  const css = `
.title{position:absolute;left:72px;right:72px;top:150px;display:flex;align-items:center;gap:24px;}
.title .n{font-family:'Anton',sans-serif;font-size:100px;line-height:0.9;color:${YELLOW};}
.title .t{font-weight:900;font-size:${tSize}px;line-height:1;letter-spacing:-1px;text-transform:uppercase;}
.row{position:absolute;left:72px;right:72px;height:400px;display:flex;align-items:center;gap:44px;}
.row.a{top:318px;} .row.b{top:748px;flex-direction:row-reverse;}
.row .frame{position:relative;width:400px;height:400px;flex-shrink:0;}
.row.a .frame{transform:rotate(-2deg);} .row.b .frame{transform:rotate(2deg);}
.txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;}
.p{font-weight:600;font-size:${pSize}px;line-height:1.22;color:#D6CEC1;}
.s{font-weight:800;font-size:${sSize}px;line-height:1.16;color:${TEXT};}
.how{position:absolute;left:72px;right:72px;bottom:52px;padding:22px 28px;border-radius:24px;background:${CARD};
  border:2px solid rgba(255,210,63,0.35);display:flex;gap:20px;align-items:baseline;}
.how b{font-weight:900;font-size:22px;letter-spacing:4px;color:${YELLOW};white-space:nowrap;text-transform:uppercase;}
.how span{font-weight:700;font-size:32px;line-height:1.25;}`;
  return renderHtml(page(css, `
  ${topBar(`<span class="pill">${esc(topic || "Money")}</span>`, index, total)}
  <div class="progress"><i style="width:${pct}%"></i></div>
  <div class="title"><span class="n">${String(number).padStart(2, "0")}</span><span class="t">${esc(title)}</span></div>
  <div class="row a"><div class="frame"><img src="${a}"></div>
    <div class="txt"><span class="chip know"><span class="ic"></span>Know this</span><div class="p">${yellowNumbers(esc(problem))}</div></div></div>
  <div class="row b"><div class="frame"><img src="${b}"></div>
    <div class="txt"><span class="chip fix"><span class="ic"></span>The fix</span><div class="s">${yellowNumbers(esc(solution))}</div></div></div>
  ${how ? `<div class="how"><b>Tonight</b><span>${esc(how)}</span></div>` : ""}`));
}

// CLOSE — the checklist worth saving on its own, then the send.
export async function storyClose({ image, steps = [], closingLine, sendTo, topic = "", index = 0, total = 0 }) {
  const list = steps.filter(Boolean);
  const art = await img(image, 300, 300, 0.3);
  const stepSize = list.join(" ").length > 260 ? 32 : 36;
  const css = `
.h{position:absolute;left:72px;right:72px;top:150px;font-weight:900;font-size:80px;line-height:1;letter-spacing:-1.5px;text-transform:uppercase;}
.list{position:absolute;left:72px;right:72px;top:272px;list-style:none;display:flex;flex-direction:column;gap:22px;}
.list li{display:flex;gap:20px;align-items:flex-start;font-weight:700;font-size:${stepSize}px;line-height:1.25;}
.box{width:40px;height:40px;border-radius:10px;border:4px solid ${YELLOW};flex-shrink:0;margin-top:2px;}
.end{position:absolute;left:72px;right:72px;bottom:72px;display:flex;align-items:center;gap:40px;}
.end .frame{position:relative;width:300px;height:300px;flex-shrink:0;transform:rotate(-3deg);}
.c1{font-weight:900;font-size:48px;line-height:1.05;letter-spacing:-0.5px;margin-bottom:18px;}
.c2{font-weight:700;font-size:32px;line-height:1.25;color:${MUTED};}`;
  return renderHtml(page(css, `
  ${topBar(`<span class="pill yellow">Save this</span>`, index, total)}
  <div class="h">Your <span class="y">${list.length}</span> moves</div>
  <ol class="list">${list.map((s) => `<li><span class="box"></span><span>${yellowNumbers(esc(s))}</span></li>`).join("")}</ol>
  <div class="end"><div class="frame"><img src="${art}"></div>
    <div><div class="c1">${esc(closingLine)}</div><div class="c2">Send this to <span class="y">${esc(inlineSendTo(sendTo))}</span>.</div></div></div>`));
}

// Where the guess and its answer come from: the biggest dollar figure in items
// 3 to 5 (so the answer lands mid-carousel), else the biggest anywhere.
export function pickGuess(items, coverHeadline = "") {
  const found = [];
  items.forEach((it, k) => {
    for (const field of ["solution", "problem"]) {
      for (const m of String(it[field] ?? "").match(/\$\s?[\d,]+(?:\.\d+)?/g) ?? []) {
        found.push({ k, field, figure: m.replace(/\s/g, ""), value: parseFloat(m.replace(/[$,\s]/g, "")) || 0, sentence: it[field] });
      }
    }
  });
  if (!found.length) return null;
  // The answer is the number the cover promised: "$65" on the cover is the $64.50
  // in item 5, not the $10,000 the maths starts from. The trap sentence wins a tie.
  const cover = (String(coverHeadline).match(/\$\s?[\d,]+(?:\.\d+)?/g) ?? []).map((c) => parseFloat(c.replace(/[$,\s]/g, "")) || 0);
  const tied = found.filter((f) => cover.some((c) => c && Math.abs(f.value - c) / c <= 0.15));
  if (tied.length) return tied.sort((a, b) => b.k - a.k || (a.field === "problem" ? -1 : 1))[0];
  const mid = found.filter((f) => f.k >= 2);
  return (mid.length ? mid : found).sort((a, b) => b.value - a.value)[0];
}
