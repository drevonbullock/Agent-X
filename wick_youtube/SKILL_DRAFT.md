---
name: wick-explainer-video
description: Build Wick's Wisdom YouTube explainers (16:9 episodes, 9:16 Shorts) as all-code animation in the Dalio "Changing World Order" ink style with Clawd/PDoomVideo-grade motion. Use for any Wick video, explainer, episode, Short, style frame, motion test, expression, transition, montage or render in ~/Agent-X/wick_youtube. Also use when Dre sends reference videos or repos for the Wick video look. Carries the lessons log; append to it after every round of Dre's feedback.
---

# Wick explainer video

Wick's Wisdom YouTube explainers: money explained through stories, with Wick (the candle) playing every role.
Everything is drawn by code, frame by frame, then encoded by ffmpeg. The work is iterative:
Dre reacts to each cut, and every reaction becomes a line in **Lessons log** at the bottom.

## Hard rules (Dre's, they override everything)

1. **All code.** Plain JavaScript Canvas 2D in `~/Agent-X/wick_youtube/engine`. **No Higgsfield,
   no Remotion, no video or image models, no ElevenLabs.** Don't suggest them.
2. **Ink-style Wick** (approved 2026-09-25): Wick is translated into the Dalio ink style, not an
   imitation of his 3D render. His shape, face, wax level and proportions never change. Costumes
   are allowed on YouTube, but never hide the flame tip.
3. **Test short before building long.** Get a still or 30 s approved before a full episode.
4. **Music sits far under the voice.** The bed is 22 dB under the voiceover's speech level.
5. **Every number and every scale is real.** Compute figures in code (e.g. 2^64 grains = 7.25 km
   heap, drawn beside Everest at true height). Never draw a comparison bigger than the maths says.
6. VO copy: no em or en dashes; numbers written as words.
7. Done = rendered, looked at, committed on the working branch. Never push to main.

## The pipeline

```bash
cd ~/Agent-X/wick_youtube/engine
node render.mjs --film <name> --stills 1.5,6.2          # PNG stills
node render.mjs --film <name> --scale 0.5 --sheet 0,1,2,3,4,5 --cols 6 --name s1   # contact sheet
node render.mjs --film <name>                            # full 1080p MP4 (~0.05 s/frame, Mac GPU)
node render.mjs --film <name> --audio films/<name>/mix.wav  # mux audio, -14 LUFS
```

- A film is `films/<name>/film.js` exporting `create({W,H,out})` → `{duration, fps, renderAt(t)}`.
  `renderAt` must be a **pure function of t**. No state carries between frames and there is no
  `Math.random()`: use `rng(seed)`.
- **Always look before sending.** Render a contact sheet (a grid of frames on one image), open it
  with Read, and fix what's off. Then render the MP4.
- Files over 30 MB don't reach Dre's phone. Also send a copy made with `ffmpeg -crf 26`.

## The library (`lib2d/ink.js`, `lib2d/ease.js`)

| Need | Use |
|---|---|
| Paper per chapter | `paper(W,H,PAL.navy/green/mustard, seed)` |
| Shadows | `hatch(ctx, pathFn, {gap,width,color})`: lines, never gradients |
| A scene | `{bg, art(ctx,t), text(ctx,t), over(ctx,t), cam:{x,y,z,r}}` rendered by `makeStage(out)` |
| Frame / transition | `stage.frame(scene, choreoT, liveT)`, `stage.hatchIn(from, to, p, choreoT, liveT)` |
| Draw-ons | `drawRect`, `drawRing`, `chartLine(pts,{p})` (blue Dalio line, arrow pops at the end) |
| Type | `title` (Serif4 900, pop), `kicker` (tracked caps), `label` (Fira) |
| Wick | `inkWick(ctx,x,y,scale,{face,t,look,armL,armR,sq,dy,rot,crown,cape,emote,emoteK,flare})` |
| Moods | `mood(t, [[t0,'proud'],[t1,'shocked','!']])`, spread into `inkWick` |
| FX | `burst()` aha lines, `sweat()`, `sparkle()` |
| Timing | `seg`, `smooth`, `easeOut`, `easeIn`, `backOut` (overshoot), `kf()` keyframes, `zoomLerp` (log) |

**Wick's 18 faces:** happy, joy, calm, curious, thinking, skeptical, proud, determined, wink,
starstruck, money, alarmed, shocked, worried, grimace, sad, weary, angry. The flame is also an
emotion channel: it flares when he's excited or shocked, dims and shrinks when he's sad or weary, and
flickers fast when he's scared. See `films/wick-faces`.

**Two clocks.** Choreography time can play slower than real time (`SLOW`). Blinks, flicker and line
boil always run on live seconds. Pass both to the stage.

## Style grammar (Dalio, see `wick_youtube/DALIO_STYLE.md`)

- Colour means chapter: navy = the story, green = how money works, mustard = history.
- Thick ink outlines, flat fills, hatched shadows, grainy paper, and a print-grain overlay on everything.
- Every art layer goes through the SVG ink filter (fixed wobble plus edge boil at 12 fps). Text stays crisp.
- Labels use a white ring and a leader line out to a serif word or number.
- Heavy serif titles, framed title cards, and the blue chart line riding over objects.

## Animation grammar (PDoomVideo + Clawd films + Dalio)

- **Something happens in every shot.** The camera never parks: pushes, pulls, dives, drift.
- **Moods never snap.** Blink, squash-and-spring "take", emote pops, new face.
- **Always alive.** Auto-blink about every 3.3 s, idle breathing squash, flame sway.
- **Overshoot on arrival** (`backOut`). Counts can overshoot and settle too (bills on a stack).
- **Motivated transitions.** Dive into an object and it becomes the next scene (a grain becomes the
  board's grain, a stack becomes the heap). Use Dalio's hatch-in between chapters, and the aha
  burst on realisations.
- **Zoom-through montages** (Clawd "powers of ten"): one continuous log-space zoom across scales.
  Keep line widths constant on screen with `px = n / cam.z`, and skip heavy art that is off screen.
- **Bookend** a piece on Wick where possible.
- **Pacing:** Dre found the first cut slightly fast, so choreography now runs 1.25× slower (`SLOW`).

## Process for a new piece

1. Read the script (`wick_youtube/scripts/NN-*.md`) and list the beats: VO, visual, on-screen text.
2. Compute every number the visuals imply. Note the maths in a code comment.
3. Build scenes as scene objects. Reuse library pieces, and add missing ones to `ink.js`, not the film.
4. Check with contact sheets (first and last frame of every shot, plus the transitions), then render.
5. Send, get Dre's reaction, and append it to the Lessons log. Commit.

## References

- Dalio clip: `~/Downloads/Changing world order /` (the folder name ends in a space).
- Clawd reference recordings: `~/Desktop/Screen Recording 2026-09-25 at 3.04.17 PM.mov`, `3.05.13 PM.mov`.
- github.com/JohnHeibel/PDoomVideo (no license, so take ideas only), ClaudeAnimationBase (MIT),
  opus-js-animations (MIT). Watercolour p5.brush was skipped: about 2.5 s/frame is hours per episode.

## Lessons log (newest last; append after every round)

- 2026-09-25: Code-painted 3D Wick read as a knock-off, and warped AI stills read as cheap. Ink
  translation of Wick: **approved**.
- 2026-09-25: Style frames v1 were too clean ("clip art"). Fixed with the ink wobble filter, print
  grain, bolder composition and hand-stacked objects. v2: "getting better".
- 2026-09-25: Light rays rendered as dark stripes, so use a soft radial glow instead.
- 2026-09-25: Motion study v2 (title draw-on, grain dive, hatch-in, doubling): "really good, zero
  complaints". It moved a little too fast, so it now runs at SLOW 1.25. Dre wants more facial
  expressions, which gave the 18-face set and flame emotion.
- 2026-09-25: Dre loves the Clawd films' smoothness, zooms, galaxies and "how much is going on".
  Apply that density: montages, bursts, constant motion.
- 2026-09-25: Bug: the stage handed art real time instead of choreography time, so flashes hung
  and the montage started black. Keep the two clocks separate.
- 2026-09-25: Dre: skill NOT ready. Keep this as a draft in the repo until he says so.
- 2026-09-25: Expressions "really cool". Arms were always sticking out, so added the pose
  system (rest sway, hips, crossed, chin, shrug, wave, present, point, cheer, scratch, reach),
  springing between poses. Default is relaxed hanging arms.
- 2026-09-25: Dre wants the Clawd-video montages (zooming, galaxies, dense motion graphics)
  built into the episodes. First pass: films/wick-montage, a particle journey (grain → galaxy →
  sunflower → murmuration → compounding curve) using 1,100 particles that morph with staggered easing.
- 2026-09-25: "Make it better" on the montage, so v2: no muddy crossfades (use flash, iris or speed
  lines instead); added a nautilus world as an infinite zoom (log spiral, camera turns and zooms
  exactly as fast as the shell grows); galaxy tilts in 3D and gets sucked into a flaring core;
  light runs along the sunflower's seed spirals; sun and hills at sunset; Dalio grid under the
  curve; camera shake on the aha burst.
- 2026-09-25: "Make it better again, fine details" → v3 detail pass. Rule: every world gets
  3 layers of life (background texture that moves, a hero object with micro-detail, a small
  visitor or story beat), and every transition gets punctuation (shockwave rings, rays,
  ticks, sparks, hatch-in). Petals scatter, never fade. Dust motes everywhere. Label charts
  in plain words ("slow...", "then fast", "time", "money").
- 2026-09-25: The sunflower "looks weak": thin, spaced petals and a sparse bed. Fixed to match the
  reference: the disk is about half the flower and packed solid (2,300 seeds under the particles),
  with broad overlapping petals in two layers and green bracts. The bee had one eye, so it was
  rebuilt with two big eyes, fuzz, stripes, four wings and legs, and it faces where it flies.
  Check the reference at full size before designing an object.
- 2026-09-25: Episode 01 script audited before recording: B15's Earth-sized heap broke the
  true-scale rule (it's a ~6.2 km heap next to Everest); a promised "free calculator" doesn't exist
  and was removed; other candles became Wick in costume; B20 now uses the montage.
- 2026-09-25: The montage work was a quality bar, not a template. Dre gives FREE REIN on when to use a
  montage in an episode (not every video). When one is used, it must come out at the approved v4
  level first time (films/wick-montage is the reference), with no rounds of iteration.
- 2026-09-25: Dre picked the next 10 videos (SLATE_V2.md): story/parable titles built on what gets views
  (illusion framing, rich vs poor, scale, emotional parables). Video 1 = The Illusion of Money (Yap).
- Voice (updated 2026-09-25): ElevenLabs IS allowed again, via the ElevenLabs Creative connector, voice
  **Adam** (premade "Adam - Dominant, Firm", voice_id pNInz6obpgDQGcFmaJgB), model **eleven_v3** (Dre switched from v2 on 2026-09-25).
  Test 30 s (the cold open) before voicing the whole script.
- 2026-09-25: Voice changed to **Owen – Documentary & Educational** (voice_id ABW47xCXNNaOhg24REDc) on
  eleven_v3. Dre asked for "a voice fit for explainer videos" and picked Owen take 3 over Adam. Voice the
  script in sections (one take each, about 600 credits per 600 characters), and download the takes
  with creative_get_flow_run_status → media[].url.
- 2026-09-25: **Every YouTube video gets SFX and music.** This overrides the IG reel "no music/SFX" rule.
  Music is an ElevenLabs music bed (eleven_music_v2) per mood section, sitting ~22 dB under the voice and
  ducked while he talks. SFX (eleven_text_to_sound_v2) land on on-screen hits: splashes, thunder,
  paint slaps, whooshes on dives, chimes on reveals. Pending Dre: record his own VO (recommended) or a Mac `say` placeholder.
