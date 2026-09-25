# Wick's Wisdom YouTube — Style Bible

Source of truth for every long-form script, every scene, and every Short.
Built 2026-09-25. Pairs with `PLAN.md` (the why and the schedule) and
`SCRIPT_TEMPLATE.md` (the exact file format).

---

## 1. THE CHANNEL IN ONE LINE

**Money, told as philosophy.** Every video takes a money, investing, or credit
topic and explains it the way Kurzgesagt explains black holes: a real mechanism,
told as a story, with a timeless idea underneath. Wick is the everyman who lives
through the lesson on screen. The narrator is the wisdom.

Audience: US, 18 to 44, earning-motivated, smart but never taught this. They are
not dumb. They were just never shown how the machine works.

---

## 2. VOICE AND NARRATION

**Who speaks:** an unseen narrator. Calm, warm, a little wry. Think the Kurzgesagt
narrator crossed with an old teacher by a fire. Wick never speaks. That's
deliberate: no lip sync means no animation cost and no uncanny mouths.

**Point of view:**
- Default is second person ("you") with Wick as the stand in for the viewer.
- Story-pillar videos may use "The Egg" style direct address the whole way.
- Never "we at Wick's Wisdom". Never "smash that like button".

**Hard rules (these are law, same as the Agent X VOICE prompt):**
1. **No em dashes (—), no en dashes (–), no hyphens used as pauses.** Use a
   period or a comma. TTS also reads these badly.
2. **Numbers in VO are written as words** ("two hundred and forty dollars",
   "seven percent"). ON-SCREEN text uses digits ("$240", "7%").
3. **Every number is real and sourced.** If you cannot cite it, cut it. Every
   script ends with a Sources list. Round honestly ("about seven percent").
4. **Sentences short enough to say in one breath.** Average under 16 words.
   One idea per sentence.
5. **No filler openers:** "In today's video", "Let's dive in", "Game changer",
   "Unpopular opinion", "Hot take", "Let's be honest", "Buckle up".
6. **No jargon without an inline definition** the first time it appears
   ("an index fund, which is one basket holding hundreds of companies at once").
7. **Plain words.** A sharp fifteen year old understands every line.
8. **Not financial advice tone.** Explain mechanisms and history. Never "buy X
   now". Naming a category (index funds, high yield savings) is fine. A single
   free first step is fine (see section 5).

**Pace:** 150 to 160 words per minute. 8 to 10 minutes = **1,300 to 1,500
narration words** (count VO lines only).

---

## 3. STRUCTURE (retention engineering)

Every video follows this spine. Timings are targets, not handcuffs.

| Block | Time | Job |
|---|---|---|
| **Cold open** | 0:00–0:30 | A concrete, strange, specific image or claim. State the stakes for the viewer personally. Open one loop (a question the video promises to answer). No channel intro. |
| **Setup** | 0:30–1:30 | Introduce Wick in the situation. Make the problem felt, not described. |
| **Chapter 1–4** | ~1:30 each | Each chapter = one step of the mechanism. Each ends on a mini payoff AND a new question (re-hook). |
| **The turn** | around 6:00 | The reframe. The timeless idea underneath the money (the "philosophy"). This is the moment people screenshot. |
| **Payoff** | ~7:30 | Close the loop from the cold open. Deliver exactly what the hook promised. |
| **One first step + close** | last 45s | The single free action (section 5). Then a quiet, memorable last line. Then the end card. |

Retention rules:
- **Pattern interrupt every 20 to 40 seconds:** new scene type, a camera move,
  a number counter, a map, a joke in the background. Never the same visual for
  more than ~40 seconds.
- **Re-hook at ~2:00 and at the midpoint.** A line like "But that's not the
  strange part." is allowed once per video, not more.
- **Chapters are named** (they become YouTube chapter markers). 2 to 4 words.
- **Humor lives in the visuals**, Kurzgesagt style: a tiny sign, a background
  gag, Wick's reaction. The VO stays calm.

---

## 4. THE THREE REFERENCE FLAVORS, AND WHEN EACH IS USED

Each of the 15 videos is tagged with one pillar. The pillar sets the visual mood.

| Pillar | Reference | Feel | Palette |
|---|---|---|---|
| **STORY** | Kurzgesagt "The Egg" | A parable. Slow, cosmic, second person, emotional turn at the end. | NIGHT |
| **HISTORY** | Dalio "Changing World Order" | Timelines, maps, empires, cycles that repeat. Big to small. | PARCHMENT |
| **MECHANISM** | Kurzgesagt science explainers | How the machine works, piece by piece. Diagrams that build. | PAPER |
| **MINDSET** | After Skool | Idea driven, a philosopher or principle at the center, metaphor heavy. | PAPER + marker accents |

---

## 5. THE HOW POLICY (recommended 2026-09-25, see PLAN.md §3)

**Free videos teach the mechanism completely and give ONE free first step.
The full system is what gets sold.**

- WHAT it is, WHY it works, WHEN it matters: fully explained. No teasing.
- ONE first step: a single concrete action a viewer could do tonight
  ("check which of your cards reports the highest balance"). Always one. Never a
  list.
- The system (the step by step plan, the calculator, the templates, the exact
  numbers for your situation) is the paid layer. The close points to it as
  "the free calculator in the description" (lead magnet) until the product
  exists.

Why: a video that only teases leaves people unsatisfied, and YouTube's
satisfaction signals punish that. A video that gives away the whole system
leaves nothing to sell. Mechanism plus one step is useful AND leaves the
system for the paid layer.

---

## 6. VISUAL LANGUAGE — FLAT 2D, DRAWN IN CODE

Everything is drawn by code (SVG / Canvas inside Remotion). No per shot AI
images. That is what makes 150 minutes of footage affordable and keeps Wick on
model forever.

**Tool rule (Dre, 2026-09-25): all code and/or OpenRouter. No Higgsfield
anywhere in the YouTube pipeline.** OpenRouter is the only outside image source,
and only for what code can't draw well (thumbnail concepts, texture plates,
references traced into flat silhouettes). Narration and SFX stay on ElevenLabs.

### 6a. Flat Wick (2D redraw of the locked 3D character)

| Part | Flat spec |
|---|---|
| Head | Golden teardrop flame, flat fill `#F5B82E`, inner lighter teardrop `#FFD978`, 6px dark outline `#141C2B`, tip leans slightly right |
| Face | Two tall black oval eyes with one white catchlight dot each. Thin brows. Small mouth line. No nose, ears, hair |
| Body | Short ivory rounded rectangle `#F4EBD9`, 2 to 3 soft drips at the rim |
| Limbs | Thin black rubber hose arms and legs, round mitten hands, round shoes |
| Glow | Soft radial amber glow behind the head, always. He is the light source |
| Rules | Wax level NEVER changes. Nothing ever goes on the flame. Costumes below the neck only (toga, suit, hard hat in hand). Expression changes every scene |

Expressions available (mirror the 3D sheet): happy, calm, curious, focused,
determined, proud, sombre, weary, alarmed. **Every beat that shows Wick names
one.**

### 6b. Palettes

```
PAPER      bg #F7F3EA  deep #EDE7DA  ink #141C2B  soft #5A6472  amber #F0A31C
PARCHMENT  bg #EFE2C4  deep #DCC89E  ink #2B2118  red #A8322D   amber #C98A1B
NIGHT      bg #0E1726  deep #070D18  ink #F2EDE3  star #FFE9B0  amber #F5B82E
Signals    loss #D6335C  gain #1FA463
```

### 6c. Scene vocabulary (use these names in the VISUAL tag)

These are the reusable scene types the engine will be built around. Scripts must
use them so the engine can render them. Pick the one that fits; describe the
specifics in the VISUAL line.

| Scene | What it is |
|---|---|
| `STAGE` | Wick in a simple flat environment doing something (apartment, office, street, cave, market) |
| `COUNTER` | A big number rolling up or down, with a label |
| `CHART_LINE` | Line chart drawing itself left to right |
| `CHART_BAR` | Bars growing / splitting |
| `SPLIT` | Screen split in two, compare left vs right (then vs now, poor vs rich choice) |
| `TIMELINE` | Horizontal timeline scrolling through years / centuries |
| `MAP` | Flat stylized map, regions light up, arrows move |
| `STACK` | Objects stacking / piling (coins, bricks, blocks) |
| `FLOW` | Diagram of arrows moving money between boxes (you → bank → loan) |
| `CROWD` | Many small flat figures (people as tiny candles) acting together |
| `ZOOM` | Kurzgesagt scale zoom: from one thing out to the planet or in to a detail |
| `TEXT` | Full screen typographic line, marker style write on (After Skool). Max 7 words |
| `QUOTE` | A historical figure's line, flat portrait silhouette + write on quote |
| `COSMIC` | NIGHT palette, stars, Wick small in a vast space (STORY pillar) |
| `MACHINE` | A flat mechanical contraption with gears that illustrates a system |

### 6d. 9:16 rule (Shorts are clipped from the long video)

Every scene is built with two layouts: 16:9 (wide) and 9:16 (stacked, subject in
the middle third, text in the top third, captions in the lower third). Scripts
mark Short candidates; the engine re renders those beats in 9:16. No cropping a
16:9 frame. That is why Shorts look native instead of crushed.

---

## 7. SOUND

- **VO:** ElevenLabs, one locked narrator voice for the whole channel.
- **Music:** a library of 6 instrumental beds made manually in Suno (Suno has no
  public API): `wonder`, `tension`, `history`, `warm`, `resolve`, `cosmic`.
  Scripts tag the bed per chapter.
- **SFX:** ElevenLabs sound effects, generated once and reused (pop, whoosh,
  coin, paper, thud, chime, tick, crowd murmur).

---

## 8. SHORTS

Every long video yields **3 Shorts, 30 to 55 seconds each**.

A Short is a self contained slice of the long video:
- Starts on its own **cold open line** (a new VO line recorded only for the
  Short, 1 sentence, a hook with a number or a strange claim).
- Covers a run of consecutive beats from the long video.
- Ends on a **payoff line**, then a 2 second end card: "Full story on the
  channel."
- Works on mute: every beat in it has ON-SCREEN text or burned captions.
