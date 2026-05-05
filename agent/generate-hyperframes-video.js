import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generateAllVoiceovers } from "./elevenlabs.js";
import { ensureBCGJingle } from "./generate-jingle.js";
import { ensureSFXLibrary } from "./generate-sfx.js";
import { fetchCompanyLogo } from "./fetch-company-logo.js";
import { captureSourceScreenshot, detectCompanyFromText } from "./capture-screenshot.js";
import { fetchNewsUrl } from "./fetch-news-url.js";

const BG     = "#080E1C";
const ORANGE = "#FF6B00";
const GSAP_CDN = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`;
const W = 1080;
const H = 1920;

const SILENT_STYLES = new Set(["hook_reveal", "review_card"]);

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sfx(src, start, duration, idx) {
  const t = parseFloat(start);
  return `<audio id="sfx-${idx}" class="clip" data-start="${t.toFixed(2)}" data-duration="${duration}" data-track-index="${idx}" src="${src}"></audio>`;
}

// ─── SHARED CHROME (logo + watermark + jingle + riser) ───────────────────────
function buildChrome(paths, totalDur) {
  const logoHtml = paths.logo
    ? `<div id="logo-wrap">
        <img src="${paths.logo}" alt="logo"/>
        ${sfx(paths.sfx.swoosh, 0.5, 0.5, 52)}
      </div>`
    : "";

  return `
  <audio id="bcg-jingle" class="clip" data-start="0" data-duration="3" data-track-index="50" src="${paths.jingle}"></audio>
  <audio id="sfx-riser-open" class="clip" data-start="0" data-duration="1.5" data-track-index="51" src="${paths.sfx.riser}"></audio>
  ${logoHtml}
  <div id="bcg-watermark">@DrevonBullock&nbsp;•&nbsp;BCG</div>`;
}

function chromeGsap(paths) {
  const logoTween = paths.logo
    ? `tl.fromTo('#logo-wrap',{x:80,opacity:0},{x:0,opacity:1,duration:0.5,ease:'back.out(1.4)'},0.5);`
    : "";
  return `
  ${logoTween}
  tl.fromTo('#bcg-watermark',{opacity:0},{opacity:1,duration:0.6,ease:'power2.out'},0.3);`;
}

const SHARED_CSS = `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;}
.stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;}
audio{display:none;}
.screen{position:absolute;inset:0;display:flex;flex-direction:column;}
.screen-bg{position:absolute;inset:0;background:linear-gradient(135deg,#0A0A0A 0%,#1A1A2E 50%,#0A0A0A 100%);}
#logo-wrap{position:absolute;top:48px;right:48px;z-index:10;opacity:0;
  background:rgba(255,255,255,0.95);border-radius:16px;padding:10px;
  width:96px;height:96px;display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 24px rgba(0,0,0,0.5);}
#logo-wrap img{width:76px;height:76px;object-fit:contain;}
#bcg-watermark{position:absolute;bottom:48px;left:48px;z-index:10;opacity:0;
  font-size:28px;font-weight:700;color:${ORANGE};letter-spacing:2px;
  text-shadow:0 2px 8px rgba(0,0,0,0.8);}`;

// ─── STYLE A: HOOK REVEAL (8s, no voiceover) ─────────────────────────────────
function buildHookReveal(videoScript, paths) {
  const totalDur = 8;
  const text = videoScript[0]?.heading ?? "";
  const words = text.split(/\s+/).filter(Boolean);
  const lastIdx = words.length - 1;

  const wordSpans = words
    .map((w, i) =>
      `<span class="hw${i === lastIdx ? " hw-key" : ""}" id="hw${i}">${escHtml(w)}</span>`
    )
    .join(" ");

  const wordTweens = words
    .map((_, i) =>
      `tl.fromTo('#hw${i}',{y:40,opacity:0},{y:0,opacity:1,duration:0.35,ease:'back.out(1.6)'},${(0.5 + i * 0.14).toFixed(2)});`
    )
    .join("\n  ");

  const underlineStart = (0.5 + words.length * 0.14 + 0.1).toFixed(2);
  const impactStart = (parseFloat(underlineStart) + 0.2).toFixed(2);

  const screenshotHtml = paths.screenshot
    ? `<div id="proof-card">
        <div class="proof-label">SOURCE VERIFIED</div>
        <img src="${paths.screenshot}" class="proof-img" alt="Source"/>
      </div>`
    : `<div id="proof-card" class="badge-only">
        <div class="proof-badge">SOURCE VERIFIED ✓</div>
      </div>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
${SHARED_CSS}
.hook-content{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:120px 64px 0;}
.hook-words{text-align:center;line-height:1.1;width:100%;}
.hw{display:inline-block;margin:0 6px;font-size:120px;font-weight:900;color:#fff;
  text-shadow:0 0 60px rgba(255,107,0,0.25);opacity:0;}
.hw-key{color:${ORANGE};text-shadow:0 0 100px rgba(255,107,0,0.9);}
.hook-underline{height:7px;width:0;background:${ORANGE};border-radius:4px;
  margin:40px auto 0;box-shadow:0 0 24px rgba(255,107,0,0.9);}
#proof-card{position:relative;z-index:3;width:90%;margin:48px auto 0;
  border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);
  box-shadow:0 16px 48px rgba(0,0,0,0.8);transform:rotate(1.5deg);opacity:0;}
#proof-card.badge-only{background:rgba(255,107,0,0.12);padding:32px;text-align:center;
  border:2px solid rgba(255,107,0,0.4);}
.proof-img{width:100%;height:auto;display:block;}
.proof-label{font-size:20px;font-weight:800;letter-spacing:4px;color:${ORANGE};
  padding:12px 20px;background:rgba(0,0,0,0.6);}
.proof-badge{font-size:40px;font-weight:800;color:${ORANGE};letter-spacing:3px;}
</style>
</head><body>
<div id="composition" class="stage clip"
  data-composition-id="hook-reveal"
  data-start="0" data-width="${W}" data-height="${H}" data-duration="${totalDur}"
  data-track-index="0">
  ${buildChrome(paths, totalDur)}
  <div class="screen clip" id="sc1" data-start="0" data-duration="${totalDur}" data-track-index="1">
    <div class="screen-bg"></div>
    <div class="hook-content">
      <div class="hook-words">${wordSpans}</div>
      <div class="hook-underline" id="ul"></div>
      ${screenshotHtml}
    </div>
    ${sfx(paths.sfx.swoosh, 0.4, 0.5, 53)}
    ${sfx(paths.sfx.impact, parseFloat(impactStart), 0.4, 54)}
    ${sfx(paths.sfx.pop, 4.5, 0.3, 55)}
  </div>
</div>
<script>(() => {
  const tl = gsap.timeline({ paused: true });
  ${chromeGsap(paths)}
  ${wordTweens}
  tl.to('#ul',{width:'60%',duration:0.55,ease:'power3.out'},${underlineStart});
  ${sfx ? `/* impact on last word */` : ""}
  tl.fromTo('#proof-card',{y:80,opacity:0,rotation:1.5},{y:0,opacity:1,rotation:1.5,duration:0.6,ease:'back.out(1.3)'},4.5);
  tl.to({},{duration:${totalDur}},0);
  window.__timelines = window.__timelines || {};
  window.__timelines['hook-reveal'] = tl;
})();</script></body></html>`;
}

// ─── STYLE B: STAT STACK (dynamic, voiceover) ────────────────────────────────
function buildStatStack(fullScript, screenDurations, paths) {
  const totalDur = screenDurations.reduce((a, b) => a + b, 0);
  const starts = screenDurations.reduce((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + screenDurations[i - 1]);
    return acc;
  }, []);

  const hookDur = screenDurations[0];
  const stats = fullScript.slice(1).filter((s) => !s.isCTA);
  let sfxIdx = 53;

  const hookHtml = `
<div class="screen clip" id="sc1" data-start="0" data-duration="${hookDur.toFixed(2)}" data-track-index="1">
  <div class="screen-bg"></div>
  <div class="stat-hook-content">
    <div class="stat-eyebrow">BREAKING</div>
    <div class="stat-hook-text" id="sh1">${escHtml(fullScript[0]?.heading ?? "")}</div>
  </div>
  <audio id="vo-sc1" src="voice_1.mp3" data-start="0" data-volume="1.0"></audio>
  ${sfx(paths.sfx.swoosh, 0.4, 0.5, sfxIdx++)}
</div>`;

  const statHtml = stats.map((s, i) => {
    const scIdx = i + 2;
    const dur = screenDurations[i + 1];
    const st = starts[i + 1];
    const fromLeft = i % 2 === 0;
    const numMatch = (s.heading + " " + (s.body ?? "")).match(/[\d,]+%?[\d,]*/);
    const numStr = numMatch ? numMatch[0] : "";
    const bodyText = s.points ? s.points.join(" ") : (s.body ?? "");
    const swooshI = sfxIdx++;
    const popI = sfxIdx++;
    return `
<div class="screen clip" id="sc${scIdx}" data-start="${st.toFixed(2)}" data-duration="${dur.toFixed(2)}" data-track-index="${scIdx}">
  <div class="screen-bg"></div>
  <div class="stat-card" id="stc${scIdx}">
    <div class="stat-number" id="stn${scIdx}">${escHtml(numStr || s.heading)}</div>
    <div class="stat-label">${numStr ? escHtml(s.heading) : ""}</div>
    <div class="stat-divider" id="std${scIdx}"></div>
    <div class="stat-body" id="stb${scIdx}">${escHtml(bodyText)}</div>
  </div>
  <audio id="vo-sc${scIdx}" src="voice_${scIdx}.mp3" data-start="${st.toFixed(2)}" data-volume="1.0"></audio>
  ${sfx(paths.sfx.swoosh, st, 0.5, swooshI)}
  ${sfx(paths.sfx.pop, st + 0.3, 0.3, popI)}
</div>`;
  }).join("");

  const statTweens = stats.map((_, i) => {
    const scIdx = i + 2;
    const st = starts[i + 1];
    const fromLeft = i % 2 === 0;
    const xIn = fromLeft ? -120 : 120;
    return `
  tl.fromTo('#stn${scIdx}',{x:${xIn},opacity:0},{x:0,opacity:1,duration:0.55,ease:'back.out(1.5)'},${st.toFixed(2)});
  tl.fromTo('#std${scIdx}',{scaleX:0},{scaleX:1,duration:0.4,ease:'power3.out'},${(st + 0.4).toFixed(2)});
  tl.fromTo('#stb${scIdx}',{opacity:0,y:20},{opacity:1,y:0,duration:0.4,ease:'power2.out'},${(st + 0.55).toFixed(2)});`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
${SHARED_CSS}
.stat-hook-content{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:120px 80px;}
.stat-eyebrow{font-size:30px;font-weight:800;letter-spacing:8px;color:${ORANGE};margin-bottom:36px;}
.stat-hook-text{font-size:86px;font-weight:900;color:#fff;line-height:1.15;text-align:center;
  text-shadow:0 0 60px rgba(255,107,0,0.2);}
.stat-card{position:relative;z-index:3;padding:120px 80px;flex:1;display:flex;
  flex-direction:column;justify-content:center;}
.stat-number{font-size:160px;font-weight:900;color:${ORANGE};line-height:0.95;
  text-shadow:0 0 80px rgba(255,107,0,0.7);opacity:0;}
.stat-label{font-size:44px;font-weight:600;color:rgba(255,255,255,0.7);margin-top:16px;line-height:1.3;}
.stat-divider{height:5px;width:140px;background:${ORANGE};border-radius:4px;
  margin:40px 0;transform-origin:left;transform:scaleX(0);
  box-shadow:0 0 20px rgba(255,107,0,0.8);}
.stat-body{font-size:52px;color:rgba(255,255,255,0.85);line-height:1.45;opacity:0;}
</style>
</head><body>
<div id="composition" class="stage clip"
  data-composition-id="stat-stack"
  data-start="0" data-width="${W}" data-height="${H}" data-duration="${totalDur.toFixed(2)}"
  data-track-index="0">
  ${buildChrome(paths, totalDur)}
  ${hookHtml}
  ${statHtml}
</div>
<script>(() => {
  const tl = gsap.timeline({ paused: true });
  ${chromeGsap(paths)}
  tl.from('#sh1',{scale:0.85,opacity:0,duration:0.55,ease:'back.out(1.6)'},0.4);
  ${statTweens}
  tl.to({},{duration:${totalDur.toFixed(2)}},0);
  window.__timelines = window.__timelines || {};
  window.__timelines['stat-stack'] = tl;
})();</script></body></html>`;
}

// ─── STYLE C: PROBLEM / SOLUTION (dynamic, voiceover) ────────────────────────
function buildProblemSolution(fullScript, screenDurations, paths) {
  const totalDur = screenDurations.reduce((a, b) => a + b, 0);
  const starts = screenDurations.reduce((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + screenDurations[i - 1]);
    return acc;
  }, []);

  const hookDur = screenDurations[0];
  const teaches = fullScript.slice(1).filter((s) => !s.isCTA);
  const midIdx  = Math.floor(teaches.length / 2);
  const probScreens = teaches.slice(0, Math.max(1, midIdx));
  const solScreens  = teaches.slice(Math.max(1, midIdx));

  let sfxIdx = 53;

  const hookHtml = `
<div class="screen clip" id="sc1" data-start="0" data-duration="${hookDur.toFixed(2)}" data-track-index="1">
  <div class="screen-bg"></div>
  <div class="ps-hook-content">
    <div class="ps-hook-text" id="psh">${escHtml(fullScript[0]?.heading ?? "")}</div>
  </div>
  <audio id="vo-sc1" src="voice_1.mp3" data-start="0" data-volume="1.0"></audio>
  ${sfx(paths.sfx.swoosh, 0.4, 0.5, sfxIdx++)}
</div>`;

  const problemHtml = probScreens.map((s, i) => {
    const scIdx = i + 2;
    const dur = screenDurations[i + 1];
    const st = starts[i + 1];
    const body = s.points ? s.points.join(" ") : (s.body ?? "");
    const swooshI = sfxIdx++;
    return `
<div class="screen clip" id="sc${scIdx}" data-start="${st.toFixed(2)}" data-duration="${dur.toFixed(2)}" data-track-index="${scIdx}">
  <div class="screen-bg"></div>
  <div class="red-tint"></div>
  <div class="ps-panel" id="psp${scIdx}">
    <div class="ps-label prob-label">PROBLEM</div>
    <div class="ps-heading" id="psh${scIdx}">${escHtml(s.heading)}</div>
    <div class="ps-body" id="psb${scIdx}">${escHtml(body)}</div>
  </div>
  <audio id="vo-sc${scIdx}" src="voice_${scIdx}.mp3" data-start="${st.toFixed(2)}" data-volume="1.0"></audio>
  ${sfx(paths.sfx.swoosh, st + 0.2, 0.5, swooshI)}
</div>`;
  }).join("");

  const solStartIdx = probScreens.length + 2;
  const wipeStart = starts[probScreens.length + 1] ?? (starts[starts.length - solScreens.length]);

  const solutionHtml = solScreens.map((s, i) => {
    const scIdx = solStartIdx + i;
    const dur = screenDurations[probScreens.length + 1 + i];
    const st = starts[probScreens.length + 1 + i];
    const body = s.points ? s.points.join(" ") : (s.body ?? "");
    const swooshI = sfxIdx++;
    const impactI = sfxIdx++;
    return `
<div class="screen clip" id="sc${scIdx}" data-start="${st.toFixed(2)}" data-duration="${dur.toFixed(2)}" data-track-index="${scIdx}">
  <div class="screen-bg"></div>
  <div class="orange-tint"></div>
  <div class="wipe-bar" id="wb${scIdx}"></div>
  <div class="ps-panel" id="ssp${scIdx}">
    <div class="ps-label sol-label">SOLUTION</div>
    <div class="ps-heading" id="ssh${scIdx}">${escHtml(s.heading)}</div>
    <div class="ps-body" id="ssb${scIdx}">${escHtml(body)}</div>
  </div>
  <audio id="vo-sc${scIdx}" src="voice_${scIdx}.mp3" data-start="${st.toFixed(2)}" data-volume="1.0"></audio>
  ${sfx(paths.sfx.impact, st, 0.4, impactI)}
  ${sfx(paths.sfx.swoosh, st + 0.5, 0.5, swooshI)}
</div>`;
  }).join("");

  const probTweens = probScreens.map((_, i) => {
    const scIdx = i + 2;
    const st = starts[i + 1];
    return `
  tl.fromTo('#psp${scIdx}',{y:50,opacity:0},{y:0,opacity:1,duration:0.5,ease:'power3.out'},${st.toFixed(2)});
  tl.fromTo('#psh${scIdx}',{x:-40,opacity:0},{x:0,opacity:1,duration:0.4,ease:'back.out(1.5)'},${(st+0.2).toFixed(2)});
  tl.fromTo('#psb${scIdx}',{opacity:0},{opacity:1,duration:0.35,ease:'power2.out'},${(st+0.5).toFixed(2)});`;
  }).join("");

  const solTweens = solScreens.map((_, i) => {
    const scIdx = solStartIdx + i;
    const st = starts[probScreens.length + 1 + i];
    return `
  tl.fromTo('#wb${scIdx}',{scaleX:0},{scaleX:1,duration:0.5,ease:'power3.inOut',transformOrigin:'left'},${st.toFixed(2)});
  tl.fromTo('#ssp${scIdx}',{y:50,opacity:0},{y:0,opacity:1,duration:0.5,ease:'power3.out'},${(st+0.3).toFixed(2)});
  tl.fromTo('#ssh${scIdx}',{x:40,opacity:0},{x:0,opacity:1,duration:0.45,ease:'back.out(1.5)'},${(st+0.5).toFixed(2)});
  tl.fromTo('#ssb${scIdx}',{opacity:0},{opacity:1,duration:0.35,ease:'power2.out'},${(st+0.75).toFixed(2)});`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
${SHARED_CSS}
.ps-hook-content{position:relative;z-index:3;flex:1;display:flex;align-items:center;justify-content:center;padding:120px 80px;}
.ps-hook-text{font-size:96px;font-weight:900;color:#fff;text-align:center;line-height:1.15;text-shadow:0 0 60px rgba(255,107,0,0.2);}
.red-tint{position:absolute;inset:0;background:rgba(255,59,59,0.10);pointer-events:none;}
.orange-tint{position:absolute;inset:0;background:rgba(255,107,0,0.10);pointer-events:none;}
.wipe-bar{position:absolute;top:0;left:0;right:0;height:8px;background:${ORANGE};
  transform-origin:left;transform:scaleX(0);box-shadow:0 0 30px rgba(255,107,0,0.9);z-index:5;}
.ps-panel{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;justify-content:center;padding:120px 80px;}
.ps-label{font-size:26px;font-weight:900;letter-spacing:8px;margin-bottom:40px;opacity:0.9;}
.prob-label{color:#FF3B3B;}
.sol-label{color:${ORANGE};}
.ps-heading{font-size:88px;font-weight:900;color:#fff;line-height:1.15;margin-bottom:36px;opacity:0;}
.ps-body{font-size:50px;color:rgba(255,255,255,0.78);line-height:1.5;opacity:0;}
</style>
</head><body>
<div id="composition" class="stage clip"
  data-composition-id="problem-solution"
  data-start="0" data-width="${W}" data-height="${H}" data-duration="${totalDur.toFixed(2)}"
  data-track-index="0">
  ${buildChrome(paths, totalDur)}
  ${hookHtml}
  ${problemHtml}
  ${solutionHtml}
</div>
<script>(() => {
  const tl = gsap.timeline({ paused: true });
  ${chromeGsap(paths)}
  tl.from('#psh',{scale:0.85,opacity:0,duration:0.55,ease:'back.out(1.6)'},0.4);
  ${probTweens}
  ${solTweens}
  tl.to({},{duration:${totalDur.toFixed(2)}},0);
  window.__timelines = window.__timelines || {};
  window.__timelines['problem-solution'] = tl;
})();</script></body></html>`;
}

// ─── STYLE D: LIST COUNTDOWN (dynamic, voiceover) ────────────────────────────
function buildListCountdown(fullScript, screenDurations, paths) {
  const totalDur = screenDurations.reduce((a, b) => a + b, 0);
  const starts = screenDurations.reduce((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + screenDurations[i - 1]);
    return acc;
  }, []);

  const hookDur  = screenDurations[0];
  const teaches  = fullScript.slice(1).filter((s) => !s.isCTA);
  const total    = teaches.length;

  const hookWords = (fullScript[0]?.heading ?? "").split(/\s+/).filter(Boolean);
  const hwHtml = hookWords
    .map((w, i) => `<span class="hw${i === hookWords.length - 1 ? " hw-key" : ""}" id="hw${i}">${escHtml(w)}</span>`)
    .join(" ");

  const hookHtml = `
<div class="screen clip" id="sc1" data-start="0" data-duration="${hookDur.toFixed(2)}" data-track-index="1">
  <div class="screen-bg"></div>
  <div class="hook-content">
    <div class="hook-eyebrow">BREAKING</div>
    <div class="hook-words">${hwHtml}</div>
  </div>
  <audio id="vo-sc1" src="voice_1.mp3" data-start="0" data-volume="1.0"></audio>
  ${sfx(paths.sfx.swoosh, 0.4, 0.5, 53)}
  ${sfx(paths.sfx.impact, (0.5 + hookWords.length * 0.1).toFixed(2), 0.4, 54)}
</div>`;

  let sfxIdx = 55;

  const teachHtml = teaches.map((s, i) => {
    const scIdx   = i + 2;
    const dur     = screenDurations[i + 1];
    const st      = starts[i + 1];
    const numDisp = String(i + 1).padStart(2, "0");
    const totDisp = String(total).padStart(2, "0");
    const isLast  = i === total - 1;
    const body    = s.points ? s.points.join(" ") : (s.body ?? "");
    const swooshI = sfxIdx++;
    const popI    = sfxIdx++;

    const screenshotHtml = isLast && paths.screenshot
      ? `<div class="proof-card" id="proof-last">
          <img src="${paths.screenshot}" class="proof-img" alt="Source"/>
        </div>`
      : "";

    return `
<div class="screen clip" id="sc${scIdx}" data-start="${st.toFixed(2)}" data-duration="${dur.toFixed(2)}" data-track-index="${scIdx}">
  <div class="screen-bg"></div>
  <div class="orange-border"></div>
  <div class="teach-content" id="tc${scIdx}">
    <div class="screen-counter" id="cnt${scIdx}">${numDisp}&nbsp;/&nbsp;${totDisp}</div>
    <div class="teach-heading" id="th${scIdx}">${escHtml(s.heading)}</div>
    ${body ? `<div class="teach-body" id="tb${scIdx}">${escHtml(body)}</div>` : ""}
    ${screenshotHtml}
  </div>
  <audio id="vo-sc${scIdx}" src="voice_${scIdx}.mp3" data-start="${st.toFixed(2)}" data-volume="1.0"></audio>
  ${sfx(paths.sfx.swoosh, st, 0.5, swooshI)}
  ${sfx(paths.sfx.pop, st + 0.15, 0.3, popI)}
</div>`;
  }).join("");

  const hookWordTweens = hookWords
    .map((_, i) =>
      `tl.fromTo('#hw${i}',{y:50,opacity:0},{y:0,opacity:1,duration:0.35,ease:'back.out(1.7)'},${(0.5 + i * 0.1).toFixed(2)});`
    )
    .join("\n  ");

  const teachTweens = teaches.map((_, i) => {
    const scIdx = i + 2;
    const st    = starts[i + 1];
    const isLast = i === total - 1;
    return `
  tl.fromTo('#cnt${scIdx}',{opacity:0,x:-20},{opacity:1,x:0,duration:0.35,ease:'power2.out'},${st.toFixed(2)});
  tl.fromTo('#th${scIdx}',{y:50,opacity:0},{y:0,opacity:1,duration:0.45,ease:'back.out(1.6)'},${(st+0.2).toFixed(2)});
  tl.fromTo('#tb${scIdx}',{opacity:0},{opacity:1,duration:0.4,ease:'power2.out'},${(st+0.5).toFixed(2)});
  ${isLast && paths.screenshot ? `tl.fromTo('#proof-last',{y:60,opacity:0,scale:0.95},{y:0,opacity:1,scale:1,duration:0.5,ease:'back.out(1.3)'},${(st+0.7).toFixed(2)});` : ""}`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
${SHARED_CSS}
/* Hook */
.hook-content{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:120px 80px;}
.hook-eyebrow{font-size:28px;font-weight:900;letter-spacing:8px;color:${ORANGE};
  margin-bottom:48px;text-transform:uppercase;}
.hook-words{text-align:center;line-height:1.1;width:100%;}
.hw{display:inline-block;margin:0 4px;font-size:110px;font-weight:900;color:#fff;
  text-shadow:0 0 60px rgba(255,107,0,0.2);opacity:0;}
.hw-key{color:${ORANGE};text-shadow:0 0 100px rgba(255,107,0,0.9);}
/* Teach */
.orange-border{position:absolute;left:0;top:0;bottom:0;width:8px;background:${ORANGE};
  z-index:4;box-shadow:0 0 20px rgba(255,107,0,0.5);}
.teach-content{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;
  justify-content:center;padding:120px 80px 80px 100px;}
.screen-counter{font-size:30px;font-weight:800;color:${ORANGE};letter-spacing:4px;
  margin-bottom:48px;opacity:0;}
.teach-heading{font-size:82px;font-weight:900;color:#fff;line-height:1.15;
  margin-bottom:36px;opacity:0;}
.teach-body{font-size:48px;color:rgba(255,255,255,0.75);line-height:1.5;opacity:0;}
/* Proof card */
.proof-card{width:100%;border-radius:16px;overflow:hidden;margin-top:48px;opacity:0;
  border:1px solid rgba(255,255,255,0.12);box-shadow:0 16px 48px rgba(0,0,0,0.7);}
.proof-img{width:100%;height:auto;display:block;}
</style>
</head><body>
<div id="composition" class="stage clip"
  data-composition-id="list-countdown"
  data-start="0" data-width="${W}" data-height="${H}" data-duration="${totalDur.toFixed(2)}"
  data-track-index="0">
  ${buildChrome(paths, totalDur)}
  ${hookHtml}
  ${teachHtml}
</div>
<script>(() => {
  const tl = gsap.timeline({ paused: true });
  ${chromeGsap(paths)}
  ${hookWordTweens}
  ${teachTweens}
  tl.to({},{duration:${totalDur.toFixed(2)}},0);
  window.__timelines = window.__timelines || {};
  window.__timelines['list-countdown'] = tl;
})();</script></body></html>`;
}

// ─── STYLE E: REVIEW CARD (8s, no voiceover) ─────────────────────────────────
function buildReviewCard(videoScript, paths) {
  const totalDur = 8;
  const screen = videoScript[0] ?? {};
  const quote   = screen.heading ?? "";
  const author  = screen.body   ?? "";
  const qWords  = quote.split(/\s+/).filter(Boolean);
  const qSpans  = qWords
    .map((w, i) => `<span class="qw" id="qw${i}">${escHtml(w)}</span>`)
    .join(" ");
  const wordTweens = qWords
    .map((_, i) =>
      `tl.fromTo('#qw${i}',{y:30,opacity:0},{y:0,opacity:1,duration:0.3,ease:'power2.out'},${(1.2 + i * 0.1).toFixed(2)});`
    )
    .join("\n  ");
  const dividerStart = (1.2 + qWords.length * 0.1 + 0.2).toFixed(2);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
${SHARED_CSS}
.review-content{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:120px 80px;}
.big-quote{font-size:240px;font-weight:900;color:${ORANGE};line-height:0.8;
  text-shadow:0 0 80px rgba(255,107,0,0.7);opacity:0;align-self:flex-start;}
.quote-body{font-size:68px;font-weight:700;color:#fff;line-height:1.3;margin-top:32px;text-align:left;width:100%;}
.qw{display:inline-block;margin:0 4px;opacity:0;}
.review-divider{width:0;height:5px;background:${ORANGE};border-radius:4px;
  margin:48px 0;box-shadow:0 0 20px rgba(255,107,0,0.8);}
.review-author{font-size:42px;color:rgba(255,255,255,0.9);font-weight:600;opacity:0;}
.review-title{font-size:32px;color:${ORANGE};font-weight:600;margin-top:8px;opacity:0;}
</style>
</head><body>
<div id="composition" class="stage clip"
  data-composition-id="review-card"
  data-start="0" data-width="${W}" data-height="${H}" data-duration="${totalDur}"
  data-track-index="0">
  ${buildChrome(paths, totalDur)}
  <div class="screen clip" id="sc1" data-start="0" data-duration="${totalDur}" data-track-index="1">
    <div class="screen-bg"></div>
    <div class="review-content">
      <div class="big-quote" id="bq">&ldquo;</div>
      <div class="quote-body">${qSpans}</div>
      <div class="review-divider" id="rdiv"></div>
      <div class="review-author" id="rauth">${escHtml(author.split(",")[0] ?? "")}</div>
      <div class="review-title" id="rtitle">${escHtml(author.split(",").slice(1).join(",").trim())}</div>
    </div>
    ${sfx(paths.sfx.pop, 0.8, 0.3, 53)}
    ${sfx(paths.sfx.swoosh, parseFloat(dividerStart), 0.5, 54)}
  </div>
</div>
<script>(() => {
  const tl = gsap.timeline({ paused: true });
  ${chromeGsap(paths)}
  tl.fromTo('#bq',{scale:0.5,opacity:0},{scale:1,opacity:1,duration:0.5,ease:'back.out(2)'},0.8);
  ${wordTweens}
  tl.to('#rdiv',{width:'200px',duration:0.45,ease:'power3.out'},${dividerStart});
  tl.fromTo('#rauth',{y:20,opacity:0},{y:0,opacity:1,duration:0.4,ease:'power2.out'},${(parseFloat(dividerStart)+0.3).toFixed(2)});
  tl.fromTo('#rtitle',{y:20,opacity:0},{y:0,opacity:1,duration:0.35,ease:'power2.out'},${(parseFloat(dividerStart)+0.55).toFixed(2)});
  tl.to({},{duration:${totalDur}},0);
  window.__timelines = window.__timelines || {};
  window.__timelines['review-card'] = tl;
})();</script></body></html>`;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function generateHyperframesVideo(videoScript, style, voiceoverPath, postText) {
  const timestamp   = Date.now();
  const projectSlug = `${style}-${timestamp}`;
  const projectDir  = path.resolve(`video-projects/${projectSlug}`);
  const htmlPath    = path.join(projectDir, "index.html");
  const outputPath  = path.resolve(`generated_imgs/video-${timestamp}.mp4`);

  fs.mkdirSync(path.join(projectDir, "renders"), { recursive: true });
  fs.mkdirSync("generated_imgs", { recursive: true });

  fs.writeFileSync(path.join(projectDir, "hyperframes.json"), JSON.stringify({
    "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
    "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
    "paths": { "blocks": "compositions", "components": "compositions/components", "assets": "assets" },
  }, null, 2));
  fs.writeFileSync(path.join(projectDir, "meta.json"), JSON.stringify({
    "id": projectSlug, "name": projectSlug, "createdAt": new Date().toISOString(),
  }, null, 2));

  // ── PRE-RENDER SETUP ───────────────────────────────────────────────────────
  await ensureBCGJingle();
  await ensureSFXLibrary();

  const company = detectCompanyFromText(postText ?? "");
  if (company) console.log(`[Agent X] Company detected: ${company}`);

  const logoAbsPath = company ? await fetchCompanyLogo(company) : null;

  let screenshotAbsPath = null;
  if (!SILENT_STYLES.has(style)) {
    const newsUrl = await fetchNewsUrl(postText ?? "");
    if (newsUrl) {
      screenshotAbsPath = await captureSourceScreenshot(
        newsUrl,
        `assets/screenshots/source-${timestamp}.png`
      );
    }
  }

  // Build relative paths from the project HTML file
  const rel = (absOrRel) =>
    absOrRel ? path.relative(projectDir, path.resolve(absOrRel)) : null;

  const paths = {
    jingle:     rel("assets/bcg-jingle.mp3"),
    logo:       rel(logoAbsPath),
    screenshot: rel(screenshotAbsPath),
    sfx: {
      swoosh: rel("assets/sfx/swoosh.mp3"),
      pop:    rel("assets/sfx/pop.mp3"),
      riser:  rel("assets/sfx/riser.mp3"),
      impact: rel("assets/sfx/impact.mp3"),
    },
  };

  // ── VOICEOVER GENERATION ───────────────────────────────────────────────────
  const isCarousel = !SILENT_STYLES.has(style);
  let screenDurations = null;

  if (isCarousel) {
    console.log(`[Agent X] Generating voiceovers...`);
    try {
      const voiceovers = await generateAllVoiceovers(videoScript, style, projectDir);
      screenDurations  = voiceovers.map((v) => v.durationSeconds);
      console.log(`[Agent X] Voiceovers done. Durations: ${screenDurations.join(", ")}`);
    } catch (err) {
      console.warn(`[Agent X] Voiceover failed — silent fallback: ${err.message}`);
      screenDurations = videoScript.map((s) => (s.screen === 1 ? 2.5 : 6.0));
    }
  }

  // Append a fallback duration if durations don't cover the full script
  while (screenDurations && screenDurations.length < videoScript.length) {
    screenDurations.push(6.0);
  }

  // CTA screen appended for carousel styles
  const ctaScreen = {
    screen:  videoScript.length + 1,
    heading: "Ready to automate?",
    body:    "DM 'START' · @DrevonBullock",
    isCTA:   true,
  };
  const fullScript = isCarousel ? [...videoScript, ctaScreen] : videoScript;
  if (isCarousel) screenDurations = [...screenDurations, 4.0];

  console.log(`[Agent X] Building: ${style} (9:16, ${fullScript.length} screens)`);

  // ── BUILD HTML ─────────────────────────────────────────────────────────────
  let html;
  switch (style) {
    case "hook_reveal":
      html = buildHookReveal(videoScript, paths);
      break;
    case "stat_stack":
      html = buildStatStack(fullScript, screenDurations, paths);
      break;
    case "problem_solution":
      html = buildProblemSolution(fullScript, screenDurations, paths);
      break;
    case "review_card":
      html = buildReviewCard(videoScript, paths);
      break;
    default:
      html = buildListCountdown(fullScript, screenDurations, paths);
      break;
  }

  fs.writeFileSync(htmlPath, html, "utf8");
  console.log(`[Agent X] HTML written: ${htmlPath}`);

  // ── LINT ───────────────────────────────────────────────────────────────────
  try {
    execSync("npx hyperframes lint", { cwd: projectDir, stdio: "pipe", timeout: 30000 });
    console.log(`[Agent X] Lint passed`);
  } catch (err) {
    const lintOut = err.stdout?.toString() ?? err.message;
    console.warn(`[Agent X] Lint warnings: ${lintOut.slice(0, 300)}`);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  console.log(`[Agent X] Rendering ${style}...`);
  try {
    execSync(
      `npx hyperframes render "${projectDir}" --output "${outputPath}" --quality standard`,
      { cwd: projectDir, stdio: "inherit", timeout: 20 * 60 * 1000 }
    );
  } catch (err) {
    if (err.code === "ETIMEDOUT" && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000) {
      console.log(`[Agent X] Render timed out post-completion — output exists, continuing.`);
    } else {
      throw new Error(`Hyperframes render failed: ${err.message}`);
    }
  }

  const sizeMB = fs.existsSync(outputPath)
    ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)
    : "?";
  console.log(`[Agent X] Video ready: ${outputPath} (${sizeMB} MB)`);
  return outputPath;
}
