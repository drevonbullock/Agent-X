import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import supabase from "../supabase/client.js";
import { gradeImage } from "../modules/wick-image-qa.js";

// ─── HARVEST THE JOB HISTORY INTO THE ART LIBRARY ────────────────────────────
// Dre, 2026-08-26: "you can reuse all images that pass the quality test, no
// need to regenerate." Higgsfield's job history is a rolling window of the
// last ~100 generations and FETCHING RESULTS IS FREE — this week's batches
// generated hundreds of scenes whose posts died to infrastructure failures,
// but the images themselves exist and are already paid for. This pulls them,
// grades each against the canonical Wick reference, and banks the passers.
//
// What gets stored per image, beyond the URL:
//   scene    the ACTION text parsed from the original prompt, so reuse copy
//            can be written TO the scene (the picture is fixed; words adapt)
//   framing  parsed from the prompt's FRAMING section. This is the key that
//            unlocks recovered art for COVER slides: art generated with
//            coverTop/upper framing has an empty lower frame BY CONSTRUCTION,
//            so bottom-anchored text cannot bury the character.
//
//   node scripts/wick-harvest-art.js            harvest + grade + bank
//   node scripts/wick-harvest-art.js --dry      list candidates, grade nothing

const RANKED = path.join(process.cwd(), "data", "wick-art-ranked.json");
const BUCKET = "agent-x-images";
const DRY = process.argv.includes("--dry");
const HF = path.join(process.cwd(), "node_modules", ".bin", "higgsfield");

const lib = (() => { try { return JSON.parse(fs.readFileSync(RANKED, "utf8")); } catch { return []; } })();
const known = new Set(lib.map((a) => a.job_id).filter(Boolean));

function parseScene(prompt) {
  const m = String(prompt).match(/ACTION:\s*(.*?)\s*(?:CAMERA:|LIGHT:|$)/s);
  return m ? m[1].trim().slice(0, 400) : null;
}
function parseFraming(prompt) {
  const p = String(prompt);
  if (p.includes("TOP 40%")) return "coverTop";
  if (p.includes("TOP HALF")) return "upper";
  if (p.includes("LOWER TWO THIRDS")) return "lower";
  return "full";
}

async function main() {
  const raw = execFileSync(HF, ["generate", "list", "--json", "--size", "100"],
    { timeout: 60_000, maxBuffer: 50 * 1024 * 1024 }).toString();
  const jobs = JSON.parse(raw);

  const candidates = jobs.filter((j) =>
    /nano_banana|gpt_image/.test(j.job_type ?? "") &&
    (j.result_url || j.min_result_url) &&
    !known.has(j.id) &&
    // Only OUR pipeline's art: every pipeline prompt embeds the element ref.
    String(j.params?.prompt ?? "").includes("<<<"));

  console.log(`[Harvest] history: ${jobs.length} jobs, new candidates: ${candidates.length}, already banked: ${known.size}`);
  if (DRY) { candidates.forEach((j) => console.log(" ", j.created_at, j.job_type)); return; }

  const dir = path.join(os.tmpdir(), "wick-harvest");
  fs.mkdirSync(dir, { recursive: true });
  let nextN = Math.max(0, ...lib.map((a) => a.n ?? 0)) + 1;
  let banked = 0, failed = 0;

  for (const j of candidates) {
    try {
      const url = j.result_url ?? j.min_result_url;
      const f = path.join(dir, `${j.id}.img`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`fetch ${r.status}`);
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));

      const g = await gradeImage(f, "SCENE");
      if (g.severity === "bad") { failed++; console.log(`  ✗ ${j.id.slice(0, 8)} ${String(g.reason).slice(0, 90)}`); continue; }

      // Mirror to Supabase: Higgsfield URLs are signed and rotate out.
      const key = `wick/library/${j.id}.jpg`;
      const { error } = await supabase.storage.from(BUCKET)
        .upload(key, fs.readFileSync(f), { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(`mirror: ${error.message}`);
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

      lib.push({
        n: nextN++, url: publicUrl, job_id: j.id,
        severity: g.severity === "clean" ? "clean" : "minor",
        // Strip-safety is judged by framing: full-frame art needs the body in
        // the upper region to survive the item strip crop; upper/coverTop art
        // is safe by construction.
        strip: parseFraming(j.params?.prompt) === "lower" ? "unknown" : "clean",
        framing: parseFraming(j.params?.prompt),
        scene: parseScene(j.params?.prompt) ?? "Wick in a warm interior scene.",
        harvested_at: new Date().toISOString(),
      });
      banked++;
      console.log(`  ✓ ${j.id.slice(0, 8)} ${g.severity} framing=${parseFraming(j.params?.prompt)}`);
    } catch (err) {
      failed++;
      console.warn(`  ! ${j.id.slice(0, 8)} ${String(err.message).slice(0, 80)}`);
    }
  }

  fs.writeFileSync(RANKED, JSON.stringify(lib, null, 1));
  console.log(`\n[Harvest] banked ${banked}, rejected/failed ${failed}, library now ${lib.length} images`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
