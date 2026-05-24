# Agent X — Remotion Video Pipeline (Full Reference)
# Last updated: 2026-04-27

---

## Overview

The Remotion pipeline converts a structured `videoScript` array into a
rendered MP4 — with per-screen voiceover (ElevenLabs), contextual AI images
(Gemini), optional animated clips (Runway), optional upscaling (Topaz), and a
final ffmpeg remux for streaming upload. All of this is orchestrated by
`agent/generate-video.js`.

---

## Pipeline — Step by Step

```
videoScript
     │
     ▼
1.  Style selection  (auto or explicit)
     │
     ▼
2.  CTA screen generation  (Claude Haiku)
     │
     ▼
3.  ElevenLabs voiceover per screen  (with word timestamps)
     │
     ▼
4.  Visual generation per content screen
     │   ├── Claude Haiku picks trigger phrase + image prompt
     │   ├── Gemini generates still image
     │   ├── Topaz upscales image (falls back to ffmpeg Lanczos)
     │   └── Runway animated clip (optional — falls back to still if key missing)
     │
     ▼
5.  Callout bubbles per screen  (hook_reveal_vertical only)
     │
     ▼
6.  Build Remotion props JSON → tmp file
     │
     ▼
7.  npx remotion render  (crf=18)
     │
     ▼
8.  Topaz video upscale  (1080×1920 → 2160×3840, vertical only)
     │
     ▼
9.  ffmpeg faststart remux  (stream-ready for platform upload)
     │
     ▼
generated_imgs/output-vertical.mp4  (or output.mp4 / output-landscape.mp4)
```

---

## Inputs

### `videoScript` — array of screen objects
Every screen passed into the pipeline must match this shape:

```js
{
  screen: 1,           // sequential screen number starting at 1
  heading: "...",      // primary text — always rendered large
  body: "...",         // optional supporting text
  points: ["...", "..."],  // optional — used by carousel_slide_vertical (two boxes)
  callouts: [],        // injected by pipeline — do not set manually
  visuals: [],         // injected by pipeline — do not set manually
}
```

Screen 1 is always the **hook screen** — heading only, no body, punchy.
Screens 2–N are teaching screens. The CTA screen is appended automatically.

### `videoStyle` — string
| Value | Composition | Dimensions | When auto-picks it |
|---|---|---|---|
| `list_countdown` | `ListCountdown` | 1080×1080 | Steps, tips, how-tos (default) |
| `hook_reveal_vertical` | `HookReveal` (vertical) | 1080×1920 | Story-driven, emotional, narrative |
| `carousel_slide_vertical` | `CarouselSlide` (vertical) | 1080×1920 | Authority / "N things" framework posts |
| `explainer_vertical` | `ExplainerVertical` | 1080×1920 | In APPROVED list, not yet wired to auto |
| `stat_stack` | `StatStack` | 1080×1920 | Auto-fires if script has numbers (no API call) |
| `news_reactive` | `NewsReactive` | 1920×1080 | Explicit — called from news-agent only |
| `"auto"` | — | — | Claude Haiku reads hook heading and picks one of the top 3 |

Pass `videoStyle = "auto"` to let Claude Haiku decide.
`stat_stack` bypasses Claude — it fires on regex match for digits or numeric words.

---

## Step 1 — Auto Style Selection (`selectVideoStyle`)

**File:** [agent/generate-video.js:170](agent/generate-video.js#L170)

- If the script contains numbers or numeric words (percent, revenue, hours, etc.) → `stat_stack`, no API call.
- Otherwise → Claude Haiku (`claude-haiku-4-5-20251001`, max_tokens: 30) reads the hook heading and returns one of: `list_countdown`, `hook_reveal_vertical`, `carousel_slide_vertical`.
- Invalid response falls back to `hook_reveal_vertical`.

---

## Step 2 — CTA Screen (`generateCTAScreen`)

**File:** [agent/generate-video.js:138](agent/generate-video.js#L138)

Claude Haiku reads the hook heading and returns:
```json
{ "keyword": "SYSTEMS", "resource": "AI systems playbook" }
```
This is appended as the final screen:
```js
{ screen: N+1, heading: `Comment "SYSTEMS"`, body: "and I'll send you my free AI systems playbook." }
```
CTA screen gets a voiceover but **no visual, no callouts**.

---

## Step 3 — ElevenLabs Voiceover (per screen)

**File:** [agent/elevenlabs.js](agent/elevenlabs.js)

**API endpoint:** `POST /v1/text-to-speech/{voiceId}/with-timestamps`
**Model:** `eleven_turbo_v2`
**Voice settings:** `stability: 0.4`, `similarity_boost: 0.75`

### What text the voice reads per screen

| Screen | Text built |
|---|---|
| Hook (screen 1) | `"{heading}."` — heading only |
| list_countdown teaching screens | `"Three. {heading}. {body}"` — spoken countdown number first |
| All other styles | `"{heading}. {body}"` |

The spoken countdown numbers go **Three → Two → One** (countdown down from total teaching screens).

### What comes back
- `audio_base64` → decoded to MP3 buffer → saved as `remotion-videos/public/voice_{N}.mp3`
- `alignment.characters` + `alignment.character_start_times_seconds` → parsed into word-level timestamps: `[{ word: "systems", startTime: 1.34 }, ...]`

### Screen duration calculation

```
audioDuration     = afinfo actual MP3 duration (falls back to word-count estimate)
HOLD_AFTER_AUDIO  = 0.8s  (breathing room after voice finishes)
readFloor         = (total display words) / 3   (reading speed floor)
minFloor          = 2.5s (hook) or 3.5s (all others)
screenDuration    = max(audioDuration + 0.8, readFloor, minFloor)
```

Total video duration is the sum of all screen durations.
If total < 25s, the last screen is padded to reach 25s minimum.
There is no maximum cap.

---

## Step 4 — Visual Generation (`generateVisualForScreen`)

**File:** [agent/generate-video.js:60](agent/generate-video.js#L60)

Runs for every content screen (not hook, not CTA). Skipped if `screen.visuals` already exists.

### 4a — Claude Haiku picks the visual moment

Reads heading + body, returns:
```json
{
  "triggerPhrase": "systems that think",
  "imagePrompt": "cinematic photorealistic scene: ...",
  "side": "right"
}
```
`triggerPhrase` is matched against the word timestamps from ElevenLabs to find `at` (seconds). Falls back to 40% through the word list if phrase not found. `at` is clamped to `max(0.5, matchedTime - 0.3)`.

### 4b — Gemini generates the still image

**File:** [images/gemini.js](images/gemini.js)
- Model: Gemini Imagen 3
- Style: cinematic dark/orange aesthetic, 16:9
- Output: raw image buffer

Saved as `remotion-videos/public/visual_{screen}_{idx}_raw.jpg`

### 4c — Image upscaling chain

```
Topaz image upscale (preferred)
  └── fails → ffmpeg Lanczos 2× scale
        └── fails → copy raw file as-is
```

Final saved as: `remotion-videos/public/visual_{screen}_{idx}.jpg`

### 4d — Runway animated clip (optional)

**File:** [agent/runway.js](agent/runway.js)

Only runs if `RUNWAY_API_KEY` is set. Takes the still image + prompt → returns a short video clip.
Saved as `remotion-videos/public/clip_{screen}_{idx}.mp4`.

If Runway is available AND `TOPAZ_API_KEY` is set → Topaz also upscales the clip → `clip_{screen}_{idx}_hd.mp4`.

If Runway fails or key is missing → falls back silently to static image.

The `Visual` object returned:
```js
{ at: 2.1, imageFile: "visual_2_1.jpg", clipFile: "clip_2_1.mp4", side: "right" }
```
`clipFile` is undefined if Runway was skipped.

---

## Step 5 — Callout Bubbles

**File:** [agent/generate-video.js:49](agent/generate-video.js#L49)

Only generated for `hook_reveal_vertical`. Two emoji bubbles per content screen.

| Property | Value |
|---|---|
| Emoji pairs | 5 rotating pairs: 🤯💡 🔥⚡ 💰🚀 🧠🎯 ⚠️✅ |
| First bubble | `at: 1.2s`, slot: `topLeft` |
| Second bubble | `at: max(3.5, screenDuration * 0.45)s`, slot: `topRight` |

---

## Step 6 — Remotion Props

**File:** [agent/generate-video.js:280](agent/generate-video.js#L280)

Props are written to a tmp JSON file and passed via `--props`:

```js
{
  videoScript: augmentedScript,      // screens with visuals + callouts injected
  screenDurations: [2.5, 7.2, 8.1, ...],   // seconds per screen
  screenHasAudio: [true, true, false, ...], // whether each screen has an MP3
  totalDurationSeconds: 35.8,
  bgImage: "dre_vertical_v3.png",    // vertical only
}
```

---

## Step 7 — Remotion Render

**Command:**
```bash
npx remotion render "remotion-videos/src/index.ts" {CompositionId} \
  --output="generated_imgs/output-vertical-1080.mp4" \
  --props="/tmp/agentx-props-{timestamp}.json" \
  --log=verbose \
  --overwrite \
  --crf=18
```

**Output paths by style:**
| Style | Output path |
|---|---|
| Vertical (hook_reveal_vertical, carousel_slide_vertical) | `generated_imgs/output-vertical-1080.mp4` (pre-upscale) |
| Square (list_countdown) | `generated_imgs/output.mp4` |
| Landscape (news_reactive) | `generated_imgs/output-landscape.mp4` |

**Timeout:** 40 minutes.

---

## Step 8 — Topaz Video Upscale (vertical only)

**File:** [agent/topaz.js](agent/topaz.js)

- Input: `output-vertical-1080.mp4` (1080×1920)
- Output: `output-vertical-topaz.mp4` (2160×3840)
- Falls back to a file copy at 1080p if `TOPAZ_API_KEY` is not set or upscale fails.

---

## Step 9 — ffmpeg Faststart Remux (vertical only)

```bash
ffmpeg -y -i output-vertical-topaz.mp4 -c copy -movflags +faststart output-vertical.mp4
```

Stream-copy only — no re-encode. Moves the moov atom to the front of the file so platforms can start playing before the full file is downloaded.

**Final output:** `generated_imgs/output-vertical.mp4` → uploaded to Instagram/Threads.

---

## Compositions in Detail

### 1. `ListCountdown` — 1080×1080 square

**File:** [remotion-videos/src/compositions/ListCountdown.tsx](remotion-videos/src/compositions/ListCountdown.tsx)

| Screen | Component | Visual |
|---|---|---|
| Screen 1 (hook) | `HookScreen` | Background image `dre_square_v3.png` at 2× scale |
| Screens 2–N | `CountdownItem` | Same background 2× scale |

**CountdownItem layout:**
- Countdown number: 120px cyan `#00D2FF`
- Heading: 48px white, centered
- Body: 30px white
- Fade in: translateY 40→0 over 20 frames, opacity 0→1 over 18 frames
- Fade out: opacity 1→0 over last 12 frames (except final screen — no fade out)
- No visuals, no callouts

---

### 2. `HookReveal` / `HookRevealVertical` — 1080×1920

**File:** [remotion-videos/src/compositions/HookReveal.tsx](remotion-videos/src/compositions/HookReveal.tsx)

| Screen | Component |
|---|---|
| Screen 1 | `HookScreen` — top-aligned at 300px |
| Screens 2–N | `WordReveal` |

**WordReveal layout:**
- Background: `dre_vertical_v3.png` with Ken Burns zoom (1.0× → 1.22× over screen duration)
- Screen flash: white bloom 55%→0 opacity over first 4 frames (transition feel)
- Fade in: 0→1 over 9 frames. Fade out: 1→0 over last 12 frames
- Words: up to 12 words from heading, spring-bounced in staggered by 8 frames each
  - Spring config: `damping: 12, stiffness: 200, mass: 0.8`
  - Each word: translateY 45→0, scale 0.75→1.0, opacity 0→1
  - Font: Inter 72px bold white
- Cyan underline on last word: width 0→100% after all words appear
- Body text: 32px, `#B4C8DA` silver, centered, below words
- Bottom vignette: `rgba(28,36,51,0.97)` bottom 52%, fades to transparent
- Top vignette: `rgba(28,36,51,0.70)` top 22%

**CalloutBubble:**
- Spring bounce: `damping: 7, stiffness: 220, mass: 0.5` → scale 0.2→1.18, clamped to 1.18
- Rotation wiggle: -15→0deg on entrance
- Hold for 3.5s then fade out over 0.6s
- Size: 88px emoji, drop-shadow

**VisualCard (in HookReveal):**
- Size: 960×560px, `borderRadius: 22`
- Position: `left: 60, bottom: 160` (always bottom-centered regardless of side)
- Spring entrance: `damping: 16, stiffness: 190, mass: 0.9` — slides in from left or right (160px offset), scale 0.86→1.0
- Holds for 3.8s then fades out over 0.7s
- Box shadow: `0 28px 80px rgba(0,0,0,0.88)` + `0 0 0 1px rgba(0,210,255,0.22)` (cyan glow border)
- If `clipFile` exists → renders `<Video>` (muted, looping); else → `<Img>`
- Cyan bottom gradient overlay on card

---

### 3. `CarouselSlide` / `CarouselSlideVertical` — 1080×1920

**File:** [remotion-videos/src/compositions/CarouselSlide.tsx](remotion-videos/src/compositions/CarouselSlide.tsx)

| Screen | Component | Label |
|---|---|---|
| Screen 1 | `CoverSlide` | "AI AUTOMATION" |
| Screens 2–(N-1) | `ListItemSlide` | "STEP 01 OF 03" etc. |
| Screen N | `CTASlideComponent` | "FREE RESOURCE" |

**Brand colors:**
```
BG      #0d1830   OLED dark navy
CYAN    #00c8ff
CARD_BG #1a2d48
WHITE   #ffffff
MUTED   #c8ddf0
BORDER  #2a4060
```

**All slides share:**
- `filter: brightness(1.28)` (mobile OLED brightness boost)
- `CircuitGrid` SVG background (10% opacity cyan grid)
- `CornerBrackets` (cyan L-brackets, top only, inset top 240px / side 48px)
- `BottomBar` (author name left, CTA right, ghost watermark)

**CoverSlide animations (staggered springs):**
- Headline: frame 0, `damping:16, stiffness:160` → translateY 60→0
- Cyan divider: frame 28, width 0→220px
- Subtitle: frame 14, translateY 40→0
- All text: `textTransform: uppercase`

**ListItemSlide — two numbered point boxes:**
- Label → headline → cyan divider → Box 01 → Box 02 (staggered at frames 0, 10, 20, 36, 52)
- Box spring: `damping:12, stiffness:200, mass:0.85` → scale 0.82→1.0, translateY 50→0
- After settle: breathing loop (3s cycle, ±5px vertical)
- Box style: `CARD_BG` background, cyan border, numbered badge `01/02`
- Body text: 30px `MUTED` color
- VisualCard: 700×400px at `left:190, top:1060`, slides in, holds until slide ends, fades on last 15 frames

**CTASlide elements:**
- Keyword badge: cyan bordered pill, pulses at 1.0→1.04× on 60-frame loop after settle
- "FOLLOW FOR DAILY AI" button: solid cyan, dark text
- Heading: `Comment "{KEYWORD}"` — keyword extracted from heading string by regex `/"([^"]+)"/`

---

## Audio in Remotion

Each screen that has audio renders:
```tsx
<Audio src={staticFile(`voice_${screenNumber}.mp3`)} />
```
Files must be in `remotion-videos/public/` before render starts.
`screenHasAudio` boolean array gates this — if ElevenLabs failed for a screen, no `<Audio>` is rendered and no error is thrown.

---

## File Outputs

| File | Location | Description |
|---|---|---|
| `voice_{N}.mp3` | `remotion-videos/public/` | Per-screen ElevenLabs audio |
| `visual_{screen}_{idx}_raw.jpg` | `remotion-videos/public/` | Raw Gemini image |
| `visual_{screen}_{idx}.jpg` | `remotion-videos/public/` | Upscaled Gemini image |
| `clip_{screen}_{idx}.mp4` | `remotion-videos/public/` | Runway animated clip |
| `clip_{screen}_{idx}_hd.mp4` | `remotion-videos/public/` | Topaz-upscaled clip |
| `output-vertical-1080.mp4` | `generated_imgs/` | Raw Remotion render (1080p) |
| `output-vertical-topaz.mp4` | `generated_imgs/` | Topaz-upscaled (4K) |
| `output-vertical.mp4` | `generated_imgs/` | Final faststart-remuxed upload file |
| `output.mp4` | `generated_imgs/` | Square render (list_countdown) |
| `output-landscape.mp4` | `generated_imgs/` | Landscape render (news_reactive) |

---

## Environment Variables Required

```
ANTHROPIC_API_KEY       Claude Haiku — style selection, CTA, visual prompts
ELEVENLABS_API_KEY      Voiceover generation
ELEVENLABS_VOICE_ID     Specific voice clone
GEMINI_API_KEY          Imagen 3 still image generation
RUNWAY_API_KEY          (optional) Animated clip from still image
TOPAZ_API_KEY           (optional) Video + image upscaling
```

---

## Known Rules & Gotchas

1. `list_countdown` is the **only approved style for LinkedIn square**. All verticals go to Instagram/Threads.
2. Hook screen (screen 1) never gets a visual card or callouts — it is excluded by index check.
3. CTA screen never gets a visual or callouts — excluded by screen number match.
4. Word timestamps come from ElevenLabs character-level alignment, not word-level. The parser groups consecutive `\w` characters into words.
5. `afinfo` is macOS only. On Railway (Linux) it fails silently and the word-count fallback kicks in.
6. Topaz upscale failure is non-fatal for both images and video — always has a fallback chain.
7. Runway failure is non-fatal — logs a warning, visual degrades to static `<Img>`.
8. `screenDurations` and `screenHasAudio` are **parallel arrays** to `videoScript` — index 0 corresponds to screen 1 (hook), etc.
9. The `bgImage` prop defaults to `dre_square_v3.png` (square) or is set to `dre_vertical_v3.png` for all vertical styles.
10. Never set `visuals` or `callouts` manually on a screen before passing to `generateVideo()` — the pipeline injects them. If you pre-set `visuals`, the screen is skipped for visual generation (`if (screen.visuals) return screen`).
