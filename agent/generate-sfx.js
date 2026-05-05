import fs from "fs";

const SFX_LIST = [
  {
    file: "assets/sfx/swoosh.mp3",
    prompt: "Fast whoosh sound effect, air rushing past, 0.5 seconds",
    duration_seconds: 0.5,
  },
  {
    file: "assets/sfx/pop.mp3",
    prompt: "Clean bubble pop sound effect, bright and snappy, 0.3 seconds",
    duration_seconds: 0.5,
  },
  {
    file: "assets/sfx/riser.mp3",
    prompt: "Cinematic tension riser, building anticipation, 1.5 seconds",
    duration_seconds: 1.5,
  },
  {
    file: "assets/sfx/impact.mp3",
    prompt: "Heavy bass impact hit, powerful thud, 0.4 seconds",
    duration_seconds: 0.5,
  },
];

export async function ensureSFXLibrary() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  fs.mkdirSync("assets/sfx", { recursive: true });

  for (const sfx of SFX_LIST) {
    if (fs.existsSync(sfx.file)) continue;

    if (!apiKey) {
      console.warn(`[SFX] ELEVENLABS_API_KEY not set — skipping ${sfx.file}`);
      continue;
    }

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sfx.prompt,
          duration_seconds: sfx.duration_seconds,
          prompt_influence: 0.8,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
      fs.writeFileSync(sfx.file, Buffer.from(await res.arrayBuffer()));
      console.log(`[SFX] Generated: ${sfx.file}`);
    } catch (err) {
      console.warn(`[SFX] Failed to generate ${sfx.file}: ${err.message}`);
    }
  }

  console.log("[BCG] SFX library ready");
}
