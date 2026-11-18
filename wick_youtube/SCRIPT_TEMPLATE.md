# Script file format (strict — the render engine will parse this)

One file per video: `wick_youtube/scripts/NN-slug.md`. Follow this exactly.
Rules for every line live in `STYLE_BIBLE.md`.

````markdown
---
id: 01
slug: chessboard
pillar: STORY | HISTORY | MECHANISM | MINDSET
title: "The Chessboard That Bankrupted a King"
alt_titles:
  - "..."
  - "..."
thumbnail: "One sentence: the single image + max 4 words of text on it."
runtime_target: "9:00"
narration_words: 1420      # count of VO words only, filled in after writing
---

# The Chessboard That Bankrupted a King

**Logline:** One sentence. What the viewer will understand by the end.

**The loop:** The question opened in the cold open and closed in the payoff.

**The turn:** The timeless idea underneath the money, in one sentence.

---

## COLD OPEN

**B01** · `COSMIC` · music: cosmic
VO: Narration. Numbers as words. No dashes.
VISUAL: What is drawn and how it moves. Name Wick's expression if he appears.
ON-SCREEN: Short text, digits allowed, max 7 words (optional)
SFX: whoosh (optional)

**B02** · `STAGE` · music: cosmic
VO: ...
VISUAL: ...

## CH1 · Chapter Name

**B03** · `COUNTER` · music: wonder
VO: ...
VISUAL: ...
ON-SCREEN: ...

(... continue. Aim for 28 to 40 beats. A beat is 10 to 25 seconds of VO.)

## THE TURN

**Bxx** · ...

## PAYOFF

**Bxx** · ...

## FIRST STEP + CLOSE

**Bxx** · `TEXT` · music: resolve
VO: The one free first step. Then the quiet last line.
VISUAL: ...

---

## SHORTS

### S1 · "Working title for the Short"
- **Beats:** B04 → B09   (~45s)
- **Cold open VO (new line, Short only):** One hooky sentence.
- **Payoff line:** The existing VO line it ends on (quote it).
- **9:16 notes:** What moves to the top/middle/bottom third.

### S2 · ...
### S3 · ...

---

## YOUTUBE PACKAGE

**Description (first 2 lines show above the fold):**
> Line 1: the hook restated.
> Line 2: what they'll understand.

**Chapters:**
```
0:00 Cold open
0:35 Chapter name
...
```
(timestamps are estimates at 155 wpm; refreshed after VO is recorded)

**Pinned comment:** A question that invites a real answer.

**Disclaimer line:** "Education, not financial advice. Every number is sourced below."

---

## SOURCES
1. Claim it supports — [Publisher, title](https://url)
2. ...
````
