import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ffmpeg = process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";

// BCG palette
const BG    = "#0A0A0A";
const ORANGE = "#FF6B00";
const WHITE  = "#FFFFFF";
const NAVY   = "#1c2433";

// GSAP CDN
const GSAP_CDN = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`;

// ─── HTML BUILDERS ────────────────────────────────────────────────────────────

function buildHookReveal(videoScript, projectDir) {
  const hook = videoScript[0];
  const heading = (hook?.heading ?? "").toUpperCase();
  const words   = heading.split(/\s+/).filter(Boolean);
  const wordSpans = words
    .map((w, i) => `<span class="word clip" data-start="${(i * 0.15).toFixed(2)}" data-duration="8" data-track-index="${i + 2}">${w}</span>`)
    .join(" ");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
${GSAP_CDN}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1080px; overflow: hidden; background: ${BG}; }
.stage {
  position: relative; width: 1080px; height: 1080px;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
}
.vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 30%, #000 95%);
}
.hook-text {
  position: relative; z-index: 2;
  text-align: center; padding: 0 80px;
  line-height: 1.15;
}
.word {
  display: inline-block;
  font-size: 96px; font-weight: 900;
  color: ${WHITE};
  text-shadow: 0 0 40px rgba(255,107,0,0.4);
  margin: 0 8px;
}
.underline {
  position: absolute; bottom: -24px; left: 50%;
  width: 0; height: 6px; background: ${ORANGE};
  transform: translateX(-50%); border-radius: 3px;
}
</style>
</head>
<body>
<div id="hook-reveal" class="stage clip"
  data-composition-id="hook-reveal"
  data-start="0" data-width="1080" data-height="1080" data-duration="8"
  data-track-index="0">
  <div class="vignette"></div>
  <div class="hook-text">
    ${wordSpans}
    <div class="underline" id="ul"></div>
  </div>
</div>
<script>
(() => {
  const SLOT = 8;
  const tl = gsap.timeline({ paused: true });
  tl.from('.word', {
    y: 30, opacity: 0, duration: 0.3, stagger: 0.15, ease: 'power3.out'
  }, 0);
  tl.to('#ul', {
    width: '60%', duration: 0.5, ease: 'power2.out'
  }, ${(words.length * 0.15 + 0.1).toFixed(2)});
  tl.to({}, { duration: SLOT }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['hook-reveal'] = tl;
})();
</script>
</body>
</html>`;
}

function buildStatStack(videoScript, projectDir) {
  const screens = videoScript.slice(1, 4);
  const dur = 12;
  const perScreen = 4;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
${GSAP_CDN}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1080px; overflow: hidden; background: ${BG}; }
.stage { position: relative; width: 1080px; height: 1080px; }
.vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  background: radial-gradient(ellipse at center, transparent 30%, #000 95%);
}
.stat-screen {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 80px;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
}
.stat-heading {
  font-size: 80px; font-weight: 900; color: ${ORANGE}; text-align: center;
  text-shadow: 0 0 40px rgba(255,107,0,0.5); line-height: 1.1; margin-bottom: 32px;
}
.stat-body {
  font-size: 32px; font-weight: 500; color: ${WHITE}; text-align: center;
  opacity: 0.9; line-height: 1.5; max-width: 860px;
}
</style>
</head>
<body>
<div id="stat-stack" class="stage clip"
  data-composition-id="stat-stack"
  data-start="0" data-width="1080" data-height="1080" data-duration="${dur}"
  data-track-index="0">
  <div class="vignette"></div>
  ${screens.map((s, i) => `
  <div class="stat-screen" id="ss${i}" data-start="${i * perScreen}" data-duration="${perScreen}" data-track-index="${i + 1}">
    <div class="stat-heading">${escHtml(s.heading)}</div>
    <div class="stat-body">${escHtml(s.body || s.points?.join(' ') || '')}</div>
  </div>`).join('')}
</div>
${screens.length > 0 ? `<audio id="vo" src="voice_2.mp3" data-start="0" data-volume="1.0"></audio>` : ''}
<script>
(() => {
  const SLOT = ${dur};
  const tl = gsap.timeline({ paused: true });
  ${screens.map((_, i) => `
  tl.from('#ss${i} .stat-heading', { x: 80, opacity: 0, duration: 0.6, ease: 'power3.out' }, ${i * perScreen + 0.2});
  tl.from('#ss${i} .stat-body',    { opacity: 0, duration: 0.5, ease: 'power2.out' }, ${i * perScreen + 0.6});`).join('')}
  tl.to({}, { duration: SLOT }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['stat-stack'] = tl;
})();
</script>
</body>
</html>`;
}

function buildProblemSolution(videoScript, projectDir, voiceoverPath) {
  const problem = videoScript[0] ?? {};
  const solution = videoScript[1] ?? {};
  const dur = 12;
  const audioTag = voiceoverPath
    ? `<audio id="vo" src="${path.basename(voiceoverPath)}" data-start="0" data-volume="1.0"></audio>`
    : '';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
${GSAP_CDN}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1080px; overflow: hidden; background: ${BG}; }
.stage { position: relative; width: 1080px; height: 1080px; overflow: hidden; }
.panel {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 80px;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
}
.problem-panel { background: linear-gradient(135deg, #1a0a0a 0%, ${BG} 100%); }
.solution-panel { background: linear-gradient(135deg, #1a0d00 0%, ${BG} 100%); }
.panel-tint {
  position: absolute; inset: 0; pointer-events: none;
}
.problem-tint { background: rgba(180, 30, 30, 0.08); }
.solution-tint { background: rgba(255, 107, 0, 0.08); }
.panel-heading {
  font-size: 72px; font-weight: 900; text-align: center; line-height: 1.1; margin-bottom: 28px;
}
.problem-heading { color: #ff4444; }
.solution-heading { color: ${ORANGE}; }
.panel-body {
  font-size: 30px; font-weight: 400; color: ${WHITE}; text-align: center;
  opacity: 0.9; line-height: 1.6; max-width: 860px;
}
.wipe-bar {
  position: absolute; inset: 0;
  background: ${WHITE}; transform: translateX(-100%);
}
.vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  background: radial-gradient(ellipse at center, transparent 30%, #000 95%);
}
</style>
</head>
<body>
<div id="problem-solution" class="stage clip"
  data-composition-id="problem-solution"
  data-start="0" data-width="1080" data-height="1080" data-duration="${dur}"
  data-track-index="0">
  <div class="vignette"></div>
  <div class="panel problem-panel" id="prob">
    <div class="panel-tint problem-tint"></div>
    <div class="panel-heading problem-heading">${escHtml(problem.heading ?? 'The Problem')}</div>
    <div class="panel-body">${escHtml(problem.body || problem.points?.join(' ') || '')}</div>
  </div>
  <div class="panel solution-panel" id="sol" style="transform:translateX(100%)">
    <div class="panel-tint solution-tint"></div>
    <div class="panel-heading solution-heading">${escHtml(solution.heading ?? 'The Solution')}</div>
    <div class="panel-body">${escHtml(solution.body || solution.points?.join(' ') || '')}</div>
  </div>
  <div class="wipe-bar" id="wipe"></div>
</div>
${audioTag}
<script>
(() => {
  const SLOT = ${dur};
  const tl = gsap.timeline({ paused: true });
  tl.from('#prob .panel-heading', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.3);
  tl.from('#prob .panel-body',    { opacity: 0, duration: 0.5 }, 0.9);
  tl.to('#wipe',  { x: '100%', duration: 0.4, ease: 'power3.in' }, 5.0);
  tl.to('#prob',  { x: '-100%', duration: 0.3, ease: 'power2.in' }, 5.0);
  tl.set('#sol',  { x: '0%' }, 5.4);
  tl.to('#wipe',  { x: '200%', duration: 0.4, ease: 'power3.out' }, 5.4);
  tl.from('#sol .panel-heading', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' }, 5.5);
  tl.from('#sol .panel-body',    { opacity: 0, duration: 0.5 }, 6.1);
  tl.to({}, { duration: SLOT }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['problem-solution'] = tl;
})();
</script>
</body>
</html>`;
}

function buildListCountdown(videoScript, screenDurations, projectDir) {
  const hookScreen     = videoScript[0];
  const teachScreens   = videoScript.slice(1);
  const teachCount     = teachScreens.length;
  const totalDur       = (screenDurations ?? []).reduce((a, b) => a + b, 0) || (2 + teachCount * 8);

  const hookDur  = screenDurations?.[0] ?? 2;
  let cumulativeTime = 0;

  const hookHtml = `
  <div class="screen hook-screen clip" id="sc1"
       data-start="0" data-duration="${hookDur}" data-track-index="1">
    <div class="hook-heading">${escHtml(hookScreen?.heading ?? '')}</div>
    <audio src="voice_1.mp3" data-start="0" data-volume="1.0"></audio>
  </div>`;

  cumulativeTime += hookDur;

  const teachHtml = teachScreens.map((s, i) => {
    const dur  = screenDurations?.[i + 1] ?? 8;
    const num  = teachCount - i;
    const st   = cumulativeTime.toFixed(2);
    cumulativeTime += dur;
    const body = s.body || (s.points ?? []).join(' ') || '';
    const pointsHtml = Array.isArray(s.points) && s.points.length
      ? s.points.map(p => `<li>${escHtml(p)}</li>`).join('')
      : `<li>${escHtml(body)}</li>`;
    return `
  <div class="screen teach-screen clip" id="sc${i + 2}"
       data-start="${st}" data-duration="${dur}" data-track-index="${i + 2}">
    <div class="countdown-number">${num}</div>
    <div class="teach-heading">${escHtml(s.heading)}</div>
    <ul class="teach-points">${pointsHtml}</ul>
    <audio src="voice_${i + 2}.mp3" data-start="${st}" data-volume="1.0"></audio>
  </div>`;
  }).join('');

  const hookTweens = `
  tl.from('#sc1 .hook-heading', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.4)' }, 0);`;

  const teachTweens = teachScreens.map((_, i) => {
    const st = (screenDurations?.slice(0, i + 1).reduce((a, b) => a + b, 0) ?? (hookDur + i * 8));
    return `
  tl.from('#sc${i + 2} .countdown-number', { scale: 1.8, opacity: 0, duration: 0.4, ease: 'power3.out' }, ${st.toFixed(2)});
  tl.from('#sc${i + 2} .teach-heading',    { y: 30, opacity: 0, duration: 0.4, ease: 'power2.out' }, ${(st + 0.3).toFixed(2)});
  tl.from('#sc${i + 2} .teach-points li',  { y: 20, opacity: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out' }, ${(st + 0.55).toFixed(2)});`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
${GSAP_CDN}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1080px; overflow: hidden; background: ${BG}; }
.stage { position: relative; width: 1080px; height: 1080px; }
.vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
  background: radial-gradient(ellipse at center, transparent 30%, #000 95%);
}
.screen {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 80px;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
}
.hook-heading {
  font-size: 88px; font-weight: 900; color: ${WHITE}; text-align: center;
  line-height: 1.15; text-shadow: 0 0 40px rgba(255,107,0,0.35);
}
.countdown-number {
  font-size: 160px; font-weight: 900; color: ${ORANGE};
  line-height: 1; margin-bottom: 16px;
  text-shadow: 0 0 60px rgba(255,107,0,0.6);
}
.teach-heading {
  font-size: 60px; font-weight: 800; color: ${WHITE}; text-align: center;
  line-height: 1.2; margin-bottom: 32px; max-width: 900px;
}
.teach-points {
  list-style: none; display: flex; flex-direction: column; gap: 18px;
  max-width: 880px; width: 100%;
}
.teach-points li {
  font-size: 28px; color: rgba(255,255,255,0.88); line-height: 1.5;
  padding-left: 24px; position: relative;
}
.teach-points li::before {
  content: '→'; position: absolute; left: 0; color: ${ORANGE}; font-weight: 700;
}
</style>
</head>
<body>
<div id="list-countdown" class="stage clip"
  data-composition-id="list-countdown"
  data-start="0" data-width="1080" data-height="1080" data-duration="${totalDur.toFixed(2)}"
  data-track-index="0">
  <div class="vignette"></div>
  ${hookHtml}
  ${teachHtml}
</div>
<script>
(() => {
  const SLOT = ${totalDur.toFixed(2)};
  const tl = gsap.timeline({ paused: true });
  ${hookTweens}
  ${teachTweens}
  tl.to({}, { duration: SLOT }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['list-countdown'] = tl;
})();
</script>
</body>
</html>`;
}

function buildReviewCard(videoScript, projectDir) {
  const screen  = videoScript[0] ?? {};
  const quote   = screen.heading ?? '';
  const attr    = screen.body ?? '';
  const words   = quote.split(/\s+/).filter(Boolean);
  const wordSpans = words
    .map((w, i) => `<span class="word clip" data-start="${(0.3 + i * 0.15).toFixed(2)}" data-duration="8" data-track-index="${i + 2}">${escHtml(w)}</span>`)
    .join(' ');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
${GSAP_CDN}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1080px; overflow: hidden; background: ${BG}; }
.stage {
  position: relative; width: 1080px; height: 1080px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 80px;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
}
.vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 30%, #000 95%);
}
.quotemark {
  position: absolute; top: 40px; left: 60px;
  font-size: 280px; color: ${ORANGE}; opacity: 0;
  line-height: 1; font-family: Georgia, serif; font-weight: 700;
}
.quote-text {
  position: relative; z-index: 2; text-align: center;
  font-size: 52px; font-weight: 700; color: ${WHITE}; line-height: 1.35;
  max-width: 900px; margin-bottom: 48px;
}
.word { display: inline-block; margin: 0 4px; }
.attribution {
  position: relative; z-index: 2;
  font-size: 24px; color: ${ORANGE}; font-weight: 600;
  opacity: 0; transform: translateY(20px);
}
</style>
</head>
<body>
<div id="review-card" class="stage clip"
  data-composition-id="review-card"
  data-start="0" data-width="1080" data-height="1080" data-duration="8"
  data-track-index="0">
  <div class="vignette"></div>
  <div class="quotemark" id="qm">&ldquo;</div>
  <div class="quote-text">${wordSpans}</div>
  <div class="attribution" id="attr">${escHtml(attr)}</div>
</div>
<script>
(() => {
  const SLOT = 8;
  const tl = gsap.timeline({ paused: true });
  tl.to('#qm', { opacity: 0.15, duration: 0.6, ease: 'power2.out' }, 0);
  tl.from('.word', { y: 20, opacity: 0, duration: 0.3, stagger: 0.15, ease: 'power3.out' }, 0.3);
  tl.to('#attr', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, ${(0.3 + words.length * 0.15 + 0.5).toFixed(2)});
  tl.to({}, { duration: SLOT }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['review-card'] = tl;
})();
</script>
</body>
</html>`;
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function generateHyperframesVideo(videoScript, style, voiceoverPath, screenDurations) {
  const timestamp   = Date.now();
  const projectSlug = `${style}-${timestamp}`;
  const projectDir  = path.resolve(`video-projects/${projectSlug}`);
  const htmlPath    = path.join(projectDir, 'index.html');
  const outputPath  = path.resolve(`generated_imgs/video-${timestamp}.mp4`);

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync('generated_imgs', { recursive: true });

  console.log(`[Agent X] Building Hyperframes composition: ${style}`);

  let html;
  switch (style) {
    case 'hook_reveal':
      html = buildHookReveal(videoScript, projectDir);
      break;
    case 'stat_stack':
      html = buildStatStack(videoScript, projectDir);
      break;
    case 'problem_solution':
      html = buildProblemSolution(videoScript, projectDir, voiceoverPath);
      break;
    case 'list_countdown':
      html = buildListCountdown(videoScript, screenDurations, projectDir);
      break;
    case 'review_card':
      html = buildReviewCard(videoScript, projectDir);
      break;
    default:
      html = buildListCountdown(videoScript, screenDurations, projectDir);
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`[Agent X] HTML written: ${htmlPath}`);

  // Lint before render
  try {
    console.log(`[Agent X] Linting composition...`);
    execSync(`npx hyperframes lint "${htmlPath}"`, {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 30000,
    });
    console.log(`[Agent X] Lint passed`);
  } catch (err) {
    const lintOut = err.stdout?.toString() ?? err.message;
    console.warn(`[Agent X] Lint warnings — proceeding: ${lintOut.slice(0, 200)}`);
  }

  // Render to MP4
  console.log(`[Agent X] Rendering with Hyperframes...`);
  try {
    execSync(
      `npx hyperframes render "${htmlPath}" --output "${outputPath}" --quality standard`,
      {
        cwd: projectDir,
        stdio: 'inherit',
        timeout: 10 * 60 * 1000,
      }
    );
  } catch (err) {
    throw new Error(`Hyperframes render failed: ${err.message}`);
  }

  const sizeMB = fs.existsSync(outputPath)
    ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)
    : '?';
  console.log(`[Agent X] Video ready: ${outputPath} (${sizeMB} MB)`);
  return outputPath;
}
