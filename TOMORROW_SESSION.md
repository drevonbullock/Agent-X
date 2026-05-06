## Agent X — Session Starter
**Last updated:** 2026-05-06 (end of Session 10)
**Project path:** `/Users/drevonbullock/C.C. Agent X/Agent X`

---

## FIRST THING NEXT SESSION — Fix LinkedIn Token (2 min)

LinkedIn access token expired. Run this once, browser opens, log in:
```bash
node auth/linkedin-auth.js
```
Then confirm it works:
```bash
node --input-type=module <<'EOF'
import "dotenv/config";
import { postLinkedInNewsImage } from "./modules/news-agent.js";
await postLinkedInNewsImage();
EOF
```

Instagram (403) was a temporary rate limit from test volume — clears on its own, no action needed.

---

## CURRENT STATE — What Changed This Session (Session 10)

**Pivoted to news-image-first scheduled pipeline. Reactive 30-min news cron is gone.**

| Old | New |
|---|---|
| LinkedIn: 9am image / 1pm text / 6pm text | LinkedIn: 4x/day news images (8am/12pm/4pm/8pm) |
| Instagram: 10am Reel / 3pm Carousel / 8pm Reel | Instagram: 10am news image + 7pm Reel only |
| 30-min reactive news cron (checkAndPost) | Removed — scheduled slots replace it |
| Headline card: dark theme | Headline card: light theme (white bg / black text) |
| Per-screen orange side border on videos | Single full-frame orange border wrapping all videos |
| Pop SFX on every screen transition | Pop SFX removed — swoosh only, timing fixed |

### New exports in modules/news-agent.js
- `postLinkedInNewsImage()` — scheduled LinkedIn slot: cap-only (no cooldown), fetches news, generates image, posts
- `postInstagramNewsImage()` — scheduled Instagram slot: same pattern
- `canPostScheduled(platform, cap)` — daily cap check without cooldown gate (scheduler controls timing)

### run-reel.js
- Added Topaz upscale step after music mix (gracefully skips if Topaz Video AI not installed)
- Fixed `generateVideo(null, videoScript, style)` signature (was missing first `postText` arg)

---

## CURRENT STATE — What Changed Session 9

**The entire video pipeline was rebuilt from scratch. Remotion and Shotstack are gone.**

| Removed | Replaced With |
|---|---|
| Remotion (`remotion-videos/` folder) | Hyperframes CLI (`npx hyperframes render`) |
| Shotstack API (youtube-cutter.js) | Local ffmpeg trim + resize |
| Generic Gemini images (VISUAL/QUOTE modes) | Locked to 3 modes: BOARDROOM / NEWS / CHEATSHEET |
| Static SVG boardroom characters | Nano Banana Pro (Gemini) anime-style art |

### New video pipeline architecture
```
PATH A — Raw footage dropped into raw_footage/
  raw_footage/*.mp4 → ElevenLabs STT → silence/filler cut (ffmpeg)
                    → color grade → subtitle burn
                    → Hyperframes motion overlay → generated_imgs/final-{ts}.mp4

PATH B — HeyGen avatar (if HEYGEN_API_KEY + HEYGEN_AVATAR_ID set)
  script text → HeyGen v2 API → poll until complete → download .mp4
             → Hyperframes background composite (ffmpeg)
             → generated_imgs/avatar-{ts}.mp4

PATH B fallback — Hyperframes only (no avatar)
  videoScript → ElevenLabs voiceovers (into project folder)
              → Hyperframes HTML composition (5 styles)
              → npx hyperframes render [projectDir] → generated_imgs/video-{ts}.mp4
```

### Hyperframes styles available
| Style | Duration | Audio | When |
|---|---|---|---|
| `list_countdown` | Dynamic (sum of screen durations) | ElevenLabs per screen | Default — numbered tips/frameworks |
| `hook_reveal` | 8s | Silent | Story/insight hook |
| `stat_stack` | 12s | ElevenLabs | Number-heavy content |
| `problem_solution` | 12s | ElevenLabs | Before/after contrast |
| `review_card` | 8s | Silent | Testimonial/quote |

### Image modes — LOCKED PERMANENTLY
Only 3 modes allowed. Quote cards and Gemini visual images are gone forever.
| Mode | When | Fallback |
|---|---|---|
| **boardroom** | DEFAULT — all business/AI/automation content | `null` (text-only) |
| **news** | Named company/product with a real findable article | → boardroom |
| **cheatsheet** | "X vs Y", frameworks, structured lists | → boardroom |

---

## FIRST — Deploy to Railway

### New env vars to add in Railway
```
HEYGEN_API_KEY=         ← from HeyGen dashboard (get after avatar creation)
HEYGEN_AVATAR_ID=       ← from HeyGen dashboard → your avatar's ID
```

**Note:** Until HEYGEN keys are set, Path B automatically falls back to Hyperframes-only. Nothing breaks — it just skips avatar mode.

### nixpacks.toml — verify ffmpeg is still in Railway build
The current `nixpacks.toml` should include ffmpeg. If Railway deploy fails on `process-raw-footage.js`, check:
```toml
[phases.setup]
nixPkgs = ["yt-dlp", "ffmpeg"]
```

---

## KNOWN ISSUES TO FIX NEXT SESSION

### 1. Boardroom character labels misaligned (cosmetic — low priority)
The character name labels (SIGNAL / NOISE) in `renderVerticalBoardroom` use a position formula that can place them in the wrong panel. Visible in the live test — "NOISE" appeared in the middle panel instead of bottom. Non-blocking, just cosmetic.

**Fix:** Update the label positioning math in `buildVerticalOverlayHtml` in `images/render-boardroom.js`. The formula `V_HEIGHT - V_FOOTER_H - (3 - i) * panelH + panelH - 36` needs recalculation.

### 2. Hyperframes non-blocking 404 warnings (non-issue)
During renders you'll see `[non-blocking] Failed to load resource: 404`. This is Google Fonts CDN being blocked by Hyperframes' headless Chrome environment. Fonts fall back to system fonts. The render completes fine — do not try to fix this.

### 3. Cheatsheet Gemini background barely visible
The overlay in `render-cheatsheet.js` uses `opacity: 0.18` + a very strong dark overlay. The background art generates but isn't prominent. Could increase `opacity` to `0.25–0.30` and lighten the gradient overlay if desired.

### 4. Video frame quality on social platforms
Hyperframes renders at `standard` quality (CRF 18). The output is 1080×1080 square. If Instagram requires 1080×1920 vertical for Reels, need to either:
- Add a `hook_reveal_vertical` style at 1080×1920
- OR change `data-width`/`data-height` in the composition

---

## PLATFORM STATE — What's Live

### Schedule (all times EST)
| Platform | Schedule | Content Type |
|---|---|---|
| LinkedIn | 9am (image), 1pm (text), 6pm (text) | Text + single image. Video every 10th post. |
| Instagram | 10am (Reel), 3pm (Carousel), 8pm (Reel) | Reels + HTML carousel |
| Threads | 8:30am, 12:30pm, 5:30pm | Text + carousel every 3rd + video every 5th |
| News Agent | Every 30 min | Reactive posts to all 3 platforms |

### Image generation (what posts now)
All image posts go through `agent/generate-image.js`:
- **Mode selection**: Claude picks BOARDROOM / NEWS / CHEATSHEET
- **Boardroom**: Gemini (Nano Banana Pro) generates anime art → Puppeteer overlays speech bubbles
- **Cheatsheet**: Gemini generates dark abstract background → Puppeteer overlays content cards
- **News**: Firecrawl finds URL from preferred domains → Playwright screenshots it with BCG banner

### Video generation (what posts now)
All video posts go through `agent/generate-video.js`:
1. Checks `raw_footage/` for dropped .mp4 files → PATH A (ffmpeg edit pipeline)
2. Checks for `HEYGEN_API_KEY` → PATH B avatar
3. Falls back to Hyperframes motion graphics → PATH B fallback

---

## KEY FILES — Updated Architecture

### Core pipeline
| File | Role |
|---|---|
| `agent/generate-video.js` | 3-path video router (raw/HeyGen/Hyperframes) |
| `agent/generate-hyperframes-video.js` | Builds HTML compositions + runs `npx hyperframes render` |
| `agent/process-raw-footage.js` | Path A: ElevenLabs STT → ffmpeg edit → Hyperframes overlay |
| `agent/generate-heygen-avatar.js` | Path B: HeyGen v2 API → poll → download → composite |
| `agent/generate-image.js` | Image mode router: boardroom/news/cheatsheet ONLY |
| `agent/elevenlabs.js` | Voiceover gen (outputDir param) + `transcribeAudio()` STT |
| `agent/fetch-news-url.js` | Preferred domain search (CNBC, Bloomberg, Fox, WSJ, etc.) |
| `images/render-boardroom.js` | Gemini anime art + Puppeteer overlay (no more Gemini generic) |
| `images/render-cheatsheet.js` | Gemini dark background + Puppeteer content overlay |
| `images/render-news-screenshot.js` | Playwright screenshot with BCG banner |

### Assets (moved from remotion-videos/public/)
```
assets/dre_square_v3.png      ← used by render-quote-card.js (still exists, just not called)
assets/dre_vertical_v3.png    ← available for future use
assets/dre_horizontal_v3.png  ← available for future use
```

### Folders created this session
```
raw_footage/          ← drop .mp4 files here for Path A processing
video-projects/       ← Hyperframes project folders auto-created here (gitignored renders)
generated_imgs/audio/ ← default ElevenLabs voice file output location
```

---

## WHAT TO BUILD NEXT SESSION

### Priority 1 — Fix vertical video format for Instagram Reels
Current Hyperframes output is 1080×1080 square. Instagram Reels performs better at 1080×1920 (9:16).
- Add a `list_countdown_vertical` style at 1080×1920 in `generate-hyperframes-video.js`
- Or: add `--width 1080 --height 1920` support to the render command (check if Hyperframes supports it)
- The `compressForUpload()` function in index.js scales to 1080×1920 — but if the source is square, it'll letterbox

### Priority 2 — HeyGen avatar setup
Once HEYGEN_API_KEY and HEYGEN_AVATAR_ID are in Railway:
- Go to app.heygen.com → Avatars → create a custom avatar
- Copy the avatar_id from the dashboard URL or API
- Set both env vars in Railway
- Test with: `node -e "import('./agent/generate-heygen-avatar.js').then(m => m.generateHeyGenVideo('Test script here').then(p => console.log(p)))"`

### Priority 3 — Drop Dre's raw footage into Path A
Test the full raw footage pipeline with a real clip:
1. Drop any .mp4 of Dre talking into `raw_footage/`
2. Set `post_count.json` to `{ "count": 9 }` to trigger video mode
3. Run `node index.js --test`
4. Expected: ElevenLabs STT → silence cut → color grade → subtitle burn → output

### Priority 4 — White-label mode for clients
`BRAND_AUTHOR`, `BRAND_HANDLE`, `BRAND_NICHE` env vars already supported in AGENT_CONFIG.
- Pass brand values into boardroom prompt and cheatsheet content generator
- Rename `@DrevonBullock` footer references to use `BRAND_HANDLE`
- Package as a config-only deploy for client instances

---

## TEST COMMANDS

```bash
# Full end-to-end test (3 images + 1 video) — topic: any
node test-openai-elon.js

# LinkedIn test run (image post)
node index.js --test

# Force video mode
echo '{"count":9}' > post_count.json && node index.js --test

# Instagram test
node index.js --test-instagram

# Threads test
node index.js --test-threads

# Direct Hyperframes video render
node -e "
import('./agent/generate-hyperframes-video.js').then(m =>
  m.generateHyperframesVideo([
    {screen:1, heading:'Test hook', body:''},
    {screen:2, heading:'Point one', body:'This is a test of the Hyperframes pipeline.'}
  ], 'list_countdown').then(p => console.log('Done:', p))
)"
```

---

## REFERENCE FILES
- `tasks/lessons.md` — All mistakes made + exact fixes. READ THIS before building.
- `RESULTS.md` — Full build history, test results
- `CLAUDE.md` — Tech stack, env vars, LinkedIn API notes
- `agent/generate-video.js` — Main video router
- `agent/generate-hyperframes-video.js` — Hyperframes HTML builder + render
- `images/render-boardroom.js` — Boardroom Gemini + Puppeteer overlay
- `scheduler.js` — Full cron schedule
- `modules/news-agent.js` — News reactive agent (all 3 platforms)

## ENV VARS — Current State
```
# LIVE ✅
ANTHROPIC_API_KEY, GEMINI_API_KEY
ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
SUPABASE_URL, SUPABASE_KEY, SUPABASE_SECRET_KEY
NEWS_API_KEY
RUNWAY_API_KEY         ← still used for animated Reels overlays in generate-video.js
TOPAZ_API_KEY          ← still used for video upscaling
FIRECRAWL_API_KEY      ← news URL search
OPENAI_API_KEY         ← Whisper transcription in youtube-cutter.js
THREADS_ACCESS_TOKEN, THREADS_USER_ID
INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID

# REMOVED — no longer needed
SHOTSTACK_API_KEY      ← still in .env but unused (youtube-cutter now uses ffmpeg)

# PENDING — add to Railway
HEYGEN_API_KEY         ← HeyGen avatar video generation
HEYGEN_AVATAR_ID       ← your avatar ID from HeyGen dashboard
```
