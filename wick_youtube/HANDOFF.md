# Wick's Wisdom YouTube — Handoff (read this first)

Moved from a claude.ai web session to local Claude Code on Dre's Mac on 2026-09-25.
Everything from that session lives on branch `claude/wicks-wisdom-video-plan-1uu7th`.
This file is the full memory of it. Read it, then PLAN.md, STYLE_BIBLE.md, SLATE.md.

## The goal

Wick's Wisdom YouTube: 8 to 10 minute explainers at 16:9, with 9:16 Shorts clipped
from each. The niche is "Money, told as philosophy". The style targets are
Ray Dalio's "How the Economic Machine Works" / "Changing World Order", Kurzgesagt's
"The Egg", and After Skool. The short-term aim is to get episode 01 on air.

## Hard rules from Dre (they override everything else)

1. **All code. No Higgsfield. No Remotion.** Plain JavaScript Canvas 2D, rendered
   frame by frame and encoded with ffmpeg. three.js is a later upgrade, not now.
   (Dre allowed Higgsfield stills once, then took it back. Don't suggest it again.)
2. **Wick must look exactly like his reference art** (`wick_examples/`, character
   element 5e934732-6de4-438a-b3a6-024144603518). The reference images are for
   study only. Never place them in a video.
3. **Tell stories with Wick as every character.** Dress him for the role (a crown
   for a king, and so on). Headgear on the flame is allowed. See
   `wick_examples/CHARACTER_SHEET.md`.
4. **Interactive, always moving.** Smooth, hand-drawn-feeling 2D, never a slideshow.
5. **Music sits far under the voice.** The code sets the bed 22 dB below the VO's
   speech RMS and ducks it further while he talks.
6. **Tests are 30 seconds.** Get approval on 30 seconds before building anything long.
7. **Speed matters.** Dre wants videos in minutes, not hours.
8. VO copy: no em dashes, no en dashes, numbers written as words. Free content covers
   WHAT/WHY/WHEN only. HOW is reserved for paid offers (one free first step allowed).

## What's done

| Thing | Where | Status |
|---|---|---|
| Plan + style verdict + 12-step roadmap | `wick_youtube/PLAN.md` | done |
| Style bible (voice, pillars, palettes, scene vocabulary, Shorts rules, Dre's 6e rules) | `wick_youtube/STYLE_BIBLE.md` | done |
| Script format | `wick_youtube/SCRIPT_TEMPLATE.md` | done |
| 15 episode briefs | `wick_youtube/SLATE.md` | done |
| 15 full scripts (1,327 to 1,461 words each, 31 to 40 beats, 3 Shorts each) | `wick_youtube/scripts/01..15-*.md` | done. Facts were checked from search snippets only; click through the SOURCES before publishing |
| Render engine | `wick_youtube/engine/` | works |
| Shorts map | `wick_youtube/SHORTS_MAP.md` | **not made yet** (the Shorts are listed inside each script) |

## The engine (`wick_youtube/engine/`)

- `film.html` loads `films/<name>/film.js`, which exposes `window.renderAt(t)`
  (draws frame t, fully deterministic). `?play=1` gives a live preview in a browser.
- `render.mjs` runs headless Chromium (Playwright), captures every frame, and pipes
  it to ffmpeg. It then muxes the audio and normalises loudness to -14 LUFS.
  - `node render.mjs --film king-30 --audio films/king-30/mix.wav`
  - `--from/--to` render one chunk; run several chunks in parallel, then join them
    with ffmpeg concat. `--scale 0.6667` renders 720p drafts. `--stills 3,12`
    renders single frames as PNGs for checking a look.
  - On a Mac it uses the real GPU. The cloud box had none: canvas ran at about
    0.5 s/frame and three.js at 2 to 4 s/frame, which is why tests took so long.
- `lib2d/ease.js` has easing, segments, pop, wobble, seeded rng and camera paths.
- `lib2d/wick2d.js` is a flat Wick. `lib2d/wickHD.js` is a painted Wick with
  10 expressions, walk, sit, lean, squash, and a king costume.
- `lib2d/warp.js` is a mesh puppet warp for animating a still image.
- `lib/synth.mjs` synthesises all music and SFX in code (pads, plucks, bells,
  whoosh, coins, reverb, WAV writer). Each film's `score.mjs` builds `mix.wav`,
  auto-levelled under the VO.
- Voice: ElevenLabs "Alex" `qkEGWkCMgKgN6hNFFX4p`, eleven_multilingual_v2, about
  $0.15 per minute. Beat timing comes from ffmpeg `silencedetect` on the VO.

Films in `engine/films/`:
- `test-chessboard`: three.js capability demo, 59 s. Too slow; Dre: fine as a test only.
- `test-2d`: flat 2D demo. Dre: "looks like you recreated the character" and the music was too loud.
- `king-30`: painted Wick, 30 s king parable. Dre: "doesn't look good".
- `king-30-hf`: edit built on Higgsfield stills, then puppet-warped. Dre: "looks bad".
  It's also off-rules now (Higgsfield). Keep it only as a timing reference.

**Lesson:** redrawing Wick in code by approximation reads as a knock-off, and warping
AI stills reads as cheap. No look has been approved yet.

## Open decisions (ask Dre before building)

1. **The look.** My recommendation is flat illustrated Wick in Dalio-style
   explainer framing, all code, drawn carefully from the reference sheet as clean
   vector shapes (bezier paths traced to match his silhouette, not a guess). Show
   **one still style frame** for a yes or no before animating anything.
2. **The Dalio reference clip** is on Dre's Mac:
   `~/Downloads/Changing world order /` (the folder name ends in a space).
   Study it for style only: pacing, line weight, how characters move, how charts
   build. Don't copy shots. Locally, reference it with
   `@"/Users/drevonbullock/Downloads/Changing world order /"`, or extract frames:
   `ffmpeg -i "<clip>" -vf "fps=1,scale=480:-1,tile=4x3" sheet_%02d.jpg`, then read the sheets.

## Next steps, in order

1. Study the Dalio clip (frames plus contact sheets). Write down what makes it work.
2. Build ONE code-drawn style frame of Wick in that style. Dre approves or rejects it.
3. Build a 30 s animated test in that style (script 01's opening), with VO from Alex
   and a synth bed 22 dB under. Dre approves or rejects it.
4. Produce episode 01 (`scripts/01-chessboard.md`) at full length, 16:9.
5. Cut its 3 Shorts at 9:16. Write `SHORTS_MAP.md`.
6. Repeat for 02 to 15. Agent X v3 handles weekly publishing.

## Other things built in the web session

- `scripts/send-to-claude.sh` pushes Mac files to the cloud session. Not needed
  locally, since local Claude can read files directly.
- `.claude/skills/inbox/SKILL.md` is the companion skill. Also not needed locally.
