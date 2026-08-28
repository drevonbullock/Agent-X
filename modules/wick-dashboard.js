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
// A dug-out diorama, not a grid of boxes: the vault is carved into rock strata,
// floors are riveted steel slabs, an elevator runs the central shaft, and each
// room has its own furniture silhouettes and light. HUD is pip-boy green; the
// overseer panel is a CRT terminal. Characters are genuine 8-bit pixel art
// (box-shadow sprites, two-frame walk cycle), one suit color per agent.
export function renderWickDashboardHtml(token) {
  const t = encodeURIComponent(token);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VAULT WICK</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<style>
  :root{
    --rock1:#14100b;--rock2:#1e1710;--rock3:#0c0906;
    --dirt:#2a1f14;
    --roomhi:#6b4e30;--roommid:#4a3520;--roomlo:#2e2113;
    --steel:#4a4038;--steelhi:#6a5f52;--steeldark:#26201a;
    --pip:#38e07b;--pipdim:#1d7a44;--pipbg:#08120b;
    --amber:#f5a524;--red:#ff5470;--shaft:#c2571f;
    --txt:#ffe9c4;
  }
  *{box-sizing:border-box;image-rendering:pixelated;-webkit-font-smoothing:none;}
  html{background:var(--rock3);}
  body{margin:0;color:var(--txt);font-family:'VT323',monospace;font-size:17px;line-height:1.35;
    background:
      radial-gradient(ellipse 140% 90% at 50% -10%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%),
      repeating-linear-gradient(0deg, var(--rock1) 0 14px, var(--rock2) 14px 20px, var(--rock1) 20px 34px, var(--rock3) 34px 38px),
      var(--rock3);}
  body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:200;
    background:repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 2px, transparent 2px 4px);
    mix-blend-mode:multiply;}

  /* ── PIP-BOY HUD ─────────────────────────────────────────── */
  .hud{position:sticky;top:0;z-index:60;background:var(--pipbg);
    border-bottom:3px solid var(--pipdim);box-shadow:0 0 24px rgba(56,224,123,.18), inset 0 -8px 20px rgba(56,224,123,.05);
    padding:8px 12px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;color:var(--pip);}
  .hud .vt{font-family:'Press Start 2P',monospace;font-size:11px;text-shadow:0 0 8px rgba(56,224,123,.7);}
  .meter{display:flex;align-items:center;gap:6px;}
  .meter .bar{width:90px;height:10px;border:2px solid var(--pip);padding:1px;background:#04170c;}
  .meter .bar i{display:block;height:100%;background:var(--pip);box-shadow:0 0 6px rgba(56,224,123,.8);}
  .meter.low .bar i{background:var(--red);box-shadow:0 0 6px rgba(255,84,112,.8);}
  .meter.low{color:var(--red);}
  .hud .cap{margin-left:auto;display:flex;gap:10px;align-items:center;}
  .hud button{font-family:'Press Start 2P',monospace;font-size:9px;background:var(--pipbg);color:var(--pip);
    border:2px solid var(--pip);padding:7px 10px;cursor:pointer;text-shadow:0 0 6px rgba(56,224,123,.6);}
  .hud button:hover{background:var(--pipdim);color:#dfffeA;color:#dfffea;}
  .hud .alert{color:var(--red);font-family:'Press Start 2P',monospace;font-size:9px;animation:pulse 1s steps(2) infinite;}
  @keyframes pulse{50%{opacity:.45;}}

  /* ── THE DIG ─────────────────────────────────────────────── */
  .surface{max-width:820px;margin:0 auto;height:34px;position:relative;}
  .surface::before{content:"";position:absolute;inset:auto 0 0 0;height:14px;
    background:linear-gradient(180deg,#3b2c1a,#241a0e);
    clip-path:polygon(0 100%,0 55%,6% 30%,11% 60%,18% 20%,26% 55%,33% 35%,41% 65%,50% 25%,58% 50%,66% 30%,75% 60%,83% 25%,91% 55%,100% 40%,100% 100%);}
  .vault{max-width:820px;margin:0 auto;padding:0 10px 26px;position:relative;}
  .vault::before,.vault::after{content:"";position:absolute;top:-8px;bottom:0;width:26px;z-index:5;pointer-events:none;
    background:
      radial-gradient(circle at 30% 12%, #241a10 8px, transparent 9px),
      radial-gradient(circle at 70% 30%, #1a1209 10px, transparent 11px),
      radial-gradient(circle at 40% 55%, #241a10 9px, transparent 10px),
      radial-gradient(circle at 65% 78%, #1a1209 11px, transparent 12px),
      linear-gradient(90deg, var(--rock3), var(--rock1));}
  .vault::before{left:-6px;}
  .vault::after{right:-6px;transform:scaleX(-1);}

  .slab{height:16px;margin:0 -4px;position:relative;z-index:4;
    background:linear-gradient(180deg,var(--steelhi) 0 3px,var(--steel) 3px 11px,var(--steeldark) 11px);
    border-top:2px solid #7d7264;border-bottom:3px solid #000;}
  .slab::before{content:"";position:absolute;inset:0;
    background:repeating-radial-gradient(circle at 10px 8px, #2c251e 0 2px, transparent 2px 3px) 0 0/44px 16px;}

  .floorrow{display:grid;grid-template-columns:1fr 44px 1fr;position:relative;}

  /* ── ELEVATOR SHAFT ──────────────────────────────────────── */
  .shaft{background:
      repeating-linear-gradient(0deg, #0e0a06 0 10px, #171006 10px 12px),
      linear-gradient(90deg, #000 0 4px, #1c130a 4px calc(100% - 4px), #000 calc(100% - 4px));
    border-left:3px solid #000;border-right:3px solid #000;position:relative;overflow:hidden;}
  .shaft .rail{position:absolute;top:0;bottom:0;left:50%;width:4px;transform:translateX(-50%);
    background:repeating-linear-gradient(0deg,#3a2c18 0 6px,#241a0e 6px 12px);}
  .car{position:absolute;left:5px;right:5px;height:44px;z-index:2;
    background:linear-gradient(180deg,#e07a30,var(--shaft) 45%,#8a3c12);
    border:3px solid #000;box-shadow:inset 0 3px 0 rgba(255,255,255,.25);}
  .car::before{content:"";position:absolute;left:50%;top:8px;transform:translateX(-50%);
    width:12px;height:18px;background:#2a1204;border:2px solid #000;}

  /* ── ROOMS ───────────────────────────────────────────────── */
  .room{min-height:132px;position:relative;cursor:pointer;overflow:hidden;
    background:linear-gradient(180deg,var(--roomhi) 0 26%,var(--roommid) 26% 74%,var(--roomlo));
    border-left:4px solid var(--steeldark);border-right:4px solid var(--steeldark);
    box-shadow:inset 0 0 34px rgba(0,0,0,.55);}
  .room::before{content:"";position:absolute;left:0;right:0;bottom:0;height:30px;   /* tiled floor */
    background:
      linear-gradient(180deg, rgba(255,220,150,.10), transparent 60%),
      repeating-linear-gradient(90deg,#7a5a34 0 26px,#6a4c2a 26px 52px);
    border-top:2px solid rgba(0,0,0,.5);}
  .room::after{content:"";position:absolute;inset:0;pointer-events:none;   /* corner grime */
    background:radial-gradient(ellipse 120% 80% at 50% 30%, transparent 55%, rgba(0,0,0,.35));}
  .doorpost{position:absolute;top:0;bottom:0;width:10px;z-index:3;
    background:repeating-linear-gradient(-45deg,#c9a227 0 7px,#1d1710 7px 14px);
    border-left:2px solid #000;border-right:2px solid #000;}
  .doorpost.l{left:0;} .doorpost.r{right:0;}
  .lampbar{position:absolute;top:0;left:12%;right:12%;height:8px;display:flex;justify-content:space-around;z-index:2;}
  .lamp{width:34px;height:7px;background:linear-gradient(180deg,#fff,#cfc9b8);border:2px solid #000;border-top:none;position:relative;}
  .lamp::after{content:"";position:absolute;top:7px;left:-16px;right:-16px;height:74px;pointer-events:none;
    background:linear-gradient(180deg, rgba(255,236,180,.16), transparent 80%);
    clip-path:polygon(24% 0,76% 0,100% 100%,0 100%);}
  .room:nth-child(odd) .lamp:first-child{animation:flick 7s steps(1) infinite;}
  @keyframes flick{0%,93%,96%,100%{opacity:1;}94%,97%{opacity:.35;}}

  /* furniture silhouettes, one set per room type */
  .furn{position:absolute;left:0;right:0;bottom:28px;height:52px;z-index:1;pointer-events:none;}
  .furn i{position:absolute;bottom:0;background:#20160c;border:2px solid #120c06;box-shadow:inset 0 2px 0 rgba(255,255,255,.06);}
  .f-writer i:nth-child(1){left:12%;width:52px;height:26px;}                    /* desk */
  .f-writer i:nth-child(2){left:16%;bottom:26px;width:14px;height:12px;background:#d9cfb4;} /* paper */
  .f-writer i:nth-child(3){right:14%;width:20px;height:40px;}                   /* cabinet */
  .f-artist i:nth-child(1){left:10%;width:26px;height:44px;background:#11331f;border-color:#062012;box-shadow:0 0 14px rgba(61,220,132,.5), inset 0 2px 0 rgba(120,255,190,.35);}
  .f-artist i:nth-child(2){left:24%;width:26px;height:36px;background:#11331f;border-color:#062012;box-shadow:0 0 14px rgba(61,220,132,.4);}
  .f-artist i:nth-child(3){right:12%;width:44px;height:24px;}                   /* bench */
  .f-editor i:nth-child(1){left:14%;width:46px;height:22px;}                    /* console */
  .f-editor i:nth-child(2){left:18%;bottom:22px;width:16px;height:14px;background:#0d2437;box-shadow:0 0 10px rgba(76,201,240,.55);}
  .f-editor i:nth-child(3){left:32%;bottom:22px;width:16px;height:14px;background:#0d2437;box-shadow:0 0 10px rgba(76,201,240,.4);}
  .f-inspector i:nth-child(1){left:12%;bottom:14px;width:40px;height:30px;background:#3a2a16;border-color:#241a0e;} /* corkboard */
  .f-inspector i:nth-child(2){right:16%;width:24px;height:38px;}                /* file tower */
  .f-courier i:nth-child(1){left:10%;width:56px;height:44px;background:
      repeating-linear-gradient(0deg,#20160c 0 12px,#170f08 12px 14px),
      repeating-linear-gradient(90deg,#20160c 0 16px,#170f08 16px 18px);}       /* pigeonholes */
  .f-courier i:nth-child(2){right:14%;width:26px;height:20px;background:#b5651d;} /* parcel */
  .f-publisher i:nth-child(1){left:14%;width:40px;height:24px;}                 /* console */
  .f-publisher i:nth-child(2){left:22%;bottom:24px;width:4px;height:26px;background:#5a4a36;}
  .f-publisher i:nth-child(3){left:14%;bottom:46px;width:22px;height:4px;background:#5a4a36;transform:rotate(-18deg);} /* antenna */

  .plate{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);z-index:4;
    background:linear-gradient(180deg,#39322a,#211c16);border:2px solid #000;box-shadow:inset 0 2px 0 rgba(255,255,255,.12);
    padding:2px 10px;font-size:15px;letter-spacing:1px;white-space:nowrap;}
  .plate .star{color:var(--amber);}
  .cnt{position:absolute;top:12px;right:16px;z-index:4;font-family:'Press Start 2P',monospace;font-size:9px;
    background:var(--amber);color:#000;border:2px solid #000;padding:3px 5px;}

  /* ── 8-BIT CHARACTERS (box-shadow sprites) ───────────────── */
  .sprite{position:absolute;bottom:30px;width:2px;height:2px;z-index:3;transition:left 2.6s linear;}
  .sprite .px{width:2px;height:2px;}
  .sprite .shadow{position:absolute;top:30px;left:-8px;width:26px;height:5px;border-radius:50%;background:rgba(0,0,0,.4);}
  .crate{position:absolute;top:8px;left:12px;width:12px;height:10px;background:linear-gradient(180deg,#c9803a,#8a5423);
    border:2px solid #000;display:none;animation:bob 1s ease-in-out infinite;}
  .sprite.carry .crate{display:block;}
  @keyframes bob{50%{transform:translateY(-2px);}}

  /* ── THE LINE ────────────────────────────────────────────── */
  .queue{max-width:820px;margin:20px auto 0;padding:0 10px 40px;}
  .queue h2{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--amber);text-shadow:2px 2px 0 #000;}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px;}
  .card{background:linear-gradient(180deg,#2c2115,#1d150c);border:3px solid var(--steeldark);
    box-shadow:0 4px 0 #000, inset 0 2px 0 rgba(255,255,255,.06);padding:7px;}
  .card img{width:100%;display:block;border:2px solid #000;}
  .card .hook{margin:6px 0 2px;min-height:34px;font-size:15px;line-height:1.15;}
  .st{font-size:14px;letter-spacing:1px;} .st.approved{color:var(--pip);} .st.rejected{color:var(--red);}
  .st.qa_pending{color:var(--amber);} .st.posted{color:var(--pip);}
  .why{font-size:14px;color:var(--red);margin-top:3px;line-height:1.2;}
  .card button{font-family:'VT323',monospace;font-size:15px;background:var(--amber);color:#000;
    border:2px solid #000;box-shadow:0 2px 0 #000;padding:3px 9px;cursor:pointer;margin:4px 4px 0 0;}
  .card button:active{transform:translateY(2px);box-shadow:none;}
  .card button.red{background:var(--red);color:#fff;}
  a{color:var(--pip);}

  /* ── OVERSEER TERMINAL ───────────────────────────────────── */
  #overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:100;}
  #panel{display:none;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
    width:min(94vw,470px);max-height:88vh;overflow:auto;z-index:101;
    background:linear-gradient(180deg,#0d1a10,#08120b);border:3px solid var(--pipdim);
    box-shadow:0 0 40px rgba(56,224,123,.25), inset 0 0 60px rgba(56,224,123,.06);
    padding:16px;color:var(--pip);}
  #panel::before{content:"";position:absolute;inset:0;pointer-events:none;
    background:repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 2px, transparent 2px 4px);}
  #panel h2{font-family:'Press Start 2P',monospace;font-size:11px;margin:0 0 6px;text-shadow:0 0 8px rgba(56,224,123,.6);}
  #panel .sub{color:#79c793;font-size:15px;}
  #panel .doing{font-size:17px;color:#d8ffe6;margin:10px 0;border-left:3px solid var(--pipdim);padding-left:8px;}
  #panel img{max-width:100%;border:2px solid var(--pipdim);}
  #panel h3{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--amber);margin:14px 0 6px;}
  textarea{width:100%;font-family:'VT323',monospace;font-size:17px;background:#04170c;color:var(--pip);
    border:2px solid var(--pipdim);padding:7px;min-height:64px;}
  .order{font-size:15px;background:#04170c;border:2px solid var(--pipdim);padding:5px 7px;margin:5px 0;
    display:flex;justify-content:space-between;gap:8px;align-items:center;}
  #panel button{font-family:'VT323',monospace;font-size:16px;background:var(--pip);color:#000;
    border:2px solid #000;box-shadow:0 2px 0 #000;padding:4px 10px;cursor:pointer;margin:4px 4px 0 0;}
  #panel button:active{transform:translateY(2px);box-shadow:none;}
  #panel button.red{background:var(--red);color:#fff;}
  #panel button.dark{background:#123822;color:var(--pip);}
  #panel select{font-family:'VT323',monospace;font-size:16px;background:#04170c;color:var(--pip);
    border:2px solid var(--pipdim);padding:3px;}
</style></head><body>
<div class="hud" id="hud"></div>
<div class="surface"></div>
<div class="vault" id="vault"></div>
<div class="queue"><h2>▶ THE LINE</h2><div class="cards" id="cards"></div></div>
<div id="overlay" onclick="closePanel()"></div>
<div id="panel"></div>

<script>
const T='${t}';let S=null,sel=null;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function j(u,opt){const r=await fetch(u,opt);return r.json();}

/* 8-bit sprite: 13x16 pixel map. .=blank h=hair s=skin S=suit(tinted) b=boot t=trim */
const FRAMES={
 stand:['.....hhh.....','....hhhhh....','....ssss.....','....s.s.s....','....ssss.....','.....ss......','...SSSSSS....','..SSSSSSSS...','..S.SSSS.S...','..s.SSSS.s...','....SSSS.....','....S..S.....','....S..S.....','....S..S.....','....b..b.....','...bb..bb....'],
 walk:['.....hhh.....','....hhhhh....','....ssss.....','....s.s.s....','....ssss.....','.....ss......','...SSSSSS....','..SSSSSSSS...','..S.SSSS.S...','..s.SSSS.s...','....SSSS.....','...S....S....','...S....S....','..S......S...','..b......b...','.bb......bb..']
};
function shadow(map,suit){
  const C={h:'#3a2a18',s:'#e8b98a',S:suit,b:'#17223a',t:'#f5d34c','.':null};
  const out=[];map.forEach((row,y)=>{[...row].forEach((ch,x)=>{const c=C[ch];if(c)out.push((x*2)+'px '+(y*2)+'px 0 0 '+c);});});
  return out.join(',');
}
function spriteHtml(key,suit){
  return '<div class="sprite" id="sp-'+key+'" style="left:22%">'+
    '<div class="shadow"></div>'+
    '<div class="px" id="px-'+key+'" style="box-shadow:'+shadow(FRAMES.stand,suit)+'"></div>'+
    '<div class="crate"></div></div>';
}
const FURN={writer:'f-writer',artist:'f-artist',editor:'f-editor',inspector:'f-inspector',courier:'f-courier',publisher:'f-publisher'};

function roomHtml(r){
  const n=S.counts[r.key]??0;
  return '<div class="room" onclick="openPanel(\\''+r.key+'\\')">'+
    '<div class="doorpost l"></div><div class="doorpost r"></div>'+
    '<div class="lampbar"><div class="lamp"></div><div class="lamp"></div></div>'+
    '<div class="furn '+FURN[r.key]+'"><i></i><i></i><i></i></div>'+
    (n?'<div class="cnt">'+n+'</div>':'')+
    spriteHtml(r.key,r.sprite)+
    '<div class="plate" style="color:'+r.color+'">'+(S.orders[r.key]?.length?'<span class="star">★</span> ':'')+r.name+'</div>'+
  '</div>';
}
function vault(){
  const floors=[[S.rooms[0],S.rooms[1]],[S.rooms[2],S.rooms[3]],[S.rooms[4],S.rooms[5]]];
  let h='<div class="slab"></div>';
  floors.forEach((f,i)=>{
    h+='<div class="floorrow">'+roomHtml(f[0])+
       '<div class="shaft"><div class="rail"></div>'+(i===1?'<div class="car" id="car"></div>':'')+'</div>'+
       roomHtml(f[1])+'</div><div class="slab"></div>';
  });
  document.getElementById('vault').innerHTML=h;
  // pacing + walk frames
  S.rooms.forEach(r=>{
    const el=document.getElementById('sp-'+r.key),px=document.getElementById('px-'+r.key);
    if(!el)return;let frame=0;
    setInterval(()=>{el.style.left=(14+Math.random()*58)+'%';},2800+Math.random()*1600);
    setInterval(()=>{
      const busy=el.classList.contains('walk');
      px.style.boxShadow=shadow(busy&&(frame^=1)?FRAMES.walk:FRAMES.stand,r.sprite);
    },260);
  });
  // elevator loop
  const car=document.getElementById('car');
  if(car){let y=8;car.style.top=y+'px';
    setInterval(()=>{y=y>8?8:76;car.style.transition='top 2.2s steps(12)';car.style.top=y+'px';},4200);}
}

function hud(){
  const q=S.stats.queued, pct=Math.min(100,Math.round(q/14*100));
  document.getElementById('hud').innerHTML=
    '<span class="vt">VAULT&nbsp;WICK</span>'+
    '<div class="meter'+(q<4?' low':'')+'"><span>QUEUE</span><div class="bar"><i style="width:'+pct+'%"></i></div><span class="vt">'+q+'</span></div>'+
    '<div class="meter"><span>7-DAY</span><span class="vt">'+S.stats.published7d+'</span></div>'+
    '<div class="cap">'+
    (S.building?'<span class="vt" style="color:var(--pip)">⚙ LINE RUNNING</span>':'<button onclick="startBuild(event)">START LINE</button>')+
    (S.stopping?'<span class="alert">STOPPING</span>':'')+
    (S.paused?'<span class="alert">⏸ PAUSED</span>':'')+
    '</div>';
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
    ? '<div style="margin:8px 0">COVER TEXT: <select id="align"><option value="center"'+(S.style.coverAlign==='center'?' selected':'')+'>CENTERED</option><option value="left"'+(S.style.coverAlign==='left'?' selected':'')+'>LEFT</option></select> <button onclick="saveStyle()">SAVE</button></div>':'';
  document.getElementById('panel').innerHTML=
    '<h2 style="color:'+r.color+'">◤ '+r.name+' ◢</h2>'+
    '<div class="sub">'+esc(r.does)+'</div>'+
    '<div class="doing">▸ '+esc(w.doing||'idle')+'</div>'+
    (w.artifact?'<img src="'+esc(w.artifact)+'">':'')+
    (w.url?'<div><a href="'+esc(w.url)+'" target="_blank">SEE IT LIVE ↗</a></div>':'')+
    editor+stopBtn+
    '<h3>★ STANDING ORDERS</h3>'+orders+
    '<textarea id="fb" placeholder="Tell this agent what to change. It obeys on every run until you remove the order."></textarea>'+
    '<button onclick="sendOrder()">GIVE ORDER</button> <button class="dark" onclick="closePanel()">CLOSE</button>';
  document.getElementById('overlay').style.display='block';
  document.getElementById('panel').style.display='block';
}
function closePanel(){sel=null;document.getElementById('overlay').style.display='none';document.getElementById('panel').style.display='none';}

async function refresh(){try{S=await j('/wick/state?token='+T);hud();cards();
  if(!document.getElementById('sp-writer'))vault();
  S.rooms.forEach(r=>{const el=document.getElementById('sp-'+r.key);if(!el)return;
    const n=S.counts[r.key]??0;
    el.classList.toggle('walk',n>0||S.building);
    el.classList.toggle('carry',n>0);});
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
