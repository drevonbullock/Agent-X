# Agent X — Mistakes Log + Fixes
**Purpose:** Reference this before every build. Each entry = a real mistake that happened + how it was fixed.

---

## 1. CarouselSlide header cut off by Instagram UI overlay
**Session:** 2026-04-20

**What happened:** TopLabel and content were placed at `top: 160px` / `padding-top: 240px`. Instagram's UI (notifications, username bar) covers the top ~250px. Header was invisible in the feed.

**Fix:** Moved `TopLabel` to `top: 260`, `CornerBrackets` PT to `240`, `ListItemSlide` padding-top to `340px`. Instagram's bottom bar covers ~380px — CTA button was also too low before safe-zone padding.

**Rule:** For all 1080×1920 (9:16) compositions posted to Instagram: safe zone = top 260px, bottom 400px. Never place interactive or headline text outside this window.

---

## 2. Video looks dull/dark on mobile OLED screens
**Session:** 2026-04-20

**What happened:** Background color `#0a0f1e` renders near-black on OLED mobile screens. Compared side-by-side in Instagram feed, the video was visibly duller than competitors with lighter backgrounds.

**Fix:** Lifted background to `#0d1830`, added `filter: "brightness(1.28)"` to all three slide root divs in CarouselSlide.tsx. All text and card elements inherit the brightness boost automatically.

**Rule:** Always test Remotion compositions on a real phone screen. What looks correct in browser preview can render 30-40% darker on OLED. Default: add `brightness(1.2+)` to any composition with a very dark background that posts to mobile platforms.

---

## 3. CTA slide showed "COMMENT" instead of the actual keyword
**Session:** 2026-04-20

**What happened:** The `extractKeyword()` function in CarouselSlide.tsx looked for the pattern `Comment "KEYWORD"` in the CTA heading. The preview script in Root.tsx had a generic heading that didn't match this format, so the function fell back to the default: "COMMENT".

**Fix:** Updated Root.tsx preview script's last screen to: `{ screen: 5, heading: 'Comment "AUTOMATE"', body: "and I'll send you my free AI systems playbook." }`. The regex now matches and extracts "AUTOMATE" correctly.

**Rule:** Whenever you add a new CTA extraction function in Remotion, also update Root.tsx preview script to use an example that actually exercises the extraction logic. Don't leave placeholder headings in preview data.

---

## 4. Threads posts truncated mid-sentence
**Session:** 2026-04-20

**What happened:** `runThreads()` was calling `generateLinkedInPost()` (150-500 word posts) then slicing the output to 500 characters. This cut sentences mid-word and produced incoherent posts.

**Fix:** Created `generateThreadsPost()` in `agent/generate-post.js` — a native Threads writer. Under 400 chars, complete thoughts, 5 topic/format variants. The LinkedIn generator is never called for Threads.

**Rule:** Never adapt one platform's content to another by truncation. Always write natively per platform. LinkedIn (150-400 words), Threads (under 400 chars), Instagram caption (under 300 chars).

---

## 5. Threads carousel "Invalid Carousel Children" API error
**Session:** 2026-04-20

**What happened:** Threads carousel creation was failing with an invalid carousel children error. The child media containers were created and immediately referenced in the carousel container creation call — before Threads had time to process them.

**Fix:** Added `await new Promise((r) => setTimeout(r, 5000))` between child container creation and carousel container creation in `distributors/threads.js`.

**Rule:** Threads (and Instagram) carousel APIs need processing time after child container creation. Always add a 5-second wait before assembling the carousel container. This is not documented by Meta but is required in practice.

---

## 6. Railway crash — SUPABASE_SECRET_KEY vs SUPABASE_KEY confusion
**Session:** 2026-04-20

**What happened:** Railway crashed immediately after deploy with `SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env`. Railway dashboard showed `SUPABASE_KEY` (the publishable anon key `sb_publishable_...`) was set. The code requires `SUPABASE_SECRET_KEY` (service role key `sb_secret_...`) to bypass RLS and do DB writes.

**Fix:** Added `SUPABASE_SECRET_KEY=sb_secret_...` (service role key) to Railway Variables. The `SUPABASE_KEY` (anon key) can stay too — they serve different purposes.

**Rule:** Supabase has two keys:
- `SUPABASE_KEY` = anon/publishable key (`sb_publishable_...`) — for client-side reads, subject to RLS
- `SUPABASE_SECRET_KEY` = service role key (`sb_secret_...`) — bypasses RLS, required for server writes

Agent X always uses the service role key. Railway env var must be named `SUPABASE_SECRET_KEY` exactly.

---

## 7. News agent posting too frequently (multiple per hour)
**Session:** 2026-04-20

**What happened:** The news agent had no rate limiting. It ran every 30 minutes and would post every time a new article appeared — potentially 20+ posts/day per platform, overwhelming the feed and hitting API rate limits.

**Fix:** Added `canPost(platform)` function with `DAILY_CAP=3` and `COOLDOWN_HOURS=4`. Checks Supabase `posts` table for `format: "news_reaction"` posts today, and time since last post. Only fires if both conditions pass.

**Rule:** Any polling agent that can post (news, variation engine, etc.) must have both a daily cap AND a cooldown. Daily cap prevents volume abuse. Cooldown prevents burst behavior right after midnight reset.

---

## 8. Instagram Reel compositions not in Instagram safe zone
**Session:** 2026-04-20

**What happened:** Content (text, cards) were placed without accounting for Instagram's non-removable UI overlays on Reels: ~250px UI bar at top (time, notifications), ~380px interaction bar at bottom (like, comment, share, follow). Any text in those zones is hidden.

**Fix:** In CarouselSlide.tsx all content was moved to the middle safe band: top start at 260px, nothing below 1540px (leaving 380px for bottom UI).

**Measurements (1080×1920 canvas):**
- Safe top: 260px
- Safe bottom: 1540px (= 1920 - 380)
- Safe height: 1280px

---

## 9. Supabase JS client `createBucket()` fails silently on free plan
**Session:** Earlier sessions (logged for reference)

**What happened:** `supabase.storage.createBucket()` returned a size-exceeded error on the free plan. Bucket was not created but no error was thrown in the catch block.

**Fix:** Always create buckets via REST API directly: `POST ${SUPABASE_URL}/storage/v1/bucket` with Authorization and apikey headers set to service role key. Check if "already exists" or "Duplicate" in response — treat those as success.

**Rule:** Never use `supabase.storage.createBucket()` from the JS client. Always use direct REST API for bucket creation. The JS client wrapper is unreliable on free plan.

---

## 10. LinkedIn API — post ID in header, not body
**Session:** Earlier sessions (logged for reference)

**What happened:** LinkedIn `POST /rest/posts` returns HTTP 201 with an empty body. Tried to parse post ID from response body and got null.

**Fix:** Post ID lives in the response header `x-restli-id`, not the body. Parse it with `response.headers.get("x-restli-id")`.

**Rule:** For all LinkedIn REST API write operations, check response headers for `x-restli-id`. Never expect post IDs in the JSON body — it's empty on success.

---

## 11. LinkedIn signed URL upload — do NOT send Authorization header
**Session:** Earlier sessions (logged for reference)

**What happened:** Sending `Authorization: Bearer TOKEN` to the LinkedIn pre-signed upload URL returned a 403. The URL is already authenticated via query params.

**Fix:** Strip the Authorization header from the PUT request to the signed URL.

**Rule:** Pre-signed upload URLs (LinkedIn, AWS S3, Supabase) are already authenticated. Never add an Authorization header — it conflicts with the URL's own auth mechanism and causes 403s.

## 2026-07-13 — Token expiry outage + Higgsfield upgrade session
- **Instagram + Threads were down since ~June 18**: both Meta long-lived tokens expired (60-day lifetime). Nothing in the codebase refreshed them. Fix: `modules/token-manager.js` — startup validation (loud ❌ log), refresh every 3 days, refreshed tokens persisted in Supabase `platform_tokens` so they survive deploys. Lesson: any credential with an expiry needs an automated refresh loop AND a startup validation that fails loudly, the day it ships.
- **USE_HIGGSFIELD=true was set on Railway but the CLI doesn't exist there** — PATH B silently failed and fell back every night. Fix: `isHiggsfieldCliAvailable()` fast check + explicit skip log. Lesson: gate optional-binary paths on availability, not just an env flag.
- **Puppeteer ≥22 returns Uint8Array from page.screenshot()** — `.toString("base64")` on it silently produces garbage (broken data URIs). Always `Buffer.from(shot).toString("base64")`.
- **News renderer would happily screenshot 404 pages.** Added HTTP ≥400 + soft-404 template guards that throw → news-agent falls back to cheatsheet.
- Higgsfield assets are generated via the MCP connector at build time and committed to the repo (`images/backgrounds/`, `assets/video-backgrounds/`) — zero runtime dependency on Railway.
- **Anthropic API credits ran out — silently killed ALL platforms at once** (every post starts with a Claude call; LinkedIn was down too despite a valid token). Added `checkAnthropicCredit()` startup health check (1 token/boot, loud ❌ log). Lesson: monitor the dependency EVERY workflow shares, not just per-platform credentials.
- Carousel v2: serif-italic accent spans must set `text-transform:none` explicitly — parent slide lines are uppercase-transformed.
