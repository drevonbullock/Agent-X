import "dotenv/config";
import supabase from "../supabase/client.js";

// ─── THE VAULT ───────────────────────────────────────────────────────────────
// Dre, 2026-08-28: "make the layout like the Fallout Shelter game... each
// agent a character, moving and interacting... I want to be able to interrupt
// them... act as the overseer... when I tap one of the characters, it shows me
// what they did... I can stop it, edit it, and tell them. They take the
// feedback and do it consistently until I give them new feedback."
//
// The vault is a cross-section of rooms, one per real agent. Characters walk
// their rooms while their station has work and carry a crate to the next room
// when work moves on. Tapping a character opens the OVERSEER PANEL: what they
// are doing, what they last produced, a STOP lever, and STANDING ORDERS — the
// feedback box whose text is injected into that agent's actual prompts
// (wick-overseer.js) on every future run until removed.
//
// Every fact shown comes from data the agents already write. The vault
// dramatizes; it never invents.

const ROOMS = [
  { key: "writer",    name: "WRITING ROOM",   color: "#f5a524", sprite: "#f5a524",
    does: "Writes hooks from Dre's template and PROBLEM→SOLUTION→HOW copy, then faces the Copy Inspector." },
  { key: "artist",    name: "HIGGSFIELD LAB", color: "#3ddc84", sprite: "#3ddc84",
    does: "Supplies art: the verified library first, Higgsfield generation when new art is ordered." },
  { key: "editor",    name: "EDIT BAY",       color: "#4cc9f0", sprite: "#4cc9f0",
    does: "Composites slides: typography, layout, the centered hook card. Its orders are its settings." },
  { key: "inspector", name: "QA OFFICE",      color: "#ff5470", sprite: "#ff5470",
    does: "Grades every image against canonical Wick and every post's words as a cold stranger." },
  { key: "courier",   name: "MAILROOM",       color: "#8ab4ff", sprite: "#8ab4ff",
    does: "Delivers every finished post to Telegram and collects your keep/pull taps." },
  { key: "publisher", name: "BROADCAST",      color: "#c77dff", sprite: "#c77dff",
    does: "Publishes to Instagram at 9am and 12pm. Its stop lever is the same switch as /pause." },
];

const stationOf = (p) => {
  if (p.published_at) return "done";
  if (p.status === "rejected" || p.pulled_at) return "rejected";
  if (p.status === "approved") return "publisher";
  if (p.image_qa_at) return "publisher";
  if (p.telegram_sent_at && p.status === "qa_pending") return "inspector";
  if (p.slide_urls?.length) return "inspector";
  return "editor";
};

export async function wickDashboardState() {
  const [{ data: posts }, { data: styleRow }, { data: pausedRow }, { data: stopRow }] = await Promise.all([
    supabase.from("wick_posts")
      .select("id,format,status,pulled_at,pull_reasons,image_qa,image_qa_at,telegram_sent_at,published_at,post_url,slide_urls,copy,created_at")
      .order("created_at", { ascending: false }).limit(40),
    supabase.from("agent_kv").select("value").eq("key", "wick_style").maybeSingle(),
    supabase.from("agent_kv").select("value").eq("key", "posting_paused").maybeSingle(),
    supabase.from("agent_kv").select("value").eq("key", "wick_stop").maybeSingle(),
  ]);

  const { loadOrders } = await import("./wick-overseer.js");
  const orders = await loadOrders(true);

  const live = (posts ?? []).map((p) => ({
    id: p.id, format: p.format, status: p.status,
    hook: (p.copy?.cover_headline ?? p.copy?.theme ?? "").slice(0, 70),
    retell: (p.copy?.closing_line ?? "").slice(0, 90),
    station: stationOf(p),
    cover: p.slide_urls?.[0] ?? null, slides: p.slide_urls ?? [],
    at: p.created_at, published: p.published_at ?? null, url: p.post_url ?? null,
    why: p.pull_reasons?.length
      ? p.pull_reasons.map((r) => String(r).slice(0, 160))
      : (p.image_qa?.slides ?? []).filter((s) => !s.pass)
          .map((s) => `slide ${s.slide}: ${String(s.reason).slice(0, 140)}`),
  }));

  const queue = live.filter((p) => ["approved", "pending", "qa_pending"].includes(p.status) && !p.pulled_at);
  const latest = live[0] ?? null;

  // What each character is doing / last did, from the record.
  const work = {
    writer:    latest ? { doing: `latest hook: "${latest.hook}"`, artifact: null } : { doing: "idle", artifact: null },
    artist:    { doing: "serving from the verified library (0 credits)", artifact: latest?.cover ?? null },
    editor:    latest ? { doing: `composited ${latest.slides.length} slides for "${latest.hook}"`, artifact: latest.cover } : { doing: "idle", artifact: null },
    inspector: (() => {
      const g = live.find((p) => p.why?.length);
      return g ? { doing: `last fault: ${g.why[0]}`, artifact: g.cover } : { doing: "everything recent passed", artifact: null };
    })(),
    courier:   (() => {
      const d = live.find((p) => p.at && p.status !== "rejected");
      return { doing: d ? `last delivery ${new Date(d.at).toLocaleString("en-US", { timeZone: "America/New_York" })}` : "idle", artifact: null };
    })(),
    publisher: (() => {
      const pub = live.find((p) => p.published);
      return { doing: pub ? `last published ${new Date(pub.published).toLocaleDateString()}` : "nothing published yet", artifact: pub?.cover ?? null, url: pub?.url ?? null };
    })(),
  };

  let style = { coverAlign: "center" };
  try { if (styleRow?.value) style = { ...style, ...JSON.parse(styleRow.value) }; } catch { /* defaults */ }

  return {
    now: new Date().toISOString(),
    rooms: ROOMS, posts: live.slice(0, 18), work, orders,
    stats: {
      queued: queue.length, days: (queue.length / 2).toFixed(1),
      published7d: live.filter((p) => p.published && Date.now() - Date.parse(p.published) < 7 * 864e5).length,
    },
    style,
    paused: pausedRow?.value === "true",
    stopping: stopRow?.value === "1",
    building: globalThis.__wickBuildRunning === true,
    counts: Object.fromEntries(ROOMS.map((r) => [r.key, live.filter((p) => p.station === r.key).length])),
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

export async function wickFeedback(agent, note) {
  const { addOrder } = await import("./wick-overseer.js");
  return addOrder(agent, note);
}
export async function wickClearOrder(agent, index) {
  const { removeOrder } = await import("./wick-overseer.js");
  return removeOrder(agent, index);
}
export async function wickStop() {
  const { requestStop } = await import("./wick-overseer.js");
  await requestStop();
  return { stopping: true };
}
export async function wickPause(paused) {
  const { cmdPause } = await import("./wick-commands.js");
  await cmdPause(!!paused);
  return { paused: !!paused };
}

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
<title>VAULT WICK</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
  :root{--dirt:#241a12;--rock:#171008;--room:#3a2a1a;--roomlit:#4a3625;--steel:#5a4a36;--glow:#f5a524;--ok:#3ddc84;--bad:#ff5470;--txt:#ffe9c4;}
  *{box-sizing:border-box;image-rendering:pixelated;}
  body{margin:0;background:var(--rock);color:var(--txt);font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.7;}
  .hud{position:sticky;top:0;background:#0d1830;border-bottom:4px solid #000;padding:8px 10px;display:flex;gap:10px;flex-wrap:wrap;z-index:50;}
  .hud .stat{background:#12224a;border:3px solid #2b4a8f;padding:5px 8px;}
  .hud b{color:var(--glow);}
  .vault{max-width:760px;margin:0 auto;padding:14px 8px 40px;background:
    repeating-linear-gradient(0deg,var(--dirt) 0 6px,var(--rock) 6px 12px);}
  .floorrow{display:flex;gap:8px;margin-bottom:10px;}
  .room{flex:1;min-height:120px;background:linear-gradient(180deg,#4a3625,var(--room));
    border:4px solid #000;box-shadow:inset 0 0 0 3px var(--steel);position:relative;padding:8px;cursor:pointer;overflow:hidden;}
  .room .label{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);
    border-top:3px solid var(--steel);padding:4px 6px;font-size:8px;text-align:center;}
  .room .cnt{position:absolute;top:6px;right:6px;background:var(--glow);color:#000;padding:2px 6px;font-size:8px;z-index:3;}
  .room .lamp{position:absolute;top:0;left:50%;transform:translateX(-50%);width:34px;height:6px;background:#ddd;box-shadow:0 4px 18px 6px rgba(255,230,160,.25);}
  .sprite{position:absolute;bottom:26px;width:22px;height:34px;z-index:2;transition:left 2.5s linear;}
  .sprite .head{width:12px;height:10px;margin:0 auto;background:#e8b98a;border:2px solid #000;}
  .sprite .body{width:16px;height:14px;margin:0 auto;border:2px solid #000;}
  .sprite .legs{display:flex;justify-content:center;gap:2px;}
  .sprite .legs i{width:5px;height:8px;background:#1a2a5a;border:2px solid #000;border-top:none;}
  .sprite.walk .legs i:first-child{animation:step .4s steps(2) infinite;}
  .sprite.walk .legs i:last-child{animation:step .4s steps(2) infinite reverse;}
  @keyframes step{50%{height:5px;}}
  .sprite .crate{position:absolute;top:8px;right:-10px;width:10px;height:8px;background:#b5651d;border:2px solid #000;display:none;}
  .sprite.carry .crate{display:block;}
  .queue{max-width:760px;margin:0 auto;padding:0 8px 30px;}
  .queue h2,.panelwrap h2{color:var(--glow);font-size:11px;}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
  .card{background:#241a12;border:3px solid var(--steel);padding:6px;}
  .card img{width:100%;display:block;border:2px solid #000;}
  .card .hook{font-size:8px;margin:5px 0;min-height:26px;}
  .st{font-size:8px;} .st.approved{color:var(--ok);} .st.rejected{color:var(--bad);} .st.qa_pending{color:var(--glow);} .st.posted{color:var(--ok);}
  .why{font-size:8px;color:var(--bad);margin-top:3px;}
  button{font-family:inherit;font-size:8px;background:var(--glow);color:#000;border:3px solid #000;padding:6px 8px;cursor:pointer;margin:3px 3px 0 0;}
  button.red{background:var(--bad);color:#fff;} button.dark{background:var(--steel);color:var(--txt);}
  a{color:var(--ok);}
  #overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;}
  #panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(94vw,460px);max-height:88vh;overflow:auto;
    background:#241a12;border:4px solid var(--glow);padding:14px;z-index:101;}
  #panel h2{margin-top:0;}
  #panel .doing{font-size:9px;color:#c9e4ff;margin:8px 0;}
  #panel img{max-width:100%;border:3px solid #000;}
  textarea{width:100%;font-family:inherit;font-size:9px;background:#000;color:var(--txt);border:3px solid var(--steel);padding:6px;min-height:60px;}
  .order{font-size:8px;background:#000;border:2px solid var(--steel);padding:5px;margin:4px 0;display:flex;justify-content:space-between;gap:6px;}
  .order button{margin:0;padding:2px 6px;}
</style></head><body>
<div class="hud" id="hud"></div>
<div class="vault" id="vault"></div>
<div class="queue"><h2>▶ THE LINE</h2><div class="cards" id="cards"></div></div>
<div id="overlay" onclick="closePanel()"></div>
<div id="panel" style="display:none"></div>

<script>
const T='${t}';let S=null,sel=null;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function j(u,opt){const r=await fetch(u,opt);return r.json();}

function vault(){
  // two rooms per floor, three floors — a cross-section like the game
  const floors=[[S.rooms[0],S.rooms[1]],[S.rooms[2],S.rooms[3]],[S.rooms[4],S.rooms[5]]];
  document.getElementById('vault').innerHTML=floors.map(f=>'<div class="floorrow">'+f.map(r=>{
    const n=S.counts[r.key]??0;
    const busy=n>0||(r.key==='artist'&&S.building)||(r.key==='writer'&&S.building);
    return '<div class="room" onclick="openPanel(\\''+r.key+'\\')">'+
      '<div class="lamp"></div>'+(n?'<div class="cnt">'+n+'</div>':'')+
      '<div class="sprite'+(busy?' walk':'')+(n?' carry':'')+'" id="sp-'+r.key+'" style="left:20%">'+
        '<div class="head"></div><div class="body" style="background:'+r.sprite+'"></div>'+
        '<div class="legs"><i></i><i></i></div><div class="crate"></div></div>'+
      '<div class="label" style="color:'+r.color+'">'+r.name+(S.orders[r.key]?.length?' ★':'')+'</div></div>';
  }).join('')+'</div>').join('');
  // wander: each character paces their room
  S.rooms.forEach(r=>{const el=document.getElementById('sp-'+r.key);if(!el)return;
    setInterval(()=>{el.style.left=(12+Math.random()*60)+'%';},2600+Math.random()*1400);});
}

function hud(){
  document.getElementById('hud').innerHTML=
    '<div class="stat">QUEUE <b>'+S.stats.queued+'</b> ('+S.stats.days+'d)</div>'+
    '<div class="stat">PUBLISHED 7D <b>'+S.stats.published7d+'</b></div>'+
    (S.building?'<div class="stat" style="border-color:var(--ok)">⚙ LINE RUNNING</div>':'<div class="stat"><button onclick="startBuild(event)">START THE LINE</button></div>')+
    (S.stopping?'<div class="stat" style="border-color:var(--bad)">🛑 STOPPING…</div>':'')+
    (S.paused?'<div class="stat" style="border-color:var(--bad)">⏸ PUBLISHING PAUSED</div>':'');
}

function cards(){
  document.getElementById('cards').innerHTML=S.posts.map(p=>{
    const why=(p.why||[]).slice(0,2).map(w=>'<div class="why">'+esc(w)+'</div>').join('');
    const acts=(p.status==='qa_pending'||p.status==='approved')
      ?'<button onclick="decide(\\''+p.id+'\\',\\'approve\\')">KEEP</button><button class="red" onclick="decide(\\''+p.id+'\\',\\'reject\\')">PULL</button>':'';
    return '<div class="card">'+(p.cover?'<img loading="lazy" src="'+esc(p.cover)+'">':'')+
      '<div class="hook">'+esc(p.hook)+'</div>'+
      '<div class="st '+esc(p.status)+'">'+esc(p.status.toUpperCase())+' · '+esc(p.station.toUpperCase())+'</div>'+
      why+acts+(p.url?' <a href="'+esc(p.url)+'" target="_blank">VIEW↗</a>':'')+'</div>';
  }).join('');
}

function openPanel(key){
  sel=key;const r=S.rooms.find(x=>x.key===key);const w=S.work[key]||{};
  const orders=(S.orders[key]||[]).map((o,i)=>'<div class="order"><span>'+esc(o.note||o)+'</span><button class="red" onclick="rmOrder('+i+')">✖</button></div>').join('')||'<div class="order"><span>no standing orders</span></div>';
  const stopBtn = key==='publisher'
    ? '<button class="red" onclick="pause('+(!S.paused)+')">'+(S.paused?'RESUME PUBLISHING':'STOP PUBLISHING')+'</button>'
    : (S.building?'<button class="red" onclick="stopLine()">🛑 STOP THE LINE</button>':'');
  const editor = key==='editor'
    ? '<div style="margin:8px 0">COVER TEXT: <select id="align" style="font-family:inherit;background:#000;color:var(--txt);border:2px solid var(--steel);padding:3px"><option value="center"'+(S.style.coverAlign==='center'?' selected':'')+'>CENTERED</option><option value="left"'+(S.style.coverAlign==='left'?' selected':'')+'>LEFT</option></select> <button onclick="saveStyle()">SAVE</button></div>':'';
  document.getElementById('panel').innerHTML=
    '<h2 style="color:'+r.color+'">'+r.name+'</h2>'+
    '<div style="font-size:8px;color:#c9b48a">'+esc(r.does)+'</div>'+
    '<div class="doing">▸ '+esc(w.doing||'idle')+'</div>'+
    (w.artifact?'<img src="'+esc(w.artifact)+'">':'')+
    (w.url?'<div><a href="'+esc(w.url)+'" target="_blank">SEE IT LIVE ↗</a></div>':'')+
    editor+stopBtn+
    '<h2 style="font-size:10px">★ STANDING ORDERS</h2>'+orders+
    '<textarea id="fb" placeholder="Tell this agent what to do differently. It obeys on every run until you remove the order."></textarea>'+
    '<button onclick="sendOrder()">GIVE ORDER</button> <button class="dark" onclick="closePanel()">CLOSE</button>';
  document.getElementById('overlay').style.display='block';
  document.getElementById('panel').style.display='block';
}
function closePanel(){sel=null;document.getElementById('overlay').style.display='none';document.getElementById('panel').style.display='none';}

async function refresh(){try{S=await j('/wick/state?token='+T);hud();cards();
  if(!document.getElementById('sp-writer'))vault();else{
    S.rooms.forEach(r=>{const el=document.getElementById('sp-'+r.key);if(!el)return;
      el.classList.toggle('walk',(S.counts[r.key]??0)>0||S.building);
      el.classList.toggle('carry',(S.counts[r.key]??0)>0);});
    document.querySelectorAll('.room .cnt').forEach(e=>e.remove());
  }
}catch(e){}}
async function decide(id,action){await j('/wick/decide?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});refresh();}
async function sendOrder(){const note=document.getElementById('fb').value.trim();if(!note||!sel)return;
  await j('/wick/feedback?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:sel,note})});
  await refresh();openPanel(sel);}
async function rmOrder(i){await j('/wick/feedback/clear?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent:sel,index:i})});await refresh();openPanel(sel);}
async function stopLine(){await j('/wick/stop?token='+T,{method:'POST'});await refresh();if(sel)openPanel(sel);}
async function pause(p){await j('/wick/pause?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paused:p})});await refresh();if(sel)openPanel(sel);}
async function saveStyle(){await j('/wick/style?token='+T,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coverAlign:document.getElementById('align').value})});await refresh();openPanel('editor');}
async function startBuild(ev){ev.stopPropagation();await j('/wick/build?token='+T,{method:'POST'});refresh();}
refresh();setInterval(refresh,5000);
</script></body></html>`;
}
