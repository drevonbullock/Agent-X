import fs from "fs";

export async function ensureBCGJingle() {
  const jinglePath = "assets/bcg-jingle.mp3";
  if (fs.existsSync(jinglePath)) {
    console.log("[BCG] Jingle ready");
    return jinglePath;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("[BCG] ELEVENLABS_API_KEY not set — skipping jingle generation");
    return null;
  }

  fs.mkdirSync("assets", { recursive: true });

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Sharp news broadcast intro sting. Quick electronic swoosh rise, single crisp snare accent, bright synth ping. Punchy, high-energy, attention-grabbing. 1.5 seconds total.",
      duration_seconds: 1.5,
      prompt_influence: 0.9,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs sound generation failed (${res.status}): ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(jinglePath, buffer);
  console.log("[BCG] Signature jingle created: assets/bcg-jingle.mp3");
  return jinglePath;
}
