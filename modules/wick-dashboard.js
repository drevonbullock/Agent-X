import "dotenv/config";
import supabase from "../supabase/client.js";

// ─── THE FACTORY FLOOR ───────────────────────────────────────────────────────
// Dre, 2026-08-28: "an interactive dashboard where I can see all the agents
// running... how it's working, where it's working, why it did what it did...
// one of those 8-bit game-looking type dashboards." Interviewed him: pixel
// factory floor, served from Railway, with approve/pull, Edit-the-Editor and
// run-batch controls.
//
// The stations are the REAL pipeline, one per module, in processing order.
// Every "why" shown here comes from data the agents already write: QA verdicts
// and reasons (wick-image-qa), pull reasons (wick-diagnose), learned rules
// (wick-lessons), delivery timestamps (wick-telegram), publishes (wicks-wisdom).
// The dashboard invents nothing; it is a window, not a narrator.
//
// Routes (wired in index.js, guarded by REVIEW_TOKEN like /review):
//   GET  /wick?token=            the page
//   GET  /wick/state?token=      JSON the page polls every 5s
//   POST /wick/decide            {id, action}   approve|reject a post
//   POST /wick/style             {coverAlign}   Edit-the-Editor settings
//   POST /wick/build             start the zero-credit library week (locked)

const STATIONS = [
  { key: "writer",    name: "WRITER",    icon: "✍",  does: "Hooks + PROBLEM/SOLUTION/HOW copy (wick-copy)" },
  { key: "artist",    name: "ARTIST",    icon: "🎨", does: "Art from the verified library, or Higgsfield (wick-art-library / wick-render)" },
  { key: "editor",    name: "EDITOR",    icon: "✂",  does: "Compositing + typography (wick-render). Its settings are editable below." },
  { key: "inspector", name: "INSPECTOR", icon: "🔍", does: "Identity vs canonical Wick, quality, words-match-image (wick-image-qa)" },
  { key: "courier",   name: "COURIER",   icon: "📨", does: "Telegram delivery + approvals (wick-telegram)" },
  { key: "publisher", name: "PUBLISHER", icon: "📤", does: "Instagram at 9am/12pm (wicks-wisdom)" },
];

export async function wickDashboardState() {
  const [{ data: posts }, { data: styleRow }, { data: lessons }] = await Promise.all([
    supabase.from("wick_posts")
      .select("id,format,status,pulled_at,pull_reasons,image_qa,image_qa_at,telegram_sent_at,published_at,post_url,slide_urls,copy,created_at,batch_id")
      .order("created_at", { ascending: false }).limit(40),
    supabase.from("agent_kv").select("value").eq("key", "wick_style").maybeSingle(),
    supabase.from("wick_lessons").select("rule,kind,created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  // Which station is each post AT, from its own timestamps.
  const stationOf = (p) => {
    if (p.published_at) return "done";
    if (p.status === "rejected" || p.pulled_at) return "rejected";
    if (p.status === "approved") return "publisher";
    if (p.image_qa_at) return "publisher";
    if (p.telegram_sent_at && p.status === "qa_pending") return "inspector";
    if (p.slide_urls?.length) return "inspector";
    return "editor";
  };

  const live = (posts ?? []).map((p) => ({
    id: p.id, format: p.format, status: p.status,
    hook: (p.copy?.cover_headline ?? p.copy?.theme ?? "").slice(0, 60),
    station: stationOf(p),
    cover: p.slide_urls?.[0] ?? null,
    slides: p.slide_urls ?? [],
    at: p.created_at,
    published: p.published_at ?? null, url: p.post_url ?? null,
    why: p.pull_reasons?.length
      ? p.pull_reasons.map((r) => String(r).slice(0, 140))
      : (p.image_qa?.slides ?? []).filter((s) => !s.pass)
          .map((s) => `slide ${s.slide} [${(s.codes ?? []).join("")}] ${String(s.reason).slice(0, 120)}`),
  }));

  const queue = live.filter((p) => ["approved", "pending", "qa_pending"].includes(p.status) && !p.pulled_at);
  const graded = live.filter((p) => p.why !== undefined && (p.status === "approved" || p.status === "rejected"));
  const passRate = graded.length
    ? Math.round(100 * graded.filter((p) => p.status === "approved").length / graded.length) : null;

  let style = { coverAlign: "center" };
  try { if (styleRow?.value) style = { ...style, ...JSON.parse(styleRow.value) }; } catch { /* defaults */ }

  return {
    now: new Date().toISOString(),
    stations: STATIONS,
    posts: live,
    stats: {
      queued: queue.length,
      days: (queue.length / 2).toFixed(1),
      passRate,
      published7d: live.filter((p) => p.published && Date.now() - Date.parse(p.published) < 7 * 864e5).length,
    },
    style,
    lessons: (lessons ?? []).map((l) => ({ rule: String(l.rule).slice(0, 120), kind: l.kind })),
    building: globalThis.__wickBuildRunning === true,
  };
}

export async function wickDecide(id, action) {
  const { decideWick } = await import("./wicks-wisdom.js");
  return decideWick(id, action);
}

export async function wickSaveStyle(patch) {
  const allowed = {};
  if (["center", "left"].includes(patch?.coverAlign)) allowed.coverAlign = patch.coverAlign;
  if (!Object.keys(allowed).length) throw new Error("no valid style fields");
  const { data: row } = await supabase.from("agent_kv").select("value").eq("key", "wick_style").maybeSingle();
  let current = {}; try { current = row?.value ? JSON.parse(row.value) : {}; } catch { /* replace */ }
  const next = { ...current, ...allowed };
  await supabase.from("agent_kv").upsert({ key: "wick_style", value: JSON.stringify(next), updated_at: new Date().toISOString() });
  return next;
}

// Library builds spend ZERO Higgsfield credits and need no CLI, so Railway can
// run them — which is what makes this button honest on that host.
export async function wickStartBuild() {
  if (globalThis.__wickBuildRunning) return { started: false, reason: "a build is already running" };
  globalThis.__wickBuildRunning = true;
  (async () => {
    try {
      const { spawn } = await import("child_process");
      await new Promise((resolve) => {
        const p = spawn(process.execPath, ["scripts/wick-week-from-library.js", "--posts", "14"],
          { stdio: "ignore", detached: false });
        p.on("exit", resolve); p.on("error", resolve);
      });
    } finally { globalThis.__wickBuildRunning = false; }
  })();
  return { started: true };
}

// ─── THE PAGE ────────────────────────────────────────────────────────────────
export function renderWickDashboardHtml(token) {
  const t = encodeURIComponent(token);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WICK FACTORY</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0d1830;--panel:#12224a;--edge:#2b4a8f;--amber:#F5A524;--ok:#3ddc84;--bad:#ff5470;--txt:#cfe0ff;}
  *{box-sizing:border-box;image-rendering:pixelated;}
  body{margin:0;background:var(--bg);color:var(--txt);font-family:'Press Start 2P',monospace;font-size:10px;line-height:1.8;padding:12px;}
  h1{font-size:14px;color:var(--amber);text-shadow:2px 2px 0 #000;margin:4px 0 12px;}
  .bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
  .chip{background:var(--panel);border:3px solid var(--edge);padding:8px 10px;}
  .chip b{color:var(--amber);}
  .floor{display:flex;gap:6px;overflow-x:auto;padding:10px 2px;}
  .station{min-width:150px;background:var(--panel);border:3px solid var(--edge);padding:8px;position:relative;}
  .station h3{margin:0 0 4px;font-size:9px;color:var(--amber);}
  .station .icon{font-size:22px;filter:drop-shadow(2px 2px 0 #000);}
  .station .count{position:absolute;top:6px;right:8px;background:var(--amber);color:#000;padding:2px 6px;font-size:9px;}
  .station.busy{border-color:var(--ok);animation:blink 1s steps(2) infinite;}
  @keyframes blink{50%{border-color:var(--edge);}}
  .belt{height:8px;background:repeating-linear-gradient(90deg,#000 0 8px,var(--edge) 8px 16px);margin:8px 0 14px;animation:roll .6s linear infinite;}
  @keyframes roll{to{background-position:16px 0;}}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
  .card{background:var(--panel);border:3px solid var(--edge);padding:6px;}
  .card img{width:100%;display:block;border:2px solid #000;}
  .card .hook{font-size:8px;margin:6px 0;min-height:28px;}
  .card .st{font-size:8px;}
  .st.approved{color:var(--ok);} .st.rejected{color:var(--bad);} .st.qa_pending{color:var(--amber);} .st.posted{color:var(--ok);}
  .why{font-size:8px;color:var(--bad);margin-top:4px;}
  button{font-family:inherit;font-size:8px;background:var(--amber);color:#000;border:3px solid #000;padding:6px 8px;cursor:pointer;margin:2px 2px 0 0;}
  button.dark{background:var(--edge);color:var(--txt);}
  .panel{background:var(--panel);border:3px solid var(--edge);padding:10px;margin-top:14px;}
  .panel h2{font-size:11px;color:var(--amber);margin:0 0 8px;}
  .lesson{font-size:8px;color:#9db6e8;margin:3px 0;}
  select{font-family:inherit;font-size:9px;background:#000;color:var(--txt);border:2px solid var(--edge);padding:4px;}
  a{color:var(--ok);}
</style></head><body>
<h1>▶ WICK FACTORY</h1>
<div class="bar" id="stats"></div>
<div class="floor" id="floor"></div>
<div class="belt"></div>
<div class="cards" id="cards"></div>

<div class="panel"><h2>✂ EDIT THE EDITOR</h2>
  <label>COVER TEXT: <select id="align"><option value="center">CENTERED</option><option value="left">LEFT</option></select></label>
  <button onclick="saveStyle()">SAVE</button>
  <span id="stylemsg" style="font-size:8px"></span>
  <div style="font-size:8px;margin-top:6px;color:#9db6e8">Applies to every post the Editor builds after saving.</div>
</div>

<div class="panel"><h2>⚙ RUN</h2>
  <button onclick="startBuild()" id="buildbtn">BUILD THE WEEK (0 CREDITS — LIBRARY ART)</button>
  <span id="buildmsg" style="font-size:8px"></span>
</div>

<div class="panel"><h2>🧠 WHAT THE INSPECTOR LEARNED</h2><div id="lessons"></div></div>

<script>
const T='${t}';
async function j(u,opt){const r=await fetch(u,opt);return r.json();}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
async function refresh(){
  try{
    const s=await j('/wick/state?token='+T);
    document.getElementById('stats').innerHTML=
      '<div class="chip">QUEUE <b>'+s.stats.queued+'</b> ('+s.stats.days+' DAYS)</div>'+
      '<div class="chip">PASS RATE <b>'+(s.stats.passRate==null?'—':s.stats.passRate+'%')+'</b></div>'+
      '<div class="chip">PUBLISHED 7D <b>'+s.stats.published7d+'</b></div>'+
      (s.building?'<div class="chip" style="border-color:var(--ok)">⚙ BUILDING…</div>':'');
    document.getElementById('floor').innerHTML=s.stations.map(st=>{
      const n=s.posts.filter(p=>p.station===st.key).length;
      return '<div class="station'+(n?' busy':'')+'"><div class="icon">'+st.icon+'</div><h3>'+st.name+'</h3>'+
        (n?'<div class="count">'+n+'</div>':'')+
        '<div style="font-size:7px;color:#9db6e8">'+esc(st.does)+'</div></div>';
    }).join('');
    document.getElementById('cards').innerHTML=s.posts.slice(0,18).map(p=>{
      const why=(p.why||[]).slice(0,2).map(w=>'<div class="why">'+esc(w)+'</div>').join('');
      const acts=p.status==='qa_pending'||p.status==='approved'
        ?'<button onclick="decide(\\''+p.id+'\\',\\'approve\\')">KEEP</button><button class="dark" onclick="decide(\\''+p.id+'\\',\\'reject\\')">PULL</button>':'';
      const link=p.url?'<a href="'+esc(p.url)+'" target="_blank">VIEW ↗</a>':'';
      return '<div class="card">'+(p.cover?'<img loading="lazy" src="'+esc(p.cover)+'">':'')+
        '<div class="hook">'+esc(p.hook)+'</div>'+
        '<div class="st '+esc(p.status)+'">'+esc(p.status.toUpperCase())+' · '+esc(p.station.toUpperCase())+'</div>'+why+acts+link+'</div>';
    }).join('');
    document.getElementById('lessons').innerHTML=s.lessons.map(l=>'<div class="lesson">▸ '+esc(l.rule)+'</div>').join('')||'<div class="lesson">nothing yet</div>';
    document.getElementById('align').value=s.style.coverAlign;
  }catch(e){/* poll again */}
}
async function decide(id,action){await j('/wick/decide?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});refresh();}
async function saveStyle(){const r=await j('/wick/style?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coverAlign:document.getElementById('align').value})});document.getElementById('stylemsg').textContent='SAVED ✓';setTimeout(()=>document.getElementById('stylemsg').textContent='',2000);}
async function startBuild(){const r=await j('/wick/build?token='+T,{method:'POST'});document.getElementById('buildmsg').textContent=r.started?'STARTED ✓':('NO: '+r.reason);refresh();}
refresh();setInterval(refresh,5000);
</script></body></html>`;
}
