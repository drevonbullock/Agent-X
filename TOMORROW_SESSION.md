## Agent X — Session Starter Prompt (copy/paste this tomorrow)

---

We're continuing work on Agent X, an automated Instagram Reel pipeline.
Project is at: `/Users/drevonbullock/C.C. Agent X/Agent X`

---

## ✅ COMPLETED (as of 2026-04-20)

1. **Full pipeline end-to-end — LIVE** ✅
   - ElevenLabs voiceover with word timestamps
   - Claude Haiku picks a visual moment per screen
   - Gemini generates a matching image
   - Remotion renders as a floating card (centered bottom, 750×430px) that slides in while the voiceover talks
   - 4K render (2160×3840) → ffmpeg compress to 1080p → Supabase upload → Instagram Reel post

2. **CTA fix — CONFIRMED WORKING** ✅
   - Claude Haiku returns `{"keyword":"...","resource":"..."}` clean — JSON markdown fences stripped in `generateCTAScreen()`
   - Tested: CTA keyword "DEMYSTIFIED" generated and voiced correctly as final screen
   - Reel published live on Instagram

3. **Runway image-to-video integration — BUILT** ✅
   - `agent/runway.js` — Runway Gen-3 Turbo client (create task → poll → download)
   - `generateVisualForScreen()` in `agent/generate-video.js` calls Runway after Gemini when `RUNWAY_API_KEY` is set
   - Falls back to static Gemini image if key missing or Runway fails
   - `Visual` interface in `ListCountdown.tsx` now has `clipFile?: string`
   - `VisualCard` in `HookReveal.tsx` uses `<Video>` when `clipFile` present, `<Img>` otherwise
   - **TO ACTIVATE:** Add `RUNWAY_API_KEY=your_key` to `.env`

4. **CarouselSlide BCG template — BUILT + LIVE** ✅
   - `remotion-videos/src/compositions/CarouselSlide.tsx` — full BCG carousel visual style
   - Dark navy `#0a0f1e` bg, circuit grid overlay, cyan corner brackets
   - 3 slide variants: Cover (screen 1), List item cards (numbered, spring animated), CTA (keyword badge + follow button)
   - Spring entrance + breathing loop on cards, voiceover-synced
   - Registered as `CarouselSlideVertical` (1080×1920) in Root.tsx
   - Added to pipeline: `carousel_slide_vertical` style in `generate-video.js`
   - `test-carousel.js` test runner — full render → upload → Instagram post
   - Tested end-to-end: 48.4s reel rendered, posted live on Instagram

---

## NEXT SESSION — What to build

### 5. White-label mode
Make the carousel template white-label ready so it can be deployed for clients:
- Read `BRAND_AUTHOR`, `BRAND_HANDLE`, `BRAND_NICHE` from `.env` (already documented in `.env.example`)
- Pass brand overrides as props to `CarouselSlide` (author name in bottom bar, label text, handle on CTA button)
- Default to "DRE'VON BULLOCK / @DREVON" if env vars not set

### 6. Auto-style selection
Currently `videoStyle` is hardcoded per test runner. Add a Claude Haiku call in `generateVideo()` that picks the best style based on the script topic:
- `list_countdown` → numbered tips, how-tos, step-by-step
- `hook_reveal_vertical` → story-driven, emotional, narrative
- `carousel_slide_vertical` → authority/framework posts, "N things you need" format
- Expose as `videoStyle: "auto"` option

### 7. Scheduler integration
Wire the carousel style into the `scheduler.js` daily posting slots — the 9 AM post should alternate between `hook_reveal_vertical` and `carousel_slide_vertical`.

---

## Key files
- `agent/generate-video.js` — main pipeline (CTA + visual generation + Runway)
- `agent/runway.js` — Runway Gen-3 image-to-video client
- `remotion-videos/src/compositions/CarouselSlide.tsx` — BCG carousel template
- `remotion-videos/src/compositions/HookReveal.tsx` — VisualCard with Video/Img toggle
- `remotion-videos/src/compositions/ListCountdown.tsx` — Visual interface (has clipFile)
- `remotion-videos/src/Root.tsx` — Remotion composition registry
- `test-reel.js` — HookRevealVertical pipeline test
- `test-carousel.js` — CarouselSlideVertical pipeline test
