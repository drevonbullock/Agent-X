import "dotenv/config";
import supabase from "../supabase/client.js";

// ─── THE OVERSEER ────────────────────────────────────────────────────────────
// Dre, 2026-08-28: "I want to be able to act as the overseer for everything,
// just like in the game... When I tap one of the characters, it shows me what
// they did... If I don't like it, I can stop it, edit it, and tell them. They
// take the feedback and do it now consistently until I give them new feedback."
//
// STANDING ORDERS are the mechanism. Each agent that works from a prompt
// (Writer, Artist, Inspector) has its orders injected into that prompt on
// every run — the same seam the self-learning rules already use — so an order
// holds "consistently until new feedback" by construction, not by promise.
// The Editor is deterministic code, so its orders are its settings panel; the
// Publisher's stop is the same posting_paused switch /pause uses.
//
// Orders live in agent_kv under one key: { writer: [..], artist: [..], ... }.

const KEY = "wick_overseer_notes";
export const AGENTS = ["writer", "artist", "editor", "inspector", "courier", "publisher"];

let cache = null, cacheAt = 0;
export async function loadOrders(force = false) {
  if (!force && cache && Date.now() - cacheAt < 60_000) return cache;
  try {
    const { data } = await supabase.from("agent_kv").select("value").eq("key", KEY).maybeSingle();
    cache = data?.value ? JSON.parse(data.value) : {};
  } catch { cache = cache ?? {}; }
  cacheAt = Date.now();
  return cache;
}

export async function ordersFor(agent) {
  const all = await loadOrders();
  return (all[agent] ?? []).map((n) => n.note ?? n);
}

// The block agents append to their prompts. Empty string when no orders stand.
export async function ordersBlock(agent, header = "THE OVERSEER'S STANDING ORDERS") {
  const list = await ordersFor(agent);
  if (!list.length) return "";
  return `\n${header} — follow every one of these until replaced:\n` +
    list.map((n) => `  * ${n}`).join("\n");
}

export async function addOrder(agent, note) {
  if (!AGENTS.includes(agent)) throw new Error(`unknown agent: ${agent}`);
  const text = String(note ?? "").trim().slice(0, 400);
  if (!text) throw new Error("empty order");
  const all = await loadOrders(true);
  all[agent] = [...(all[agent] ?? []), { note: text, at: new Date().toISOString() }].slice(-10);
  await supabase.from("agent_kv").upsert({ key: KEY, value: JSON.stringify(all), updated_at: new Date().toISOString() });
  cache = all; cacheAt = Date.now();
  return all[agent];
}

export async function removeOrder(agent, index) {
  const all = await loadOrders(true);
  (all[agent] ?? []).splice(index, 1);
  await supabase.from("agent_kv").upsert({ key: KEY, value: JSON.stringify(all), updated_at: new Date().toISOString() });
  cache = all; cacheAt = Date.now();
  return all[agent] ?? [];
}

// ─── THE STOP LEVER ──────────────────────────────────────────────────────────
// Between every post, the builder asks whether the Overseer pulled the lever.
// Stopping is a data write, so it works from the dashboard on Railway against
// a build running anywhere.
export async function requestStop() {
  await supabase.from("agent_kv").upsert({ key: "wick_stop", value: "1", updated_at: new Date().toISOString() });
}
export async function clearStop() {
  await supabase.from("agent_kv").upsert({ key: "wick_stop", value: "0", updated_at: new Date().toISOString() });
}
export async function stopRequested() {
  try {
    const { data } = await supabase.from("agent_kv").select("value").eq("key", "wick_stop").maybeSingle();
    return data?.value === "1";
  } catch { return false; }
}
