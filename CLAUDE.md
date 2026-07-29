# Agent X — Project Context for Claude

## What This Is
Agent X is an autonomous, multi-platform content engine. It runs on a Node.js
cron schedule and generates + posts AI content (text, images, carousels, and
video) across **LinkedIn, Instagram, Threads, TikTok, and YouTube Shorts** with
zero manual input. It also runs background loops that reply to comments, spin
winning posts into variations, and analyze its own performance weekly.

The system is **white-label**: brand identity (author, niche, audience, active
platforms) is driven by `BRAND_*` env vars and resolved into `AGENT_CONFIG` in
`index.js`. Default brand is Drevon Bullock / Bullock Consulting Group.

## Tech Stack
- **Runtime**: Node.js (ES Modules, `"type": "module"`). Native `fetch` (Node 18+) — no Axios, no platform SDKs except where noted.
- **Text AI**: Anthropic Claude via `@anthropic-ai/sdk`. `claude-sonnet-4-6` for content/scripts, `claude-haiku-4-5-20251001` for fast routing (style detection, comment replies). Some older modules still reference the `claude-sonnet-4-20250514` alias.
- **Image AI**: Google **Gemini 2.5 Flash Image** (`images/gemini.js`) for backgrounds + comic art. NOT Imagen 3 — that reference is stale.
- **Image rendering**: Puppeteer + inline HTML/CSS (news cards, carousels). Carousel video covers use Puppeteer frame-capture + ffmpeg.
- **Video**: **Hyperframes** (GSAP motion-graphics renderer, the primary pipeline) + HeyGen avatars + raw-footage processing. Runway Gen-3 (image-to-video), Topaz (upscale), ElevenLabs (voiceover/SFX/jingle), `ffmpeg`/`yt-dlp` shell out. Shotstack code exists (`format-agent.js`, `shotstack-enhance.js`) but the main pipeline has moved off it.
- **Data**: Supabase (Postgres + Storage) is the system of record — post log, analytics, crash-safe job queue, dedup tables. Replaces the old `post_count.json`.
- **Scheduler**: `node-cron` (all times `America/New_York`).
- **HTTP server**: Native `http` — serves the Instagram comment webhook.
- **Deploy**: Railway via `nixpacks.toml` (installs `yt-dlp` + `ffmpeg`) and `Procfile` (`worker: node index.js`).

## Architecture & Data Flow
```
scheduler.js (cron)
  └─> index.js run functions ──> generate ──> render ──> post ──> log to Supabase
        runLinkedIn(withImage)        post-to-linkedin.js
        runInstagram                  (carousel; news image via modules/news-agent)
        runThreads
        runVideo                      one clip ──> review_queue ──> (on approval) all platforms
  └─> modules/* background jobs (news, variations, replies, feedback, hooks, youtube)

Every post is logged to Supabase `posts`. Counts in `posts` drive cadence
decisions (e.g. Threads carousel every 3rd post). High performers get cloned by the
variation engine; weekly analysis writes a performance brief back into the
generators.
```

## Project Structure
```
index.js              — Orchestrator. Defines AGENT_CONFIG (white-label), the
                        per-platform run functions (runLinkedIn, runInstagram,
                        runThreads), runVideo (single all-platform video job),
                        videoTargets(), and an HTTP server for the Instagram
                        webhook + the /review video-approval dashboard.
                        CLI: --test, --test-instagram, --test-threads,
                        --review, --approve <id>, --reject <id>, --process-reviews.
scheduler.js          — All node-cron jobs (posting slots + background loops).

agent/                — Generation + direct-post primitives
  generate-post.js      generateLinkedInPost() {postText,format}; generateThreadsPost() string;
                        generateVideoPost() {caption,videoScript,videoStyle}. Holds the
                        VOICE system prompt, weighted FORMATS, and TOPICS pools.
  generate-image.js     generateImage / generateImageForInstagram(postText) → news card
                        (1080x1350) or null. Haiku relevance gate first; cheatsheet REMOVED.
  generate-video.js     generateVideo(postText, videoScript, videoStyle) → routes to
                        raw footage (PATH A), HeyGen avatar, or Hyperframes (PATH B).
  generate-hyperframes-video.js  Builds GSAP HTML, lints + renders MP4 via Hyperframes.
  post-to-linkedin.js   postToLinkedIn(text, imageBuffer, videoAsset) → {postId, postUrl}.
  post-to-twitter.js    postTweet(...) — legacy, not in the main flow.
  elevenlabs.js         Voiceover per screen + audio transcription (word timestamps).
  generate-jingle.js / generate-sfx.js  One-time ElevenLabs audio-asset bootstrap.
  fetch-news-url.js     Firecrawl search → trusted-domain news URL for NEWS image mode.
  fetch-company-logo.js Clearbit logo fetch (hardcoded domain map, cached).
  capture-screenshot.js Playwright headline capture / proof-card render.
  process-raw-footage.js ffmpeg pipeline: transcribe, cut silence, grade, burn subs, overlay.
  generate-heygen-avatar.js  HeyGen talking-head video, composited behind motion graphics.
  runway.js             Runway Gen-3 image-to-video clips.
  topaz.js              Topaz upscale (image + video), ffmpeg Lanczos fallback.

images/               — Renderers (most output PNG Buffers)
  gemini.js             generateGeminiImage(prompt) — Gemini 2.5 Flash Image, retry on 503/429.
  render-news-screenshot.js  renderNewsScreenshot(url) — editorial news cover from og: meta (v3).
  render-quote-card.js  renderQuoteCard / renderSquareCard / renderVerticalCard.
  render-boardroom.js   3-panel anime comic (Gemini art + dialogue overlay).
  chart.js / quote-card.js  Legacy canvas renderers, not in main flow.

distributors/         — Platform publish layer (Meta/TikTok/YouTube APIs)
  instagram.js          postImageToInstagram / postReelToInstagram / postCarouselToInstagram.
  threads.js            postTextToThreads / postImageToThreads / postVideoToThreads / postCarouselToThreads.
  tiktok.js             postVideoToTikTok (resumable file upload) / checkPostStatus.
  youtube-shorts.js     uploadYouTubeShort (OAuth2 refresh) / getChannelInfo.

modules/              — Autonomous engines (run from scheduler)
  news-agent.js         postLinkedInNewsImage / postInstagramNewsImage / checkAndPost.
                        Reactive posts off NewsAPI with per-platform daily caps.
  variation-engine.js   checkPerf() finds winners + queues 5 variations;
                        processVariationQueue() posts due items (crash-safe via DB).
  feedback-loop.js      runWeeklyAnalysis() → data/performance-brief.json + Supabase;
                        readBrief() feeds insights back to generators.
  hook-tester.js        generateHookVariations(topic) / analyzeHookPerformance().
  comment-reply.js      handleInstagramWebhook(body) / pollThreadsReplies();
                        Claude-Haiku auto-replies + keyword-lead capture.
  carousel-generator.js generateAndPostCarousel / ...ToThreads — HTML→PNG slides.
  review-queue.js       Video approval gate. enqueueVideo() compresses+uploads a render to
                        Supabase and parks it 'pending'; processReviewQueue() publishes
                        'approved' rows to every target; listPendingReviews/decideReview +
                        renderReviewPageHtml (the /review dashboard).
  youtube-cutter.js     processYouTubeVideo(url) — yt-dlp + Whisper + Claude clip selection.
  format-agent.js       Shotstack multi-platform resize (legacy/secondary).
  ad-performance.js     analyzeAdPerformance(csv) — flags + rewrites underperforming ads.
  shotstack-enhance.js  generateCinematicVideo(script) — Shotstack pipeline (legacy/secondary).
  competitor-research.js mineCompetitors() — IG Business Discovery pulls rivals' top posts,
                        Claude vision extracts their design system, synthesizes new themes into
                        `design_themes`; loadDynamicThemes() feeds them to the optimizer pool.

analytics/            — Closes the learning loop: pulls REAL metrics back per platform
  index.js              syncAllMetrics() writes live views/likes/comments/shares +
                        engagement_rate into posts; runAnalyticsCycle() = sync → learn →
                        decide A/B. Re-exports learn + ab helpers.
  fetch-instagram.js    fetchInstagramMetrics(mediaId) — Graph API insights (needs insights scope).
  fetch-threads.js      fetchThreadsMetrics(mediaId) — Threads insights (replies→comments etc.).
  fetch-linkedin.js     fetchLinkedInMetrics(urn) — best-effort likes/comments via socialActions; views N/A.
  learn.js              learnPerPlatform() aggregates real metrics into platform_performance;
                        getBestFor(platform, dimension) reader that biases generateLinkedInPost.
  ab-testing.js         createExperiment() pairs two posts; evaluateExperiments() scores +
                        picks a winner after the window; scorePost() shared scoring.
  design-variants.js    IMAGE_THEMES (accent/bg/font presets) + COPY_STYLES (prompt
                        directives). First entry of each = brand default. getTheme/getCopyStyle.
  optimizer.js          pickVariant(platform, postType) chooses champion vs challenger;
                        adaptAll() recomputes the rolling baseline, detects a 5-post
                        decline (→ explore), and promotes winning variants (→ exploit).

supabase/
  client.js             Default export: Supabase client built with SUPABASE_SECRET_KEY.
  log-post.js           Shared logPost() — writes every successful publish to `posts`
                        (used by index.js direct posts and the video review queue).
  schema.sql            Run once. Tables below.

auth/
  linkedin-auth.js      One-time OAuth 2.0 browser flow. Writes token + URN to .env.

assets/  music/         Brand logos (horizontal/square/vertical) + background music tracks.
data/    generated_imgs/  raw_footage/  video-projects/   Working dirs (mostly gitignored).
test-*.js  run-reel.js   Ad-hoc manual test entry points (not part of the scheduled flow).
```

## Platforms & Schedule (all EST)
- **LinkedIn** — 4x/day: 8am image, 12pm news image, 4pm text, 8pm image. Single images only, no carousels, no video.
- **Instagram** — 5x/day: 10am news card, 12pm/2pm/6pm carousels (animated video cover + image slides), 8pm news card.
- **LinkedIn** — 1x/day: single conversation-starter text post at 9:30am ET (golden hour). Frequency cut from 7x to 1x on 2026-07-29 for engagement (LinkedIn suppresses flooders). Seed-comment + comment auto-reply are coded but GATED behind LINKEDIN_COMMENT_API=true — socialActions needs LinkedIn's gated Community Management API (w_member_social returns 403).
- **Threads** — 4x/day at :30 offsets. Text by default; carousel every 3rd post.
- **Video — one daily cadence for the whole system.** `runVideo()` (7pm cron) is the ONLY place video renders. It builds one clip, then `enqueueVideo()` parks it in `review_queue` (pending). On approval it cross-posts to **all enabled platforms** (LinkedIn, Instagram, Threads) plus TikTok/YouTube Shorts where tokens are set — `videoTargets()` in `index.js`. Images and written posts auto-publish; video never does.
- **Background loops**: variation queue (30m), Threads reply polling (15m), review-queue publish (10m), variation engine (6h), hook tester (6h :30), analytics sync+learn+A/B+adapt (6h :45), weekly feedback (Sun midnight), competitor mining (Sun 1am), YouTube cutter (11am, if `YOUTUBE_CHANNEL_ID`).
- **Kill switch**: set `POSTING_PAUSED=true` to skip all posting slots (background analysis skips too).

## Supabase Data Layer
Service-role key (`SUPABASE_SECRET_KEY`) is required — all writes bypass RLS.
Tables (`supabase/schema.sql`):
- `posts` — every post. `platform`, `post_type` (text|image|video), `format`, `hook`, native `post_id`, `post_url`, engagement metrics, `is_winner`. Row counts drive cadence.
- `variations` / `variations_queue` — generated clones of winners; queue is the crash-safe scheduler (survives restarts; replaces `setTimeout`).
- `performance_briefs` — weekly top hooks/formats/topics + avoid-patterns.
- `news_seen` — URL dedup for news-agent and youtube-cutter (`article_url` UNIQUE).
- `comment_replies` / `keyword_leads` — reply dedup + CTA-keyword lead capture.
- `platform_performance` — per-platform learning aggregates (best `format`/`post_type` by avg engagement score), recomputed by `analytics/learn.js`.
- `experiments` — A/B variant pairs + decided winner. Posts carry `experiment_id`/`variant`.
- `optimization_state` — per `(platform, post_type)`: current `champion_variant`, `mode` (exploit|explore), `underperform_streak`, rolling `baseline_score`. Drives the adaptive creative loop.
- `review_queue` — rendered videos awaiting human approval. `targets` (jsonb platform list), `video_url` (public Supabase URL), `status` (pending|approved|rejected|posted). Approved rows publish to all targets, then flip to `posted`.
- `competitor_insights` — Claude-vision analysis of competitors' top IG posts (one row per analyzed post, deduped by `permalink`). `analysis` holds the extracted accent/background/font/layout/hook.
- `design_themes` — themes synthesized from competitor analysis (`id` like `comp_<username>`, `theme` jsonb matching IMAGE_THEMES). `active` rows are loaded into the variant pool at runtime so the optimizer can A/B them as challengers.
- `posts.metrics_synced_at` / `posts.design_variant` — last metric pull + which creative variant (theme/copy style) the post used.
- **Storage buckets**: `agent-x-videos`, `agent-x-images` (public) — host media for platforms that require a public URL (Instagram/Threads).

## Analytics & Self-Learning (analytics/)
The columns `posts.views/likes/comments/shares/engagement_rate` are **only real because of this layer** — without it they stay at their `0` defaults and every learning module (feedback-loop, hook-tester, variation-engine) trains on empty data. Flow:
1. **Sync** (`syncAllMetrics`, every 6h at :45) — for each recent post (≤14 days) on Instagram/Threads/LinkedIn, call that platform's insight API and write metrics + `engagement_rate` back into `posts`. Failures degrade to zeros, never throw.
2. **Learn** (`learnPerPlatform`) — aggregate the last 30 days per platform into `platform_performance`, scored by `scorePost = likes + shares*2 + comments*3 + views*0.01`. `getBestFor("linkedin","format")` reads this and softly biases `generateLinkedInPost` toward the winning format (only once `sample_size ≥ 3`, ~50% of the time; otherwise falls back to the weighted pick — so behavior is unchanged until real data exists).
3. **A/B** (`createExperiment` / `evaluateExperiments`) — pair two posted variants as an experiment; after a 24h window, compare synced scores, set the winner, and mark it `decided`. The winning posts feed `learnPerPlatform` naturally.
- Platform coverage: Instagram + Threads via the existing tokens (need `*_manage_insights` scope); LinkedIn is best-effort (likes/comments via `socialActions`, impressions gated → stay 0).
- CLI: `node analytics/index.js` (full cycle), `node analytics/learn.js`, `node analytics/ab-testing.js`, `node analytics/optimizer.js`.

### Adaptive creative loop (`optimizer.js`, `design-variants.js`)
On top of learning, the optimizer actively varies the creative and keeps what wins — currently wired into the **LinkedIn** image + text slots (`runLinkedIn`):
- **Variants**: `IMAGE_THEMES` (accent/background/font presets the parameterized `render-cheatsheet.js` accepts) and `COPY_STYLES` (directives injected into `generateLinkedInPost`). The first of each is the brand default; cold start uses it, so output is unchanged until data exists. Each post is tagged with its `design_variant`.
- **Pick** (`pickVariant`): in `exploit` mode it serves the champion (with a ~15% challenger probe); in `explore` mode it rotates challengers.
- **Adapt** (`adaptAll`, in `runAnalyticsCycle`): recomputes a rolling baseline (median score of the last 20 posts per platform/post_type). It only flips to `explore` after **5 consecutive posts below baseline** (so one slow day never triggers a change), and promotes a challenger to champion once it beats the champion's average with ≥3 samples.
- Scope: video is intentionally excluded (it's gated for manual review — see the video approval gate). The optimizer is currently wired into LinkedIn image + text slots; IG/Threads wiring is the remaining follow-up.

### Competitor mining (`modules/competitor-research.js`)
Feeds the variant pool with rival-inspired designs. Weekly (`mineCompetitors`, Sun 1am): for each handle in `COMPETITOR_IG_HANDLES`, Instagram Business Discovery pulls recent media, picks the top image by engagement, and Claude vision (`claude-sonnet-4-6`) reverse-engineers its design system (accent, dark background, heading font from an allowed Google-Fonts list, layout, hook style). That's stored in `competitor_insights` (deduped by permalink) and synthesized into a `design_themes` row (`comp_<username>`). `loadDynamicThemes()` (called at scheduler startup and after each mining run) loads the active themes via `setDynamicThemes()` so the optimizer A/Bs them as challengers — and promotes any that beat the brand champion. Synthesized themes are validated (`isValidTheme`) so a bad hex/font can never break a render; the active set is capped (default 4). CLI: `node modules/competitor-research.js`.

## Content Generation (agent/generate-post.js)
- A single non-negotiable **VOICE** system prompt defines the persona and hard rules (see Global Post Rules).
- **LinkedIn FORMATS** are weighted and never repeat twice in a row (`lastFormat`/`lastTopic` module vars): `contrarian` (4), `one_liner` (3), `build_update` (2), `insight` (1). These replaced the old `ai_tips/build_in_public/philosophy` content types.
- **TOPICS** are a fixed pool of AI-automation-for-small-business angles.
- **Threads** has its own punchier voice, format list, and topic list, capped at ~400 chars.
- **Video** (`generateVideoPost`) returns `{caption, videoScript[], videoStyle}` as strict JSON; screen 1 is always an 8-word hook, screens 2–5 teach.

## Image Modes (agent/generate-image.js)
**Cheatsheet mode was REMOVED entirely on 2026-07-24** (Dre: posting too consistently / repetitive). `images/render-cheatsheet.js` is deleted.
- **NEWS CARD** is now the only image format — the editorial magazine cover in `images/render-news-screenshot.js` (v3), built from the source article's og: meta tags.
- A Haiku **relevance gate** (`isNewsWorthy`) runs first: only posts naming a real company/institution AND a concrete event get a card. Opinion/controversy posts return `null` → text-only. Without this gate Firecrawl returns a loosely-related article and pairs an unrelated headline+photo with the post.
- `modules/news-agent.js` renders `target.url` **directly** (it already selected the article) rather than re-searching — never mismatches.
- Any failure returns `null` → text-only post. That is intentional: a text controversy post beats a filler graphic.
- `analytics/design-variants.js` IMAGE_THEMES are now inert (no image renderer consumes themes); COPY_STYLES remains live for text.

## Video Pipeline (agent/generate-video.js)
`generateVideo()` dispatches to:
- **PATH A — Raw footage**: if `raw_footage/` has a clip, `process-raw-footage.js` transcribes, trims silence/fillers, color-grades, burns subtitles, and composites a Hyperframes overlay.
- **HeyGen avatar**: talking-head video (`generate-heygen-avatar.js`) composited behind motion graphics.
- **PATH B — Higgsfield CLI** (`USE_HIGGSFIELD=true`): full AI video via the `higgsfield` CLI — skipped with a clear log if the binary isn't installed on the host (Railway doesn't ship it).
- **Hyperframes** (default fallback): pure GSAP motion-graphics MP4 from the `videoScript`, with ElevenLabs voiceover, jingle/SFX, and fetched company logos. A Higgsfield ambient cinematic loop (`assets/video-backgrounds/*.mp4`, rotated by timestamp) renders behind every screen as timed `<video>` segments; screens use translucent gradients so the motion shows through.
- 4K masters are re-encoded to 1080p ≤50MB (`compressForUpload` in index.js) before Supabase upload, because Supabase caps at 50MB.
- `ffmpeg` path is platform-specific: `/usr/bin/ffmpeg` on Linux, `/opt/homebrew/bin/ffmpeg` on macOS.

## Environment Variables
See `.env.example` for the full annotated list. Grouped essentials:
```
# Core AI
ANTHROPIC_API_KEY=     GEMINI_API_KEY=     OPENAI_API_KEY=   (Whisper, youtube-cutter)

# Supabase (service key REQUIRED for writes)
SUPABASE_URL=          SUPABASE_SECRET_KEY=   SUPABASE_KEY= (anon, optional)

# LinkedIn (URN + token set by auth/linkedin-auth.js)
LINKEDIN_CLIENT_ID=  LINKEDIN_CLIENT_SECRET=  LINKEDIN_ACCESS_TOKEN=  LINKEDIN_PERSON_URN=

# Meta — Instagram + Threads
INSTAGRAM_ACCESS_TOKEN=  INSTAGRAM_BUSINESS_ID=  INSTAGRAM_WEBHOOK_VERIFY_TOKEN=
THREADS_ACCESS_TOKEN=    THREADS_USER_ID=        THREADS_USERNAME=
# Meta tokens die every 60 days. modules/token-manager.js validates both at startup
# (loud ❌ log if dead), auto-refreshes every 3 days, and persists refreshed tokens in
# Supabase `platform_tokens` (a valid DB token beats env at boot; a valid env token
# overwrites a dead DB row). After regenerating manually, just update the Railway env var.

# Other platforms
TIKTOK_ACCESS_TOKEN=
YOUTUBE_CLIENT_ID=  YOUTUBE_CLIENT_SECRET=  YOUTUBE_REFRESH_TOKEN=  YOUTUBE_CHANNEL_ID=

# Media / news services
ELEVENLABS_API_KEY=  ELEVENLABS_VOICE_ID=  NEWS_API_KEY=  FIRECRAWL_API_KEY=
COMPETITOR_IG_HANDLES=  (csv of rival IG usernames for the competitor miner; needs INSTAGRAM_BUSINESS_ID)
RUNWAY_API_KEY=  TOPAZ_API_KEY=  HEYGEN_API_KEY=  HEYGEN_AVATAR_ID=
SHOTSTACK_API_KEY=  SHOTSTACK_API_KEY_PROD=  SHOTSTACK_ENV=

# White-label overrides (resolve into AGENT_CONFIG)
BRAND_AUTHOR=  BRAND_TITLE=  BRAND_HANDLE=  BRAND_NICHE=  BRAND_AUDIENCE=
BRAND_PLATFORMS=  (csv, e.g. linkedin,instagram,threads)

# Ops
PORT=  (webhook server, default 3000)   POSTING_PAUSED=true  (global kill switch)
REVIEW_TOKEN=  (shared secret guarding the /review video-approval endpoints; falls
               back to INSTAGRAM_WEBHOOK_VERIFY_TOKEN if unset)
```

The webhook server also serves the video review dashboard: `GET /review?token=...`
lists pending videos (with previews + Approve/Reject links), and
`GET /review/decide?id=...&action=approve|reject&token=...` records the decision
(approve publishes immediately). The scheduler also publishes approved videos every
10 minutes, so approving via the Supabase dashboard (set `status='approved'`) works too.

## LinkedIn API Notes
- Base: `https://api.linkedin.com/rest/`. Posts: `POST /rest/posts`.
- All `/rest/` calls require `LinkedIn-Version: 202503` and `X-Restli-Protocol-Version: 2.0.0` (see `linkedInHeaders()` in `post-to-linkedin.js` — the version is bumped over time).
- Image upload is two-step: `POST /rest/images?action=initializeUpload`, then `PUT` the binary to the returned signed URL. **Do NOT** send `Authorization` on the signed `PUT` — it is pre-signed. Video uses `/rest/videos?action=initializeUpload`.
- New post ID comes from the `x-restli-id` response header (201 body is empty).
- Person URN: `urn:li:person:XXXX` in `LINKEDIN_PERSON_URN`. Tokens expire ~60 days → re-run `node auth/linkedin-auth.js`. Required scopes: `openid profile w_member_social`.

## Running
```bash
node auth/linkedin-auth.js     # one-time LinkedIn OAuth (writes token + URN to .env)

node index.js --test           # single LinkedIn run (8am slot, withImage=true)
node index.js --test-instagram # single Instagram carousel run
node index.js --test-threads   # single Threads run

node index.js --review         # list videos pending review
node index.js --approve <id>   # approve + publish a queued video to all targets
node index.js --reject <id>    # reject a queued video
node index.js --process-reviews# publish any already-approved videos now

node index.js                  # start scheduler + webhook server (production entry)
npm start                      # == node index.js
```
On Railway the `worker` process runs `node index.js`; `nixpacks.toml` provisions `yt-dlp` and `ffmpeg`.

## Global Post Rules (hard constraints in the VOICE prompt)
- **Never** use em dashes (—), en dashes (–), or hyphens as pause separators. Rewrite as flowing prose. (This is the single most-enforced rule.)
- No filler openers: "In today's world", "Let's dive in", "Game changer", "Unpopular opinion", "Hot take", "Let's be honest", "This changes everything".
- Max 2 hashtags. Posts under 6 sentences: 0 hashtags, no image.
- Every post makes exactly one clear point. No quotes wrapping the post text.
- Write for non-technical business owners — no code, no jargon. Never the same format twice in a row.

## Key Conventions
- ES Modules everywhere (`import`/`export`). Prefer native Node APIs; avoid adding npm packages unless strictly necessary.
- Log prefixes are bracketed per subsystem: `[Agent X]`, `[LinkedIn]`, `[Instagram]`, `[Threads]`, `[Scheduler]`, etc.
- Posting functions return `{postId, postUrl}` (or `{mediaId, postUrl}` for Meta) and every successful post calls `logPost(...)`.
- Failures degrade gracefully rather than crash: video → text fallback, image mode → cheatsheet → null (text-only), HeyGen → Hyperframes, Gemini bg → solid, Topaz → ffmpeg.
- Brand accent color `#FF6B00` (orange); watermark `@DrevonBullock • Bullock Consulting Group`.
- Cadence and caps are derived from Supabase counts at runtime — there is no local counter file.
- `README.md` is end-user marketing copy and is partially stale (mentions DALL-E/Imagen 3, LinkedIn-only). Treat this file (CLAUDE.md) as the source of truth for architecture.
