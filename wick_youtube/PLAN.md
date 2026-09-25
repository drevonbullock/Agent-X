# Wick's Wisdom on YouTube — The Plan

Written 2026-09-25. Companion files:
- `STYLE_BIBLE.md` — voice, structure, visual language, Shorts rules
- `SCRIPT_TEMPLATE.md` — the exact script format the render engine will parse
- `SLATE.md` — the first 15 videos and their briefs
- `SHORTS_MAP.md` — all 45 Shorts across the 15 videos
- `scripts/` — the 15 full scripts

---

## 1. THE VERDICT ON STYLE

**Recommendation: flat 2D animation, drawn entirely in code, with a flat redraw
of Wick. Chosen by Dre 2026-09-25.**

What people gravitate toward in explainers, and why:

| Style | Who does it | Why it works | Fit for Wick |
|---|---|---|---|
| **Flat 2D vector** | Kurzgesagt, The Infographics Show, Dalio's *Changing World Order* | Clean shapes let the eye follow the idea. Evergreen, heavily shared as "the video that finally explained X". Dalio's 44 min film passed 35M views | **Best.** Wick is simple geometry (flame + candle). Drawable in code, stays on model forever, costs zero per frame |
| **Hand drawn marker** | After Skool, Sprouts | Feels personal and handmade. Idea driven | Good as an *accent* (TEXT and QUOTE scenes write on in marker), too expensive as the whole look because every drawing needs an AI image |
| **Stick figure comedy** | Various finance storytellers | Cheap, fast, personality through writing | Too cheap-looking for the premium feel Dre wants |
| **Stock footage essay** | Most faceless finance channels | Fast to make | Commodity. Zero brand. Nothing to screenshot |
| **3D mascot stills** | Current Wick IG carousels | Premium mascot look | Can't be drawn in code. ~100 AI images per video, and he drifts. Ruled out: this pipeline is code + OpenRouter only, no Higgsfield |

**Why flat 2D wins for this channel specifically:**
1. **Money explainers ARE diagrams.** Compounding is a curve. Credit is a flow of trust. Inflation is a shrinking coin. Flat 2D draws a mechanism better than any other style.
2. **Volume.** 15 videos × 9 minutes = 135 minutes of animation. The only way that's affordable is when every frame is code, not a paid generation.
3. **Consistency.** A coded Wick can't drift. No generation service, no element ID, no style block to forget.
4. **Portfolio.** "I built an engine that turns a script into a finished 10-minute animated film" is the most credible AI-expert proof on your list. You can sell it to local businesses as explainer videos.

**Does Wick fit your references?** Yes. The combination of references *is* the
channel: Dalio's big picture (HISTORY pillar), The Egg's emotion (STORY pillar),
Kurzgesagt's mechanisms (MECHANISM pillar), After Skool's idea-driven marker
moments (MINDSET pillar). Wick is the everyman who walks through all four.
The narrator is unseen and Wick never speaks, so there's **no lip sync**. That
cuts the hardest, most expensive part of character animation.

**Brand note:** IG carousels keep the 3D Wick. YouTube uses the flat Wick. Same
character, same anatomy rules, two render styles. Kurzgesagt's bird works the
same way across merch and video.

---

## 2. THE NICHE: MONEY, TOLD AS PHILOSOPHY

Chosen by Dre 2026-09-25. Money, investing and credit topics, each with a timeless idea
underneath. It fits the 2026-09-15 positioning, and it's Wick's differentiator:
every other finance channel is either a talking head or a stock footage essay.

The money matters: personal finance and investing run roughly **$18–45 CPM**
(cost per thousand ad views), among the highest on YouTube. Credit and mortgage
adjacent topics sit at the top of that range. That's why credit and investing
topics are spread across the slate.

---

## 3. THE HOW RULE — RECOMMENDED CHANGE

Old rule: free content = WHAT / WHY / WHEN only, HOW is always paid.

**Recommendation: on YouTube, teach the mechanism completely and give ONE free
first step. Sell the system.**

| Layer | Free (YouTube) | Paid (product) |
|---|---|---|
| WHAT it is | ✅ fully | |
| WHY it works | ✅ fully | |
| WHEN it matters | ✅ fully | |
| First step | ✅ exactly one | |
| The full step by step | | ✅ |
| Your numbers (calculator, plan for *your* income) | lead magnet (free, email) | ✅ deeper version |
| Templates, trackers, check-ins | | ✅ |

**Why change it:**
- A 9-minute video that teases and withholds gets punished. YouTube asks viewers
  whether they were satisfied, and "all why, no action" feels like a trailer.
- Search traffic for money is "how" shaped ("how do credit scores work").
  Explaining the mechanism *is* the answer to that search. It's not the system.
- One first step makes the video useful tonight, and the system still has
  everything left to sell.
- It also keeps the channel on the right side of "education, not advice". The
  video explains mechanisms, and specific buy calls stay out of free content.

**The rule stays as-is on IG carousels** until the reach test ends. Revisit after.

This is baked into every script's close. If you reject it, only the last beat
of each script changes.

---

## 4. THE ENGINE — HOW A SCRIPT BECOMES A VIDEO

**Recommendation: build on Remotion (already in `wick-video/`), not raw HTML
canvas.** Remotion is a React tool that renders frame-accurate video. Creators on
X drawing "plain JavaScript on a canvas" get the same drawing power. Remotion
adds what they hand-roll: audio sync, timelines, and rendering both 16:9 and 9:16
from one scene definition. We already have it installed and have shipped
`ExplainerFilm.tsx` with it.

```
script .md ──parse──> film JSON (beats, scenes, VO, music, SFX)
     │
     ├─ ElevenLabs TTS with word timestamps ──> each beat's exact duration
     ├─ Music bed per chapter (Suno library, 6 tracks)
     ├─ SFX cues (ElevenLabs, generated once, cached)
     │
     └─> Remotion
           ├─ FlatWick rig  (SVG: 9 expressions, poses, costumes below the neck)
           ├─ 15 scene components (STAGE, COUNTER, CHART_LINE, MAP, ZOOM ...)
           │     each with a 16:9 AND a 9:16 layout
           ├─ Composition "LongForm"   1920×1080 → 8–10 min MP4
           └─ Composition "Short"      1080×1920 → 3 per video, captions burned in
```

**Where each tool fits:**

| Tool | Job | Needed? |
|---|---|---|
| Claude (this session) | Scripts, engine code, scene code | Yes |
| ElevenLabs | Narrator VO + word timestamps + SFX | Yes. Already wired in `scripts/wick-film-build.js` |
| Suno | 6 music beds, made by hand once | Yes, but manual. Suno has no public API (only a partner program since July 2026) |
| OpenRouter | The ONLY outside image source. Used where code can't draw it well: thumbnail concepts, paper/grain texture plates, the occasional reference portrait traced into a flat QUOTE silhouette | Light use. The flat style is ~95% code. `OPENROUTER_API_KEY` is already read by `scripts/wick-render-reel.js` (the Seedance hero clip), but it's not in `.env.example` and not in this cloud session. Add it to the environment before any render session that needs images |
| Higgsfield | **Not used anywhere in this pipeline** (Dre, 2026-09-25: "all code and or OpenRouter") | No |

**Rough cost per video:** ~1,400 narration words ≈ 8,000–9,000 ElevenLabs
characters, plus ~3 short Shorts cold opens. 15 videos ≈ 130k characters.
Check that against your ElevenLabs plan's monthly credits before the batch.
Everything else is free: code rendering, cached SFX, owned music beds.

---

## 5. THE PLAN — STEPS, OWNERS, TIMELINES

| # | Step | Owner | When | Done means |
|---|---|---|---|---|
| 1 | Plan, style bible, slate, 15 scripts, Shorts map | Claude | **Today, 9/25** | Files in `wick_youtube/`, pushed |
| 2 | Read scripts 01–03. Mark anything that doesn't sound like Wick | Dre | By Sun 9/28 | Notes in chat |
| 3 | Pick the narrator voice. Claude pulls 3 candidates from your ElevenLabs library, reading the same cold open | Claude pulls, Dre picks | Next session | One voice ID locked for the channel |
| 4 | Make 6 music beds in Suno: `wonder`, `tension`, `history`, `warm`, `resolve`, `cosmic`. Instrumental, 2–3 min, loopable | Dre | By Sun 9/28 | 6 MP3s in `wick-video/public/music/` |
| 5 | Confirm the Wick's Wisdom YouTube channel exists, and that the YouTube OAuth in `.env` points at it (not your personal channel) | Dre | By Sun 9/28 | Channel ID shared |
| 6 | Build the engine: script parser, FlatWick rig, 15 scene components (both layouts), VO sync, captions | Claude | Sessions 2–3 (week of 9/29) | `node scripts/wick-yt-build.js 01` renders a draft |
| 7 | **Pilot:** render 01-chessboard long form + its 3 Shorts | Claude | End of week of 9/29 | 3 MP4s. Dre reviews |
| 8 | One style revision pass on the pilot, then lock the look | Dre + Claude | Within 2 days of pilot | Style frozen |
| 9 | Long-form uploader (extend `distributors/youtube-shorts.js`) + route through the existing `review_queue` so nothing posts without your tap | Claude | Same week as pilot | Approve → uploads with chapters and description |
| 10 | Production run: **2 long videos a week** (Tue + Fri), **1 Short a day** | Engine renders, Dre approves | Oct 7 → mid-Nov | 15 long + 45 Shorts live |
| 11 | Retention review after video 5: check the YouTube Studio retention graphs, find where people drop, fix the template | Claude | ~Oct 24 | STYLE_BIBLE updated |
| 12 | Build the lead magnet (goal-to-daily-number calculator) so the "free calculator in the description" line is true | Claude | Before video 1 goes live | Link works |

**Critical path:** step 12 has to exist before video 1 publishes, or every
script's close points at nothing. Step 4 (music) blocks the pilot. Everything
else can run in parallel.

---

## 6. DOES THIS LADDER TO THE PRIORITIES?

| Priority | How this moves it |
|---|---|
| Portfolio pieces | A script-to-film engine is a flagship demo. Show one video and the code that made it |
| Be seen as an AI expert | "Every frame of this 10-minute film was drawn by code an AI wrote" is exactly the kind of proof people share |
| Replace the 9-5 / local business | The engine is sellable. Local businesses pay for explainer videos, and this makes them for near zero marginal cost |
| $100k/month | Finance CPMs plus a digital product funnel. Slow, compounding (fittingly) |

**Honest risk:** the IG reach test (27 → 90 median reach) is still running. That's
fine, because Agent X posts IG on autopilot. Don't let YouTube production pull
your manual attention off lead generation for the local business. That's still
the fastest money on the board.
