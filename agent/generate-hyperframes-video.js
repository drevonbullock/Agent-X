import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generateAllVoiceovers } from "./elevenlabs.js";
// (no Gemini — using curated stock images instead)

const ffmpeg = process.platform === "linux" ? "/usr/bin/ffmpeg" : "/opt/homebrew/bin/ffmpeg";

// BCG palette
const BG     = "#080E1C";
const ORANGE = "#FF6B00";
const WHITE  = "#FFFFFF";
const GSAP_CDN = `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`;

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── STOCK IMAGE FETCHER ─────────────────────────────────────────────────────
// Downloads curated Unsplash professional photos per screen theme.
// Saves into projectDir so Hyperframes can load them locally.

const STOCK_PHOTOS = {
  hook:     '1518770660439-4636190af475', // glowing circuit board
  email:    '1542744173-8e7e53415bb0',    // laptop & coffee, professional
  lead:     '1556761175-b413da4baf72',    // business handshake
  report:   '1551288049-bebda4e38f71',    // analytics dashboard
  workflow: '1526374965328-7f61d4dc18c5', // abstract data / code streams
  office:   '1497366216548-37526070297c', // modern open office
  cta:      '1477959858617-67f85cf4f1df', // city skyline at night, cinematic
  default:  '1507003211169-0a1dd7228f2d', // professional portrait (neutral)
};

function pickPhotoId(s, idx) {
  if (s.isCTA) return STOCK_PHOTOS.cta;
  if (idx === 0) return STOCK_PHOTOS.hook;
  const h = (s.heading ?? '').toLowerCase();
  if (h.includes('email'))                      return STOCK_PHOTOS.email;
  if (h.includes('lead') || h.includes('crm'))  return STOCK_PHOTOS.lead;
  if (h.includes('report') || h.includes('analytic')) return STOCK_PHOTOS.report;
  if (h.includes('workflow') || h.includes('automat')) return STOCK_PHOTOS.workflow;
  return STOCK_PHOTOS.office;
}

async function fetchScreenImages(fullScript, projectDir) {
  console.log(`[Agent X] Downloading ${fullScript.length} stock images...`);
  const results = [];
  for (let i = 0; i < fullScript.length; i++) {
    const photoId = pickPhotoId(fullScript[i], i);
    const url     = `https://images.unsplash.com/photo-${photoId}?w=1080&h=420&fit=crop&q=80&auto=format`;
    const imgPath = path.join(projectDir, `bg_${i + 1}.jpg`);
    try {
      const res = await fetch(url, { headers: { 'Accept': 'image/jpeg' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(imgPath, Buffer.from(await res.arrayBuffer()));
      results.push(`bg_${i + 1}.jpg`);
      console.log(`[Agent X] Image ${i + 1}/${fullScript.length} ✓`);
    } catch (err) {
      console.warn(`[Agent X] Image ${i + 1} failed: ${err.message.slice(0, 60)}`);
      results.push(null);
    }
  }
  return results;
}

// ─── LIQUID GLASS COUNTDOWN ───────────────────────────────────────────────────
// Dark background. Glass panel in upper section. Image card clips in from below.
// Images are animated content elements — NOT background fills.

function buildLiquidCountdown(fullScript, screenDurations, projectDir, bgImages) {
  const hookDur     = screenDurations[0];
  const mainScreens = fullScript.slice(1, -1);
  const ctaDur      = screenDurations[screenDurations.length - 1];
  const totalDur    = screenDurations.reduce((a, b) => a + b, 0);
  const badgeRepeat = Math.max(1, Math.floor((ctaDur - 1.5) / 1.6) - 1);

  const starts = screenDurations.reduce((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + screenDurations[i - 1]);
    return acc;
  }, []);

  // Image card html — clips in below glass panel as a content element
  function imgCard(imgFile, id) {
    if (!imgFile) return '';
    return `<div class="img-card" id="${id}">
  <img src="${imgFile}" class="img-fill" id="${id}f"/>
  <div class="img-shine"></div>
</div>`;
  }

  // ── HTML SCREENS ─────────────────────────────────────────────────────────────

  const hookText  = fullScript[0]?.heading ?? "";
  const hookWords = hookText.split(/\s+/).filter(Boolean);
  const hookWordSpans = hookWords.map(w => `<span class="hw">${escHtml(w)}</span>`).join(" ");

  // Hook — centered glass card only, no image
  const hookHtml = `
<div class="screen clip" id="sc1" data-start="0" data-duration="${hookDur.toFixed(2)}" data-track-index="1">
  <div class="glass-card hook-card" id="hc">
    <div class="shimmer" id="hshimmer"></div>
    <div class="hook-words">${hookWordSpans}</div>
    <div class="hook-bar" id="hbar"></div>
  </div>
  <audio id="vo-sc1" src="voice_1.mp3" data-start="0" data-volume="1.0"></audio>
</div>`;

  // Teach screens — glass panel top, image card clips in below
  const teachHtml = mainScreens.map((s, i) => {
    const scIdx  = i + 2;
    const dur    = screenDurations[i + 1];
    const st     = starts[i + 1].toFixed(2);
    const num    = mainScreens.length - i;
    const points = Array.isArray(s.points) && s.points.length ? s.points : [s.body ?? ""].filter(Boolean);
    const pHtml  = points.map(p => `<li class="tp"><span class="tp-arrow">→</span><span>${escHtml(p)}</span></li>`).join("");
    const card   = imgCard(bgImages[i + 1], `ic${scIdx}`);
    return `
<div class="screen clip" id="sc${scIdx}" data-start="${st}" data-duration="${dur.toFixed(2)}" data-track-index="${scIdx}">
  <div class="glass-card teach-card" id="tc${scIdx}">
    <div class="shimmer" id="ts${scIdx}"></div>
    <div class="tc-num">${num}</div>
    <div class="tc-heading">${escHtml(s.heading)}</div>
    <ul class="tc-points">${pHtml}</ul>
  </div>
  ${card}
  <audio id="vo-sc${scIdx}" src="voice_${scIdx}.mp3" data-start="${st}" data-volume="1.0"></audio>
</div>`;
  }).join("");

  // CTA — centered glass card, no image
  const ctaSt    = starts[starts.length - 1].toFixed(2);
  const ctaStart = starts[starts.length - 1];
  const ctaHtml  = `
<div class="screen clip" id="sc-cta" data-start="${ctaSt}" data-duration="${ctaDur.toFixed(2)}" data-track-index="${fullScript.length}">
  <div class="glass-card cta-card" id="ctac">
    <div class="shimmer" id="cshimmer"></div>
    <div class="cta-eyebrow">READY TO AUTOMATE?</div>
    <div class="cta-main">DM <span class="cta-kw">"START"</span></div>
    <div class="cta-sub">@DrevonBullock on Instagram</div>
    <div class="cta-badge" id="cbadge">BCG · AI Automation for Business Owners</div>
  </div>
</div>`;

  // ── GSAP TWEENS ──────────────────────────────────────────────────────────────
  const H = 0.05; // hook animation offset

  // Image cut-in: alternates left / right / up per screen
  const cutDirs = ['left', 'right', 'up'];
  const teachTweens = mainScreens.map((_, i) => {
    const scIdx = i + 2;
    const st    = starts[i + 1];
    const dur   = screenDurations[i + 1];
    const dir   = cutDirs[i % 3];
    const fromX = dir === 'left' ? -340 : dir === 'right' ? 340 : 0;
    const fromY = dir === 'up' ? 340 : 0;
    return `
  tl.fromTo('#tc${scIdx}',
    {y:50,opacity:0,filter:'blur(14px)',scale:0.95},
    {y:0,opacity:1,filter:'blur(0px)',scale:1,duration:0.5,ease:'back.out(1.5)'},${st.toFixed(2)});
  tl.fromTo('#tc${scIdx} .tc-num',{scale:1.6,opacity:0},{scale:1,opacity:1,duration:0.4,ease:'elastic.out(1,0.5)'},${(st+0.1).toFixed(2)});
  tl.fromTo('#tc${scIdx} .tc-heading',{x:-24,opacity:0},{x:0,opacity:1,duration:0.38,ease:'power3.out'},${(st+0.32).toFixed(2)});
  tl.fromTo('#tc${scIdx} .tp',{x:-18,opacity:0},{x:0,opacity:1,duration:0.32,stagger:0.11,ease:'power2.out'},${(st+0.55).toFixed(2)});
  tl.fromTo('#ts${scIdx}',{x:'-110%'},{x:'110%',duration:1.0,ease:'power2.inOut'},${(st+0.2).toFixed(2)});
  tl.fromTo('#ic${scIdx}',
    {x:${fromX},y:${fromY},opacity:0,scale:0.92},
    {x:0,y:0,opacity:1,scale:1,duration:0.55,ease:'back.out(1.2)'},${(st+0.55).toFixed(2)});
  tl.to('#ic${scIdx}f',{scale:1.06,duration:${dur.toFixed(2)},ease:'none'},${st.toFixed(2)});`;
  }).join("");

  return `<!DOCTYPE html><html>
<head>
<meta charset="UTF-8"/>
${GSAP_CDN}
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1080px;overflow:hidden;background:#080E1C;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;}
.stage{position:relative;width:1080px;height:1080px;}
audio{display:none;}
/* All screens */
.screen{
  position:absolute;inset:0;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;
  background:linear-gradient(165deg,#152845 0%,#0c1a30 100%);
}
/* Hook + CTA: centered */
#sc1,#sc-cta{justify-content:center;}
/* Teach screens: stack glass + image card with gap, centered as a group */
#sc2,#sc3,#sc4,#sc5{justify-content:center;gap:22px;padding:44px 0;}
/* ── LIQUID GLASS ── */
.glass-card{
  position:relative;z-index:2;width:92%;
  background:linear-gradient(135deg,rgba(255,255,255,0.13)0%,rgba(255,255,255,0.05)50%,rgba(255,255,255,0.09)100%);
  backdrop-filter:blur(40px) saturate(180%) brightness(1.1);
  -webkit-backdrop-filter:blur(40px) saturate(180%) brightness(1.1);
  border-radius:30px;
  border:1px solid rgba(255,255,255,0.20);
  box-shadow:0 8px 56px rgba(0,0,0,0.65),0 2px 8px rgba(0,0,0,0.3),inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -1px 0 rgba(0,0,0,0.15);
  overflow:hidden;
}
.glass-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:46%;
  background:linear-gradient(180deg,rgba(255,255,255,0.11)0%,transparent 100%);
  border-radius:30px 30px 0 0;pointer-events:none;z-index:1;
}
.shimmer{
  position:absolute;inset:0;z-index:2;pointer-events:none;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,0.16)50%,transparent 72%);
  transform:translateX(-110%);
}
/* Hook */
.hook-card{padding:60px 72px;text-align:center;}
.hook-words{position:relative;z-index:3;line-height:1.2;}
.hw{display:inline-block;margin:0 5px;font-size:90px;font-weight:900;color:#fff;text-shadow:0 0 50px rgba(255,107,0,0.4);}
.hw:last-child{color:${ORANGE};text-shadow:0 0 80px rgba(255,107,0,0.85);}
.hook-bar{position:relative;z-index:3;height:5px;width:0;background:${ORANGE};border-radius:3px;margin:26px auto 0;box-shadow:0 0 18px rgba(255,107,0,0.75);}
/* Teach */
.teach-card{padding:28px 48px 32px;}
.tc-num{font-size:100px;font-weight:900;color:${ORANGE};line-height:1;text-shadow:0 0 70px rgba(255,107,0,0.7);position:relative;z-index:3;}
.tc-heading{font-size:52px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:18px;position:relative;z-index:3;}
.tc-points{list-style:none;display:flex;flex-direction:column;gap:12px;position:relative;z-index:3;}
.tp{display:flex;align-items:flex-start;gap:13px;font-size:26px;color:rgba(255,255,255,0.91);line-height:1.4;}
.tp-arrow{color:${ORANGE};font-weight:700;flex-shrink:0;}
/* Image card — flex child, stacks below glass panel */
.img-card{
  width:92%;flex-shrink:0;height:256px;
  border-radius:20px;overflow:hidden;
  border:1px solid rgba(255,255,255,0.11);
  box-shadow:0 14px 52px rgba(0,0,0,0.7),0 2px 8px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.08);
  z-index:3;
}
.img-fill{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}
.img-shine{position:absolute;inset:0;background:linear-gradient(160deg,rgba(255,255,255,0.06)0%,transparent 60%),linear-gradient(to bottom,transparent 60%,rgba(6,12,24,0.5)100%);}
/* CTA */
.cta-card{padding:52px 76px;text-align:center;}
.cta-eyebrow{font-size:14px;font-weight:800;letter-spacing:4px;color:${ORANGE};margin-bottom:20px;position:relative;z-index:3;}
.cta-main{font-size:84px;font-weight:900;color:#fff;line-height:1;text-shadow:0 0 36px rgba(255,107,0,0.35);margin-bottom:16px;position:relative;z-index:3;}
.cta-kw{color:${ORANGE};text-shadow:0 0 56px rgba(255,107,0,0.85);}
.cta-sub{font-size:30px;color:rgba(255,255,255,0.72);margin-bottom:34px;position:relative;z-index:3;}
.cta-badge{display:inline-block;padding:11px 26px;border-radius:100px;background:rgba(255,107,0,0.11);border:1.5px solid rgba(255,107,0,0.42);color:${ORANGE};font-size:14px;font-weight:700;letter-spacing:1.5px;position:relative;z-index:3;}
</style>
</head>
<body>
<div id="liquid-countdown" class="stage clip"
  data-composition-id="liquid-countdown"
  data-start="0" data-width="1080" data-height="1080" data-duration="${totalDur.toFixed(2)}"
  data-track-index="0">
  ${hookHtml}${teachHtml}${ctaHtml}
</div>
<script>
(() => {
  const tl = gsap.timeline({ paused: true });

  /* Hook */
  tl.fromTo('#hc',{scale:0.88,opacity:0,filter:'blur(20px)'},{scale:1,opacity:1,filter:'blur(0px)',duration:0.5,ease:'back.out(1.6)'},${H});
  tl.fromTo('.hw',{y:46,opacity:0,filter:'blur(10px)'},{y:0,opacity:1,filter:'blur(0px)',duration:0.48,stagger:0.09,ease:'back.out(1.7)'},${(H+0.05).toFixed(2)});
  tl.to('#hbar',{width:'60%',duration:0.48,ease:'power3.out'},${(H+hookWords.length*0.09+0.18).toFixed(2)});
  tl.fromTo('#hshimmer',{x:'-110%'},{x:'110%',duration:0.9,ease:'power2.inOut'},${(H+0.28).toFixed(2)});

  ${teachTweens}

  /* CTA */
  tl.fromTo('#ctac',{scale:0.87,opacity:0,filter:'blur(20px)'},{scale:1,opacity:1,filter:'blur(0px)',duration:0.62,ease:'back.out(1.5)'},${ctaStart.toFixed(2)});
  tl.fromTo('#sc-cta .cta-eyebrow',{y:18,opacity:0},{y:0,opacity:1,duration:0.38,ease:'power3.out'},${(ctaStart+0.32).toFixed(2)});
  tl.fromTo('#sc-cta .cta-main',{y:28,opacity:0},{y:0,opacity:1,duration:0.42,ease:'power3.out'},${(ctaStart+0.52).toFixed(2)});
  tl.fromTo('#sc-cta .cta-sub',{opacity:0},{opacity:1,duration:0.38,ease:'power2.out'},${(ctaStart+0.82).toFixed(2)});
  tl.fromTo('#cbadge',{scale:0.8,opacity:0},{scale:1,opacity:1,duration:0.38,ease:'back.out(1.7)'},${(ctaStart+1.05).toFixed(2)});
  tl.to('#cbadge',{boxShadow:'0 0 34px rgba(255,107,0,0.72)',duration:0.8,repeat:${badgeRepeat},yoyo:true,ease:'power2.inOut'},${(ctaStart+1.45).toFixed(2)});
  tl.fromTo('#cshimmer',{x:'-110%'},{x:'110%',duration:1.1,ease:'power2.inOut'},${(ctaStart+0.38).toFixed(2)});

  tl.to({},{duration:${totalDur.toFixed(2)}},0);
  window.__timelines=window.__timelines||{};
  window.__timelines['liquid-countdown']=tl;
})();
</script>
</body>
</html>`;
}

// ─── LEGACY BUILDERS (kept for other styles) ─────────────────────────────────

function buildHookReveal(videoScript, projectDir) {
  const hook = videoScript[0];
  const heading = (hook?.heading ?? "").toUpperCase();
  const words   = heading.split(/\s+/).filter(Boolean);
  const wordSpans = words
    .map((w, i) => `<span class="word clip" data-start="${(i * 0.15).toFixed(2)}" data-duration="8" data-track-index="${i + 2}">${w}</span>`)
    .join(" ");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1080px;overflow:hidden;background:${BG};}
.stage{position:relative;width:1080px;height:1080px;display:flex;align-items:center;justify-content:center;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;}
.vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,#000 95%);}
.hook-text{position:relative;z-index:2;text-align:center;padding:0 80px;line-height:1.15;}
.word{display:inline-block;font-size:96px;font-weight:900;color:${WHITE};text-shadow:0 0 40px rgba(255,107,0,0.4);margin:0 8px;}
.underline{position:absolute;bottom:-24px;left:50%;width:0;height:6px;background:${ORANGE};transform:translateX(-50%);border-radius:3px;}
</style></head><body>
<div id="hook-reveal" class="stage clip" data-composition-id="hook-reveal" data-start="0" data-width="1080" data-height="1080" data-duration="8" data-track-index="0">
  <div class="vignette"></div>
  <div class="hook-text">${wordSpans}<div class="underline" id="ul"></div></div>
</div>
<script>(() => {
  const tl = gsap.timeline({paused:true});
  tl.from('.word',{y:30,opacity:0,duration:0.3,stagger:0.15,ease:'power3.out'},0);
  tl.to('#ul',{width:'60%',duration:0.5,ease:'power2.out'},${(words.length*0.15+0.1).toFixed(2)});
  tl.to({},{duration:8},0);
  window.__timelines=window.__timelines||{};window.__timelines['hook-reveal']=tl;
})();</script></body></html>`;
}

function buildListCountdown(videoScript, screenDurations, projectDir) {
  const hookScreen   = videoScript[0];
  const teachScreens = videoScript.slice(1);
  const totalDur     = (screenDurations ?? []).reduce((a, b) => a + b, 0) || (2 + teachScreens.length * 8);
  const hookDur      = screenDurations?.[0] ?? 2;
  let cumTime = 0;

  const hookHtml = `
  <div class="screen hook-screen clip" id="sc1" data-start="0" data-duration="${hookDur}" data-track-index="1">
    <div class="hook-heading">${escHtml(hookScreen?.heading ?? '')}</div>
    <audio id="vo-sc1" src="voice_1.mp3" data-start="0" data-volume="1.0"></audio>
  </div>`;
  cumTime += hookDur;

  const teachHtml = teachScreens.map((s, i) => {
    const dur  = screenDurations?.[i + 1] ?? 8;
    const num  = teachScreens.length - i;
    const st   = cumTime.toFixed(2);
    cumTime += dur;
    const body = s.body || (s.points ?? []).join(' ') || '';
    const pointsHtml = Array.isArray(s.points) && s.points.length
      ? s.points.map(p => `<li>${escHtml(p)}</li>`).join('')
      : `<li>${escHtml(body)}</li>`;
    return `
  <div class="screen teach-screen clip" id="sc${i+2}" data-start="${st}" data-duration="${dur}" data-track-index="${i+2}">
    <div class="countdown-number">${num}</div>
    <div class="teach-heading">${escHtml(s.heading)}</div>
    <ul class="teach-points">${pointsHtml}</ul>
    <audio id="vo-sc${i+2}" src="voice_${i+2}.mp3" data-start="${st}" data-volume="1.0"></audio>
  </div>`;
  }).join('');

  const hookTweens = `tl.from('#sc1 .hook-heading',{scale:0.8,opacity:0,duration:0.5,ease:'back.out(1.4)'},0);`;
  const teachTweens = teachScreens.map((_, i) => {
    const st = screenDurations?.slice(0,i+1).reduce((a,b)=>a+b,0) ?? (hookDur+i*8);
    return `
  tl.from('#sc${i+2} .countdown-number',{scale:1.8,opacity:0,duration:0.4,ease:'power3.out'},${st.toFixed(2)});
  tl.from('#sc${i+2} .teach-heading',{y:30,opacity:0,duration:0.4,ease:'power2.out'},${(st+0.3).toFixed(2)});
  tl.from('#sc${i+2} .teach-points li',{y:20,opacity:0,duration:0.35,stagger:0.12,ease:'power2.out'},${(st+0.55).toFixed(2)});`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1080px;overflow:hidden;background:${BG};}
.stage{position:relative;width:1080px;height:1080px;}
.vignette{position:absolute;inset:0;pointer-events:none;z-index:10;background:radial-gradient(ellipse at center,transparent 30%,#000 95%);}
.screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;}
.hook-heading{font-size:88px;font-weight:900;color:${WHITE};text-align:center;line-height:1.15;text-shadow:0 0 40px rgba(255,107,0,0.35);}
.countdown-number{font-size:160px;font-weight:900;color:${ORANGE};line-height:1;margin-bottom:16px;text-shadow:0 0 60px rgba(255,107,0,0.6);}
.teach-heading{font-size:60px;font-weight:800;color:${WHITE};text-align:center;line-height:1.2;margin-bottom:32px;max-width:900px;}
.teach-points{list-style:none;display:flex;flex-direction:column;gap:18px;max-width:880px;width:100%;}
.teach-points li{font-size:28px;color:rgba(255,255,255,0.88);line-height:1.5;padding-left:24px;position:relative;}
.teach-points li::before{content:'→';position:absolute;left:0;color:${ORANGE};font-weight:700;}
</style></head><body>
<div id="list-countdown" class="stage clip" data-composition-id="list-countdown" data-start="0" data-width="1080" data-height="1080" data-duration="${totalDur.toFixed(2)}" data-track-index="0">
  <div class="vignette"></div>${hookHtml}${teachHtml}
</div>
<script>(() => {
  const tl = gsap.timeline({paused:true});
  ${hookTweens}${teachTweens}
  tl.to({},{duration:${totalDur.toFixed(2)}},0);
  window.__timelines=window.__timelines||{};window.__timelines['list-countdown']=tl;
})();</script></body></html>`;
}

function buildStatStack(videoScript, projectDir) {
  const screens = videoScript.slice(1, 4);
  const dur = 12; const perScreen = 4;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;background:${BG};}.stage{position:relative;width:1080px;height:1080px;}.vignette{position:absolute;inset:0;pointer-events:none;z-index:10;background:radial-gradient(ellipse at center,transparent 30%,#000 95%);}.stat-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;}.stat-heading{font-size:80px;font-weight:900;color:${ORANGE};text-align:center;text-shadow:0 0 40px rgba(255,107,0,0.5);line-height:1.1;margin-bottom:32px;}.stat-body{font-size:32px;font-weight:500;color:${WHITE};text-align:center;opacity:0.9;line-height:1.5;max-width:860px;}</style></head><body>
<div id="stat-stack" class="stage clip" data-composition-id="stat-stack" data-start="0" data-width="1080" data-height="1080" data-duration="${dur}" data-track-index="0">
  <div class="vignette"></div>
  ${screens.map((s,i)=>`<div class="stat-screen" id="ss${i}" data-start="${i*perScreen}" data-duration="${perScreen}" data-track-index="${i+1}"><div class="stat-heading">${escHtml(s.heading)}</div><div class="stat-body">${escHtml(s.body||s.points?.join(' ')||'')}</div></div>`).join('')}
</div>
<script>(() => {
  const tl = gsap.timeline({paused:true});
  ${screens.map((_,i)=>`tl.from('#ss${i} .stat-heading',{x:80,opacity:0,duration:0.6,ease:'power3.out'},${i*perScreen+0.2});tl.from('#ss${i} .stat-body',{opacity:0,duration:0.5,ease:'power2.out'},${i*perScreen+0.6});`).join('')}
  tl.to({},{duration:${dur}},0);
  window.__timelines=window.__timelines||{};window.__timelines['stat-stack']=tl;
})();</script></body></html>`;
}

function buildProblemSolution(videoScript, projectDir, voiceoverPath) {
  const problem = videoScript[0] ?? {}; const solution = videoScript[1] ?? {};
  const dur = 12;
  const audioTag = voiceoverPath ? `<audio id="vo-ps" src="${path.basename(voiceoverPath)}" data-start="0" data-volume="1.0"></audio>` : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;background:${BG};}.stage{position:relative;width:1080px;height:1080px;overflow:hidden;}.panel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;}.problem-panel{background:linear-gradient(135deg,#1a0a0a 0%,${BG} 100%);}.solution-panel{background:linear-gradient(135deg,#1a0d00 0%,${BG} 100%);}.panel-tint{position:absolute;inset:0;pointer-events:none;}.problem-tint{background:rgba(180,30,30,0.08);}.solution-tint{background:rgba(255,107,0,0.08);}.panel-heading{font-size:72px;font-weight:900;text-align:center;line-height:1.1;margin-bottom:28px;}.problem-heading{color:#ff4444;}.solution-heading{color:${ORANGE};}.panel-body{font-size:30px;font-weight:400;color:${WHITE};text-align:center;opacity:0.9;line-height:1.6;max-width:860px;}.wipe-bar{position:absolute;inset:0;background:${WHITE};transform:translateX(-100%);}.vignette{position:absolute;inset:0;pointer-events:none;z-index:10;background:radial-gradient(ellipse at center,transparent 30%,#000 95%);}</style></head><body>
<div id="problem-solution" class="stage clip" data-composition-id="problem-solution" data-start="0" data-width="1080" data-height="1080" data-duration="${dur}" data-track-index="0">
  <div class="vignette"></div>
  <div class="panel problem-panel" id="prob"><div class="panel-tint problem-tint"></div><div class="panel-heading problem-heading">${escHtml(problem.heading??'The Problem')}</div><div class="panel-body">${escHtml(problem.body||problem.points?.join(' ')||'')}</div></div>
  <div class="panel solution-panel" id="sol" style="transform:translateX(100%)"><div class="panel-tint solution-tint"></div><div class="panel-heading solution-heading">${escHtml(solution.heading??'The Solution')}</div><div class="panel-body">${escHtml(solution.body||solution.points?.join(' ')||'')}</div></div>
  <div class="wipe-bar" id="wipe"></div>
</div>
${audioTag}
<script>(() => {
  const tl = gsap.timeline({paused:true});
  tl.from('#prob .panel-heading',{y:30,opacity:0,duration:0.7,ease:'power3.out'},0.3);
  tl.from('#prob .panel-body',{opacity:0,duration:0.5},0.9);
  tl.to('#wipe',{x:'100%',duration:0.4,ease:'power3.in'},5.0);
  tl.to('#prob',{x:'-100%',duration:0.3,ease:'power2.in'},5.0);
  tl.set('#sol',{x:'0%'},5.4);
  tl.to('#wipe',{x:'200%',duration:0.4,ease:'power3.out'},5.4);
  tl.from('#sol .panel-heading',{y:30,opacity:0,duration:0.7,ease:'power3.out'},5.5);
  tl.from('#sol .panel-body',{opacity:0,duration:0.5},6.1);
  tl.to({},{duration:${dur}},0);
  window.__timelines=window.__timelines||{};window.__timelines['problem-solution']=tl;
})();</script></body></html>`;
}

function buildReviewCard(videoScript, projectDir) {
  const screen = videoScript[0] ?? {}; const quote = screen.heading ?? ''; const attr = screen.body ?? '';
  const words = quote.split(/\s+/).filter(Boolean);
  const wordSpans = words.map((w,i)=>`<span class="word clip" data-start="${(0.3+i*0.15).toFixed(2)}" data-duration="8" data-track-index="${i+2}">${escHtml(w)}</span>`).join(' ');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${GSAP_CDN}
<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;background:${BG};}.stage{position:relative;width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;}.vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,#000 95%);}.quotemark{position:absolute;top:40px;left:60px;font-size:280px;color:${ORANGE};opacity:0;line-height:1;font-family:Georgia,serif;font-weight:700;}.quote-text{position:relative;z-index:2;text-align:center;font-size:52px;font-weight:700;color:${WHITE};line-height:1.35;max-width:900px;margin-bottom:48px;}.word{display:inline-block;margin:0 4px;}.attribution{position:relative;z-index:2;font-size:24px;color:${ORANGE};font-weight:600;opacity:0;transform:translateY(20px);}</style></head><body>
<div id="review-card" class="stage clip" data-composition-id="review-card" data-start="0" data-width="1080" data-height="1080" data-duration="8" data-track-index="0">
  <div class="vignette"></div><div class="quotemark" id="qm">&ldquo;</div>
  <div class="quote-text">${wordSpans}</div>
  <div class="attribution" id="attr">${escHtml(attr)}</div>
</div>
<script>(() => {
  const tl = gsap.timeline({paused:true});
  tl.to('#qm',{opacity:0.15,duration:0.6,ease:'power2.out'},0);
  tl.from('.word',{y:20,opacity:0,duration:0.3,stagger:0.15,ease:'power3.out'},0.3);
  tl.to('#attr',{opacity:1,y:0,duration:0.5,ease:'power2.out'},${(0.3+words.length*0.15+0.5).toFixed(2)});
  tl.to({},{duration:8},0);
  window.__timelines=window.__timelines||{};window.__timelines['review-card']=tl;
})();</script></body></html>`;
}

// Styles that skip voiceover
const SILENT_STYLES = new Set(['hook_reveal', 'review_card']);

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function generateHyperframesVideo(videoScript, style) {
  const timestamp   = Date.now();
  const projectSlug = `${style}-${timestamp}`;
  const projectDir  = path.resolve(`video-projects/${projectSlug}`);
  const htmlPath    = path.join(projectDir, 'index.html');
  const outputPath  = path.resolve(`generated_imgs/video-${timestamp}.mp4`);

  fs.mkdirSync(path.join(projectDir, 'renders'), { recursive: true });
  fs.mkdirSync('generated_imgs', { recursive: true });

  fs.writeFileSync(path.join(projectDir, 'hyperframes.json'), JSON.stringify({
    "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
    "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
    "paths": { "blocks": "compositions", "components": "compositions/components", "assets": "assets" }
  }, null, 2));
  fs.writeFileSync(path.join(projectDir, 'meta.json'), JSON.stringify({
    "id": projectSlug, "name": projectSlug, "createdAt": new Date().toISOString()
  }, null, 2));

  const useLiquid = style === 'list_countdown' || style === 'liquid_countdown';
  console.log(`[Agent X] Building Hyperframes composition: ${style}${useLiquid ? ' (liquid glass)' : ''}`);

  // CTA appended for liquid style
  const ctaScreen = {
    screen: videoScript.length + 1,
    heading: "Ready to automate?",
    body: "DM 'START' · @DrevonBullock",
    isCTA: true,
  };
  const fullScript = useLiquid ? [...videoScript, ctaScreen] : videoScript;

  // Download stock images (liquid only)
  let bgImages = Array(fullScript.length).fill(null);
  if (useLiquid) {
    bgImages = await fetchScreenImages(fullScript, projectDir);
  }

  // Generate voiceovers (main screens only — CTA is silent)
  let screenDurations = null;
  if (!SILENT_STYLES.has(style)) {
    console.log(`[Agent X] Generating voiceovers...`);
    try {
      const voiceovers = await generateAllVoiceovers(videoScript, style, projectDir);
      const mainDurs   = voiceovers.map((v) => v.durationSeconds);
      screenDurations  = useLiquid ? [...mainDurs, 4.0] : mainDurs;
      console.log(`[Agent X] Voiceovers done. Durations: ${screenDurations.join(', ')}`);
    } catch (err) {
      console.warn(`[Agent X] Voiceover failed — silent fallback: ${err.message}`);
      if (useLiquid) screenDurations = [...videoScript.map(() => 4.0), 4.0];
    }
  } else if (useLiquid) {
    screenDurations = [...videoScript.map(() => 4.0), 4.0];
  }

  let html;
  if (useLiquid) {
    html = buildLiquidCountdown(fullScript, screenDurations, projectDir, bgImages);
  } else {
    let voiceoverPath = null;
    switch (style) {
      case 'hook_reveal':      html = buildHookReveal(videoScript, projectDir); break;
      case 'stat_stack':       html = buildStatStack(videoScript, projectDir); break;
      case 'problem_solution': html = buildProblemSolution(videoScript, projectDir, voiceoverPath); break;
      case 'review_card':      html = buildReviewCard(videoScript, projectDir); break;
      default:                 html = buildListCountdown(videoScript, screenDurations, projectDir);
    }
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`[Agent X] HTML written: ${htmlPath}`);

  try {
    execSync(`npx hyperframes lint`, { cwd: projectDir, stdio: 'pipe', timeout: 30000 });
    console.log(`[Agent X] Lint passed`);
  } catch (err) {
    console.warn(`[Agent X] Lint warnings: ${(err.stdout?.toString() ?? err.message).slice(0, 200)}`);
  }

  console.log(`[Agent X] Rendering...`);
  try {
    execSync(
      `npx hyperframes render "${projectDir}" --output "${outputPath}" --quality standard`,
      { cwd: projectDir, stdio: 'inherit', timeout: 10 * 60 * 1000 }
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
