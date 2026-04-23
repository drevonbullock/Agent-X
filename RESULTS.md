# AGENT X — BUILD RESULTS
**Last updated:** 2026-04-21
**Build sessions:** 7

---

## PHASE 9 — PRODUCTION HARDENING + COMMENT REPLIES + AUTO STYLE + NEWS VIDEO ✅ (Session 7)

### What was built

**Bug Fix — ffmpeg path (`agent/generate-video.js`)**
- `ffmpeg` path now OS-aware: `/usr/bin/ffmpeg` on Linux (Railway), `/opt/homebrew/bin/ffmpeg` on Mac
- `nixpacks.toml` updated: added `ffmpeg` to `nixPkgs` so Railway installs it at build time
- Previous hardcoded Mac path was a guaranteed crash on Railway deploy

**Bug Fix — Variation Engine crash-safe queue (`modules/variation-engine.js`)**
- Replaced all `setTimeout`-based variation posting with a Supabase `variations_queue` table
- Each variation is a row: `parent_post_id`, `scheduled_for` (staggered 6h apart), `sent` boolean
- `processVariationQueue()` exported — polls for `sent=false AND scheduled_for <= now()`, posts, marks sent
- Survives Railway restarts with zero lost jobs
- `scheduler.js` runs `processVariationQueue()` on its own 30-min cron

**Bug Fix — Shotstack watermark (`modules/youtube-cutter.js`, `modules/format-agent.js`)**
- Both files now use `shotstackKey()` and `shotstackStage()` helpers
- `SHOTSTACK_ENV=production` → uses `SHOTSTACK_API_KEY_PROD` + `v1` endpoint (no watermark)
- Default (sandbox) still uses `SHOTSTACK_API_KEY` + `stage` endpoint

**New Module — Comment Replies (`modules/comment-reply.js`)**
- Instagram: webhook handler at `GET/POST /webhook/instagram` — verifies hub token, handles comment events
- Threads: polls `/me/replies?limit=25` every 15 min via scheduler
- Claude Haiku generates 2-sentence replies — direct, no "great question", no em dashes
- CTA keyword detection: `["AUTOMATE", "CLAUDE", "MAKE", "AGENTS", "TOOLS"]`
- Never replies to same comment twice (dedup via `comment_replies` table)
- Keyword leads logged to `keyword_leads` table for follow-up
- `supabase/schema.sql` updated with `comment_replies` + `keyword_leads` + `variations_queue` tables

**New Feature — Auto Video Style Selection (`agent/generate-video.js`)**
- `selectVideoStyle(videoScript)` — Claude Haiku picks best style from 3 vertical options
- Stat/number-heavy scripts → `stat_stack` (no API call, pure regex)
- Story/narrative → `hook_reveal_vertical`
- Framework/tips/list → `list_countdown`
- System/authority posts → `carousel_slide_vertical`
- All callers now pass `"auto"` instead of hardcoded style
- `news_reactive` added to style map (for explicit use from news-agent)
- Landscape output path `generated_imgs/output-landscape.mp4` added for `news_reactive`

**New Feature — Threads Video Every 5th Post (`index.js`)**
- `runThreads()` now checks `(count + 1) % 5 === 0` → video slot
- Video slot: `generateVideoPost()` → `generateVideo(script, "auto")` → Supabase upload → `postVideoToThreads(publicUrl, caption)`
- Carousel slot: every 3rd non-video post (unchanged)
- Text: all other slots
- Falls back to text if video pipeline fails

**New Feature — Instagram Webhook HTTP Server (`index.js`)**
- `http.createServer()` added in `main()` (scheduler mode only)
- Listens on `process.env.PORT ?? 3000`
- `GET /webhook/instagram` — verifies `hub.verify_token` against `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` env var, returns `hub.challenge`
- `POST /webhook/instagram` — parses JSON body, calls `handleInstagramWebhook(body)`
- No new npm packages (native `http` module only)

**New Feature — NewsReactive Video for LinkedIn (`modules/news-agent.js`)**
- LinkedIn reactive news posts now render a `NewsReactive` (1920×1080) video instead of static image
- `generateNewsVideoScript(article)` — Claude Haiku generates 4-screen script from article headline + summary
- `generateVideo(script, "news_reactive")` → local mp4 → `postToLinkedIn(caption, null, { type: "video", path })`
- Falls back to text-only post if video pipeline fails

### New Railway env vars required
```
SHOTSTACK_ENV=production           → removes Shotstack sandbox watermark
SHOTSTACK_API_KEY_PROD=<key>       → production Shotstack key
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<token>  → any secret string; set same value in Meta webhook dashboard
```

### Updated platform schedule (as of 2026-04-21)
```
LinkedIn  : 9:00am (image), 1:00pm (text), 6:00pm (text), video every 10th
            + news reactive (NewsReactive video, ≤3/day, 4h cooldown)
Instagram : 10:00am (Reel), 3:00pm (Carousel), 8:00pm (Reel)
            + comment replies via webhook (real-time)
Threads   : 8:30am, 12:30pm, 5:30pm (text | carousel every 3rd | video every 5th)
            + comment replies polled every 15 min
            + news reactive text (≤3/day)
News agent: every 30 min (all platforms independently gated)
Var queue : every 30 min (crash-safe, survives Railway restarts)
Variation : every 6 hours (check winners → queue new variations)
HookTester: every 6 hours (:30 offset)
Feedback  : Sundays midnight
YouTube   : 11:00am daily (if YOUTUBE_CHANNEL_ID set)
```

### Mistakes made + fixed
| # | Mistake | Fix |
|---|---------|-----|
| 1 | ffmpeg hardcoded to `/opt/homebrew/bin/ffmpeg` — crashes on Railway Linux | OS detection: Linux → `/usr/bin/ffmpeg`, Mac → `/opt/homebrew/bin/ffmpeg` |
| 2 | Variation engine used `setTimeout` — silent loss on Railway restart | Supabase `variations_queue` table with `sent` boolean, polled every 30 min |
| 3 | Shotstack sandbox key in all modules — watermark on all videos | `SHOTSTACK_ENV=production` + `SHOTSTACK_API_KEY_PROD` env-based switching |

---

## PHASE 8 — MULTI-PLATFORM EXPANSION + MOBILE VISUAL POLISH ✅ (Session 6)

### What was built

**Visual Fixes (Remotion)**
- `remotion-videos/src/compositions/ListCountdown.tsx` — Background image scaled 2× (`transform: "scale(2)"`) to fill more canvas space. Body text changed from `#B4C8DA` (silver) to `#FFFFFF` (white) for readability.
- `remotion-videos/src/compositions/CarouselSlide.tsx` — Major mobile OLED fix: added `filter: "brightness(1.28)"` to all three slide root divs. Background lifted from `#0a0f1e` to `#0d1830`. Safe zone adjusted for Instagram UI overlay: TopLabel at `top: 260`, CornerBrackets PT `240`, ListItemSlide padding-top `340px`. All uppercase for CTA heading + cover subtitle. Follow button changed to `"FOLLOW FOR DAILY AI"`. Card glow tightened.
- `remotion-videos/src/Root.tsx` — Fixed CTA preview screen to use correct `Comment "AUTOMATE"` format so `extractKeyword()` resolves properly (was defaulting to "COMMENT").

**Threads — Full Platform Build**
- `agent/generate-post.js` — Added `generateThreadsPost()`: 5 format variants (list insight, hot take, breakdown, counter, scenario), 8 AI automation topics, hard cap at 400 chars, no hashtags, Threads-native voice.
- `index.js` — `runThreads()` now calls `generateThreadsPost()` instead of slicing LinkedIn posts.
- `scheduler.js` — Threads on independent schedule: 8:30am, 12:30pm, 5:30pm EST.
- `distributors/threads.js` — Added 5-second wait between child container creation and carousel container creation (fixes "Invalid Carousel Children" API error).

**Instagram — Full Platform Build**
- `index.js` — Added `runInstagramReel()`: generates script via Claude → renders `carousel_slide_vertical` → uploads to Supabase → posts Reel → logs to Supabase. Added `ensureIgBucket()` and `generateReelScript(topic)` helpers.
- `run-reel.js` — New standalone file: `node run-reel.js "topic"` generates and posts a Reel to Instagram on any custom topic.
- `scheduler.js` — Instagram on independent schedule: 10am Reel, 3pm Carousel, 8pm Reel EST.

**News Agent — Rate Limiting + Multi-Platform**
- `modules/news-agent.js` — Added `canPost(platform)` with `DAILY_CAP=3`, `COOLDOWN_HOURS=4`. Checks Supabase `posts` table for `format: "news_reaction"` per platform per day + cooldown since last post. Added `generateThreadsReactivePost()` (Threads-native, under 400 chars), `generateInstagramReactiveCaption()` (under 300 chars), `uploadImageToSupabase(buffer)`. `checkAndPost()` now runs LinkedIn + Threads + Instagram independently with their own caps.

**Infrastructure**
- `supabase/client.js` — Explicit check for `SUPABASE_SECRET_KEY` (service role key) on startup with clear error message if missing.

### Mistakes made + fixed (see `tasks/lessons.md` for full detail)
| # | Mistake | Fix |
|---|---------|-----|
| 1 | CarouselSlide header cut off by Instagram UI overlay | Safe zone: top 260px, bottom 1540px |
| 2 | Video looks dull on mobile OLED | `brightness(1.28)` + lifted background to `#0d1830` |
| 3 | CTA showed "COMMENT" not actual keyword | Root.tsx preview screen now uses `Comment "AUTOMATE"` format |
| 4 | Threads posts truncated mid-sentence | `generateThreadsPost()` writes natively, never truncates LinkedIn posts |
| 5 | Threads carousel "Invalid Carousel Children" | 5-second wait after child container creation |
| 6 | Railway crash: SUPABASE_SECRET_KEY missing | Added service role key (`sb_secret_...`) to Railway Variables |
| 7 | News agent no rate limit — posting hourly | `canPost()` with daily cap (3) + 4-hour cooldown per platform |

### Live platform schedule (as of 2026-04-20)
```
LinkedIn  : 9:00am (image), 1:00pm (text), 6:00pm (text) + news reactive (≤3/day, 4h cooldown)
Instagram : 10:00am (Reel), 3:00pm (Carousel), 8:00pm (Reel) + news reactive image (≤3/day)
Threads   : 8:30am, 12:30pm, 5:30pm (text | carousel every 3rd) + news reactive (≤3/day)
News agent: every 30 min (all platforms independently gated)
```

### Test results (2026-04-20)
| Test | Result |
|---|---|
| CarouselSlide brightness fix | ✅ Confirmed brighter on OLED |
| "FOLLOW FOR DAILY AI" CTA button | ✅ Live |
| CTA keyword extraction | ✅ "AUTOMATE" extracted correctly |
| Instagram Reel — "how to use AI if you work a 9-to-5" | ✅ Posted live |
| Threads text post | ✅ Posted live |
| Threads carousel | ✅ Posted live |
| Threads video | ✅ Posted live |
| Instagram news reactive image | ✅ Wired |
| News agent rate limit (3/day per platform) | ✅ Logic confirmed |
| Railway deployment | ✅ Stable after SUPABASE_SECRET_KEY added |

---

## PHASE 7 — CINEMATIC VISUAL OVERLAYS + AUTO-CTA ✅ (Session 5)

### What Drevon wanted
Keep the original `hook_reveal_vertical` look (his photo background, word-by-word text reveal, Ken Burns zoom, spring animations). **ADD** contextual image overlays that slide in while the voiceover talks — like a floating image card that appears when he says "one hour of work" and shows a scene of someone at a desk or a clock. Also add an automatic call-to-action screen at the end of every video that tells viewers to "Comment [KEYWORD] below for a free [resource]."

### What was built

**`agent/elevenlabs.js`**
- Switched from `/text-to-speech` to `/text-to-speech/{id}/with-timestamps` endpoint
- Returns `{ buffer, wordTimestamps: [{word, startTime}] }` — every word has an exact second-level timestamp from ElevenLabs' character alignment data
- `generateAllVoiceovers()` now exposes `wordTimestamps` per screen

**`agent/generate-video.js`**
- `generateCTAScreen(videoScript)` — Claude (Haiku) reads the video topic and generates a contextual CTA: `{ keyword, resource }` → appended as the last screen before voiceover generation, so it gets voiced too
- `findPhraseTime(wordTimestamps, phrase)` — finds when a trigger phrase is spoken using word timestamps; falls back to 40% through the voiceover if phrase not found
- `generateVisualForScreen(screen, wordTimestamps, idx)` — Claude identifies ONE visual moment per content screen (trigger phrase + cinematic image prompt + side), finds its timestamp, generates a Gemini image, saves to `remotion-videos/public/visual_X_Y.jpg`, returns `{ at, imageFile, side }`
- Visuals are skipped for hook screen (screen 1) and CTA screen
- Augmented videoScript (with `visuals` arrays attached) is passed to Remotion

**`remotion-videos/src/compositions/HookReveal.tsx`**
- `VisualCard` component: floating image card, 750×430px, `left: 165` (centered at 1080px width), `bottom: 230px`, slides in from side direction using spring physics (`translateX(±160 → 0) + scale(0.86→1.0)`), holds 3.8s, fades out with scale-down. Cyan glow border (`rgba(0,210,255,0.22)`) + deep drop shadow
- `WordReveal` accepts `visuals?: Visual[]` prop, renders one `VisualCard` per visual
- `Callout` emoji system kept (can still be used manually in script)

**`remotion-videos/src/compositions/ListCountdown.tsx`**
- Added `Visual` interface: `{ at: number; imageFile: string; side?: "left" | "right" }`
- Added `visuals?: Visual[]` to `VideoScreen` interface

### Pipeline flow (full)
```
videoScript
  → generateCTAScreen() [Claude Haiku] → append CTA as last screen
  → generateAllVoiceovers() [ElevenLabs /with-timestamps] → MP3s + word timing
  → generateVisualForScreen() × N [Claude Haiku + Gemini] → images in public/
  → augmentedScript (videoScript with visuals[] attached per screen)
  → Remotion render HookRevealVertical at 4K (--scale=2 --crf=15)
  → ffmpeg compress → 1080p web copy
  → Supabase upload → Instagram Reel post
```

### Test results (2026-04-19)
| Screen | Visual trigger | Image at |
|---|---|---|
| Screen 2 | "generic output back" | 5.6s |
| Screen 3 | "Chains of agents" | 2.6s |
| Screen 4 | "four hours of manual work" | 5.4s |
| Screen 5 (CTA) | "Comment SYSTEMS below" | — |

Instagram Reel: `18412964353132786`

### Key design decisions
- **No photo background change** — user explicitly wanted the existing style preserved; visuals ADD on top, nothing removed
- **Center bottom placement** — `left: 165px, bottom: 230px` centers the 750px card on a 1080px canvas; slide direction (left/right) is entrance-only
- **Word-exact timing** — ElevenLabs timestamps let visuals appear at the exact word, not a fixed percentage
- **CTA before voiceover** — CTA screen is generated before `generateAllVoiceovers()` so it gets a real voiced line, not silence
- **No visuals on CTA** — CTA screen skipped in visual generation loop

### Future: full-screen image takeover
User wants: text fades away → image fills screen for 2-3s → text returns. Requires splitting one content screen into 3 sub-sequences: (1) words-only, (2) image-only full-bleed, (3) words resume. Not yet built.

---

---

## PHASE 6 — SHOTSTACK CINEMATIC PIPELINE ✅ (Session 4)

### What was built
- **`modules/shotstack-enhance.js`** — Full cinematic video pipeline. Takes `videoScript` → generates ElevenLabs voiceover → uploads to Supabase → generates 3 Gemini B-roll images → uploads to Supabase → builds 10-track Shotstack blueprint → submits render → polls to completion → returns CDN video URL.
- **`test-shotstack.js`** — End-to-end test: generates cinematic video, posts to Instagram Reel + Threads video.

### Pipeline (no Remotion — 100% Shotstack-native)
```
ElevenLabs voiceover → Supabase upload
Gemini × 3 B-roll images → Supabase upload
dre_vertical_v3.png → Supabase upload
All URLs → Shotstack 10-track blueprint → render → CDN URL
CDN URL → Instagram Reel + Threads video
```

### 10-track blueprint
| Track | Content | Timing |
|---|---|---|
| 1 | Background image (dre_vertical_v3.png), zoomIn | 0s → full |
| 2 | 3 Gemini B-roll images, opacity 0.55, slideDown/slideRight/slideLeft | 0s, 7s, 14s |
| 3 | ElevenLabs voiceover, fadeOut | 0s → full |
| 4 | Fireworks.mp3 bg music, vol 0.12, fadeOut | 0s → full |
| 5 | Headline HTML (Inter 800, 68px white), slideUp | 0.5s, 4s hold |
| 6 | Cyan accent line (120×3px #00D2FF), slideUp | 1.2s, 8s hold |
| 7 | Subtext HTML (Inter 400, 32px #B4C8DA), slideUp | 2s, word/3 hold |
| 8 | 3 key point cards (cyan border, black bg), slideUp | 5s, 9s, 13s |
| 9 | CTA (#00D2FF, 800 weight, 34px), slideUp | 18s → end |
| 10 | Watermark (DRE'VON BULLOCK, rgba(180,200,218,0.4)) | 0s → full |

### Test results (2026-04-19)
| Step | Result | Details |
|---|---|---|
| ElevenLabs voiceover | ✅ | 47.5s audio generated, uploaded to agent-x-videos |
| Background image upload | ✅ | dre_vertical_v3.png → Supabase agent-x-images |
| Gemini B-roll 1 | ✅ | Uploaded to Supabase |
| Gemini B-roll 2 | ✅ | Uploaded to Supabase |
| Gemini B-roll 3 | ✅ | Uploaded to Supabase |
| Shotstack render | ✅ | Render ID: 676fd9ca-d62e-4191-9cce-e5afc097a730, done in ~60s |
| Instagram Reel | ✅ | ID: 18158225590447142 |
| Threads video | ✅ | ID: 18142629685500569 |

### Known tuning needed
- **Voiceover length**: test script generated 47.5s audio → clamped to 25s (MAX_DURATION). Body text on screens 2-4 should be concise (< 15 words per screen) so voiceover fits within 25s. `buildVoiceText` reads heading + body for each key point — keep body short.
- **Sandbox watermark**: renders via `edit/stage` endpoint carry a Shotstack stage watermark. Set `SHOTSTACK_ENV=production` + `SHOTSTACK_API_KEY_PROD` for clean output.
- **Offset tuning**: text positions are calculated from `yOffset()` helper (`(960 - targetPx) / 1920`). Adjust `targetCenterPx` values in the blueprint builder if elements need repositioning.

### Run command
```
node test-shotstack.js
```

---

## PHASE 5 — HOOKREVEALSVERTICAL TIMING + AUDIO FIX ✅ (Session 3)

### What changed
- **`agent/elevenlabs.js`** — `HOLD_AFTER_AUDIO` 1.2s → 0.8s for all screens. Hook screen special-case (0.4s) removed — 0.8s breathing room applies everywhere. Added word-count floor: `max(audioDuration + 0.8, words/3, minFloor)` where minFloor is 2.5s (hook) / 3.5s (content screens). Stale `hold` variable reference in log fixed.
- **`agent/generate-video.js`** — Added `hook_reveal_vertical: "HookRevealVertical"` to style map. `APPROVED_STYLES` array replaces hardcoded `list_countdown` gate. `isVertical` flag passes `bgImage: "dre_vertical_v3.png"` in render props. Output path splits to `output-vertical.mp4` for vertical style.
- **`remotion-videos/src/compositions/HookScreen.tsx`** — Fade in: 8 → 9 frames (0.3s). Fade out: 8 → 12 frames (0.4s) and completes at `durationFrames` not `durationFrames - 2`.
- **`remotion-videos/src/compositions/HookReveal.tsx`** — `WordReveal` fade out: 10 → 12 frames (0.4s) and completes at `durationFrames`.
- **`test-reel.js`** — New end-to-end test: generates voiceovers → renders HookRevealVertical → uploads to Supabase → posts Instagram Reel.

### Test results (2026-04-19)

| Screen | Audio | Screen duration |
|---|---|---|
| Screen 1 (hook) | 2.8s | 3.6s |
| Screen 2 | 10.7s | 11.5s |
| Screen 3 | 10.5s | 11.3s |
| Screen 4 | 8.8s | 9.6s |
| **Total** | | **36.0s** |

| Test | Result | Notes |
|---|---|---|
| ElevenLabs voiceovers (4 screens) | ✅ PASSED | All 4 MP3s generated with afinfo duration |
| Remotion render HookRevealVertical | ✅ PASSED | 1080 frames @ 30fps, 5.0 MB |
| Supabase upload (agent-x-videos) | ✅ PASSED | Public URL confirmed |
| Instagram Reel post | ✅ PASSED | ID: 18105262471919924 |

```
node test-reel.js     → full pipeline: voiceovers → render → upload → Instagram Reel
```

---

## WHAT WAS BUILT

### Phase 1 — Foundation (Session 1)
- `supabase/client.js` — Supabase JS client (createClient wrapper)
- `supabase/schema.sql` — 4-table schema: posts, variations, performance_briefs, news_seen
- `index.js` — Replaced post_count.json with live Supabase COUNT query. Added logPost(). Added AGENT_CONFIG white-label object. videoCadence reads from config.

### Phase 2 — Always-On Content (Session 1)
- `modules/news-agent.js` — NewsAPI polling (8 keyword variants). Dedup via news_seen table. Claude generates reactive post in Dre's voice. Posts to LinkedIn with image.
- `HookReveal.tsx` — Activated with dre_square_v3.png background, cyan underline, silver body text
- `StatStack.tsx` — Activated with dre_square_v3.png background, cyan stat numbers, silver body text
- `scheduler.js` — Added news-agent every 30 min, variation-engine every 6h, feedback-loop every Sunday midnight

### Phase 3 — Production Pipeline (Session 1)
- `modules/youtube-cutter.js` — YouTube URL → yt-dlp audio → Whisper transcription → Claude selects 8 clips → Shotstack renders → captions per clip → JSON output
- `modules/format-agent.js` — Takes any video → resizes for 6 platforms via Shotstack → trims captions to platform char/hashtag limits → returns render IDs
- `NewsReactive.tsx` — 1920×1080 composition. BreakingHook + ContextPanel slides. Uses dre_horizontal_v3.png
- `ProblemSolution.tsx` — Activated with signature background
- `Root.tsx` — Registered all 6 compositions

### Phase 4 — Intelligence Layer (Session 1)
- `modules/variation-engine.js` — Posts above threshold (15+ likes or 500+ views) → Claude generates 5 variations → staggered posting every 6h
- `modules/hook-tester.js` — Generates 5 hook variations per topic. Analyzes hook performance from Supabase by engagement score. CLI runnable.
- `modules/feedback-loop.js` — Queries last 7 days from Supabase. Claude extracts top patterns. Updates performance-brief.json + writes to performance_briefs table.
- `AdCreative.tsx` — 1920×1080 composition for Module 7 video output. Uses dre_horizontal_v3.png.

### Phase 5 — Distribution + Phase 1 Completion (Session 2)
- **Supabase live** — schema applied, all 4 tables confirmed. Switched client from anon key to service_role key to bypass RLS. Writes verified.
- **NewsAPI live** — 416+ results on first query. news-agent dedup working.
- **Shotstack live** — Sandbox key confirmed. youtube-cutter and format-agent wired.
- **OpenAI live** — Whisper transcription unblocked for youtube-cutter.
- **Multi-platform distribution wired in index.js:**
  - `distributeImagePost()` — Instagram via Supabase Storage (requires "agent-x-images" public bucket)
  - `distributeVideoPost()` — TikTok + YouTube Shorts (graceful skip if tokens not set)
  - All platform posts logged to Supabase with platform field
- **scheduler.js additions:**
  - YouTube cutter — daily 10am, reads YOUTUBE_CHANNEL_ID RSS (no API key needed), dedupes via news_seen
  - Hook tester — every 6h at :30 offset, runs analyzeHookPerformance(), logs top hooks
- **Bug fix:** CPC currency parsing in ad-performance.js (strips $, %, x before parseFloat)

---

## TEST RESULTS (2026-04-19)

| Test | Result | Notes |
|---|---|---|
| `node index.js --test` — LinkedIn + Threads | ✅ PASSED | Both posted, both in Supabase |
| `node modules/ad-performance.js test-ads.csv` | ✅ PASSED | 3/5 flagged, $4.08 avg CPC, copy generated |
| Supabase write (service key) | ✅ PASSED | Insert + delete confirmed |
| NewsAPI connectivity | ✅ PASSED | 416 results |
| Shotstack API | ✅ PASSED | Key accepted |
| OpenAI API | ✅ PASSED | 200 OK |
| Scheduler startup (6 crons) | ✅ PASSED | All 6 jobs registered |
| Threads live post | ✅ PASSED | ID: 18094589483115427 — @drevonbullock.ai |
| Instagram image post | ✅ PASSED | ID: 17871326262601032 — Supabase Storage → Instagram |
| Supabase Storage bucket | ✅ CREATED | agent-x-images — public, 10MB limit, png/jpg/webp |
| Three-platform simultaneous post | ✅ PASSED | LinkedIn + Threads + Instagram — all logged to Supabase |
| JSON extraction hardened (generate-image.js) | ✅ FIXED | Balanced-brace walker — immune to `}` inside strings and trailing prose |
| Em dash prohibition | ✅ FIXED | Added to VOICE, VIDEO_SYSTEM_PROMPT, REACTIVE_SYSTEM — verified zero em dashes in output |
| Instagram square format (1080x1080) | ✅ FIXED | Independent square image path: `generateImageForInstagram` → `renderSquareCard` with dre_square_v3.png background |
| Instagram container publish timing | ✅ FIXED | `waitForContainer` polls status before publish — eliminates "media not ready" 400 errors |
| Instagram carousel v1 (wrong layout) | ❌ FAILED | Custom HTML — did not match locked template |
| Instagram carousel v2 (locked template) | ✅ PASSED | ID: 18146758267488357 — Inter font, geo circles, glassmorphism cards, correct layout |
| Instagram Reel (vertical video) | ✅ PASSED | ID: 18179994409349489 — 1080x1920 HookRevealVertical @ dre_vertical_v3.png |
| Threads video post | ✅ PASSED | ID: 17886260451374432 — @drevonbullock.ai |
| Supabase video bucket | ✅ CREATED | agent-x-videos — public, video/mp4 allowed |
| HookRevealVertical composition | ✅ BUILT | Root.tsx — 1080x1920, bgImage prop, dre_vertical_v3.png background |

---

## PHASE 4 — VIDEO POSTING COMPLETE ✅

**Instagram Reel + Threads video both live.**

**What was built:**
- `bgImage` prop added to `VideoCompositionProps`, `HookReveal`, `HookScreen`, `WordReveal` — defaults to `dre_square_v3.png`, backward compatible
- `HookRevealVertical` composition registered in `Root.tsx` — 1080x1920, `bgImage: "dre_vertical_v3.png"` in defaultProps
- `agent-x-videos` Supabase Storage bucket — created via REST API (JS client `createBucket` fails on free plan), public, accepts `video/mp4`
- `test-video.js` — renders + uploads + posts to Instagram Reel + Threads video in one run

**Render command:**
```
cd remotion-videos && npx remotion render src/index.ts HookRevealVertical output-vertical.mp4
```
Note: must use positional composition ID — `--compositionId` flag triggers interactive selector in Remotion v4.

**Upload + Post command:**
```
node test-video.js
```

**Supabase bucket note:** `supabase.storage.createBucket()` via JS client fails with "object exceeded max size" on free plan. Use REST API directly (`POST /storage/v1/bucket` with service key) — works every time.

---

## PHASE 3 — CAROUSEL COMPLETE ✅

**Built:** `modules/carousel-generator.js` — full carousel pipeline:
- Claude generates hook + 3 content slides + CTA in one API call (5 slides total)
- CSS loaded from `templates/carousel-template.html` at runtime — never hardcoded
- Slide HTML matches locked template exactly: Inter font, geo SVG circles, bg-gradient, bg-grid, vignette, corner brackets, glassmorphism cards
- `<img class="bg-image">` with dre_square_v3.png as base64 data URL
- Puppeteer renders each 1080x1080 @2x with `networkidle2` (allows Google Fonts to load)
- Slides uploaded to Supabase Storage `agent-x-images/carousels/`
- Posted to Instagram as native carousel via multi-container + publish API flow
- Logged to Supabase `posts` table with `post_type="carousel"`
- Wired in `index.js` — fires every 3rd post when Instagram is active + withImage=true

**Template:** `templates/carousel-template.html` — single source of truth for all CSS:
- `hook` — centered content, geo SVG overlay, 3-line headline, divider, swipe CTA
- `content` — slide tag, headline+accent, 80px icons row, 3 glassmorphism cards (flex:1), slide num footer
- `cta` — geo SVG overlay, comment-to-get, follow button, keyword highlight

**Keyword map (CTA keyword selection):**
| Topic phrase | Keyword |
|---|---|
| AI automation | AUTOMATE |
| Claude Code | CLAUDE |
| Make.com | MAKE |
| Agentic workflows | AGENTS |
| AI tools | TOOLS |

**CLI test:** `node modules/carousel-generator.js "your topic"`

---

## ENV VARS — LIVE vs PENDING

```
# LIVE ✅
ANTHROPIC_API_KEY
GEMINI_API_KEY
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID
LINKEDIN_ACCESS_TOKEN / LINKEDIN_PERSON_URN / LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
OPENAI_API_KEY
SUPABASE_URL / SUPABASE_KEY / SUPABASE_SECRET_KEY
NEWS_API_KEY
SHOTSTACK_API_KEY / SHOTSTACK_API_KEY_PROD / SHOTSTACK_ENV

# PENDING — needed to unlock platform expansion
TIKTOK_ACCESS_TOKEN                    → TikTok Content Posting API (requires app approval)
INSTAGRAM_ACCESS_TOKEN                 → Meta Graph API (requires Business Suite app)
INSTAGRAM_BUSINESS_ID
YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
YOUTUBE_CHANNEL_ID                     → enables daily youtube-cutter RSS check
```

---

## PHASE 1 — COMPLETE ✅
LinkedIn + Threads live, posting, and logging to Supabase. 3x/day on Railway.
Phase 2 begins when Instagram + TikTok + YouTube credentials arrive.

---

## SUPABASE STORAGE — agent-x-images bucket

Required for Instagram image posts. Create once manually:

1. Supabase dashboard → **Storage** → **New bucket**
2. Name: `agent-x-images`  |  Toggle **Public bucket** ON
3. Click **Create bucket**
4. Go to **Policies** → add a policy allowing INSERT for the service role

Once created, `distributeImagePost()` uploads image buffers and passes the public URL to Instagram. No code changes needed.

---

## yt-dlp — Railway build

Added `nixpacks.toml` to project root. Railway's Nixpacks builder installs yt-dlp automatically on next deploy:
```toml
[phases.setup]
nixPkgs = ["yt-dlp"]
```

---

## PHASE 2 — COMPLETE ✅ (updated distribution rules)

| Platform | Status | Post Type | Schedule | Notes |
|---|---|---|---|---|
| LinkedIn | ✅ LIVE | Text + single images | 9am, 1pm, 6pm EST | Video every 10th post |
| Threads | ✅ LIVE | Text + carousel (every 3rd) | 8:30am, 12:30pm, 5:30pm EST | Independent schedule |
| Instagram | ✅ LIVE | Carousels only | 10am, 3pm, 8pm EST | Independent schedule |
| TikTok | ⏳ Pending | — | — | Needs TIKTOK_ACCESS_TOKEN |
| YouTube Shorts | ⏳ Pending | — | — | Needs YOUTUBE OAuth credentials |

**Per-platform post type rules (enforced in code):**
- LinkedIn: text + single 16:9 image. No carousels. Video every 10th LinkedIn post.
- Instagram: carousel only via `carousel-generator.js`. No single flat images ever.
- Threads: text posts fill slots 1, 2 of every 3. Slot 3 = carousel. No images.

**Supabase post counts are per-platform** — `loadPostCount("threads")` used for Threads carousel cadence, `loadPostCount("linkedin")` for video every 10th.

**Platform functions:**
- `runLinkedIn(withImage)` — LinkedIn only
- `runInstagram()` — Instagram carousel only
- `runThreads()` — Threads text or carousel

**Carousel generator split:** `renderCarousel(topic)` → `{imageUrls, caption}` (renders + uploads, no post). Platform-specific wrappers: `generateAndPostCarousel()` (Instagram) and `generateAndPostCarouselToThreads()` (Threads).

**Test commands:**
```
node index.js --test               → LinkedIn (9am slot)
node index.js --test-instagram     → Instagram carousel
node index.js --test-threads       → Threads (text or carousel based on count)
node modules/carousel-generator.js instagram "topic"   → Instagram carousel
node modules/carousel-generator.js threads "topic"     → Threads carousel
```

## PHASE 3 — GATE CONDITIONS

| Credential | Unlocks |
|---|---|
| `TIKTOK_ACCESS_TOKEN` | Video posts to TikTok |
| `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN` | YouTube Shorts |
| `YOUTUBE_CHANNEL_ID` | Daily youtube-cutter RSS check |

---

## WHAT STILL NEEDS EXTERNAL SETUP

1. **Supabase Storage** — `agent-x-images` public bucket (already created)
2. **TikTok** — Content Posting API app approval (developers.tiktok.com — restricted access)
3. **YouTube** — Google Cloud project + OAuth consent screen + refresh token
4. **Runway ML** — Phase 4 only, optional, for AdCreative video generation

---

## ARCHITECTURE NOW

```
Scheduler (node-cron) — all times EST
  ├── LinkedIn  9am (image) ──────────────→ runLinkedIn(true)  → Claude → LinkedIn
  ├── LinkedIn  1pm (text) ───────────────→ runLinkedIn(false) → Claude → LinkedIn
  ├── LinkedIn  6pm (text) ───────────────→ runLinkedIn(false) → Claude → LinkedIn
  ├── Instagram 10am ─────────────────────→ runInstagram()     → carousel-generator → Instagram
  ├── Instagram  3pm ─────────────────────→ runInstagram()     → carousel-generator → Instagram
  ├── Instagram  8pm ─────────────────────→ runInstagram()     → carousel-generator → Instagram
  ├── Threads   8:30am ───────────────────→ runThreads()       → text or carousel → Threads
  ├── Threads  12:30pm ───────────────────→ runThreads()       → text or carousel → Threads
  ├── Threads   5:30pm ───────────────────→ runThreads()       → text or carousel → Threads
  ├── Every 30min  → news-agent.js → NewsAPI → Claude → LinkedIn
  ├── Every 6h     → variation-engine.js → Supabase winners → Claude → LinkedIn
  ├── Every 6h:30  → hook-tester.js → analyzeHookPerformance() → logs top hooks
  ├── Daily 11am   → youtube-cutter.js → Channel RSS → Whisper → Claude → Shotstack
  └── Every Sunday → feedback-loop.js → Supabase → Claude → performance-brief.json

Manual triggers:
  node index.js --test                                → LinkedIn test run
  node index.js --test-instagram                     → Instagram carousel test
  node index.js --test-threads                       → Threads test run
  node modules/carousel-generator.js instagram topic → Instagram carousel
  node modules/carousel-generator.js threads topic   → Threads carousel
  node modules/ad-performance.js ads.csv             → ad copy variations JSON
  node modules/youtube-cutter.js <url>               → 8 clips + captions JSON

Distribution (live when tokens set):
  distributors/tiktok.js          → video posts
  distributors/instagram.js       → carousel posts (postCarouselToInstagram)
  distributors/threads.js         → text + carousel posts (postCarouselToThreads)
  distributors/youtube-shorts.js  → video posts
```

---

## DEFINITION OF DONE — STATUS

| Goal | Status |
|---|---|
| Runs 24/7 on Railway without manual input | ✅ |
| Ad CSV → copy variations in under 5 minutes | ✅ Tested and confirmed |
| All videos use signature background frames | ✅ All 7 compositions |
| Reactive news post within 60 min of story breaking | ✅ NewsAPI polls every 30 min |
| YouTube URL → 8 clips automatically | ✅ youtube-cutter.js |
| Content resized for 4+ platforms | ✅ format-agent.js (6 platforms) |
| Performance data stored and analyzed weekly | ✅ feedback-loop.js + Supabase |
| System improves week over week | ✅ performance-brief.json auto-updates |
| Multi-platform distribution wired | ✅ Wired, pending platform API credentials |
| Supabase logging on every post | ✅ Confirmed via live test |
