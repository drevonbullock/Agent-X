# The Dalio look — what we copy, what we don't

Studied from Ray Dalio's "Principles for Dealing with the Changing World Order"
(the first four minutes, screen-recorded at `~/Downloads/Changing world order /`).
We copy the style grammar, never shots, assets, footage or branding.

## What makes it work

1. **Colour means chapter.** Navy = the story / the narrator. Dark green = how money
   works (mechanisms, flows, stacks). Mustard = history, a date, an era.
2. **Ink style.** Thick black outlines, flat fills, shadows drawn as diagonal hatch
   lines (never gradients). Grainy paper with diagonal scratches, heaviest at the edges.
3. **Hatch-in reveal.** Things arrive as scribbled blue hatching, then fill solid.
4. **One object becomes the next scene.** The road becomes a chart line becomes a beam
   of light becomes a timeline tunnel. Almost no hard cuts.
5. **Charts draw themselves.** Arcs stroke on, dashed arrows branch into futures,
   stacks of cash grow block by block into pyramids.
6. **Tiny emotional FX.** Sweat drops, smoke puffs, "?", thought bubbles, sparkles.
7. **Two typefaces.** Heavy serif for titles and labels that matter ("Income",
   "Spending"); small clean sans for tags ("U.S.", dates).
8. **Camera never parks.** Slow push-ins, pans across walls of cards, speed-line whips.
9. **Label with a ring + leader line.** A white circle around the thing, a line out to
   a serif number or word.

## Our version (engine: `engine/lib2d/ink.js`)

| Dalio | Wick's Wisdom |
|---|---|
| Hiker narrator | Wick, translated into ink style (same design, flat + hatch, flame glow) |
| Navy / green / mustard paper | `PAL.navy` / `PAL.green` / `PAL.mustard` + `paper()` |
| Hatched shadows | `hatch()` |
| Title serif / label sans | Source Serif 4 900 / Fira Sans 500 |
| Archival footage, photos, newspapers | NOT used. Code-drawn "archive cards" instead |
| Orchestral score | Code synth or a free YouTube Audio Library bed, 22 dB under VO |

## Wick in ink (approved direction 2026-09-25)

Dre approved translating Wick into the ink style rather than imitating his 3D render.
Same shape, face, wax level and proportions (measured off `00_character_sheet.png`);
thick outline, flat gold + cream, hatch shadow on the flame's left and the wax's right,
warm glow so the flame stays the light source. Costumes (crown etc.) may sit on the
flame for YouTube stories but must never hide the flame tip.

Motion study (10 s, silent): `node render.mjs --film dalio-motion`
Check motion by eye: `node render.mjs --film dalio-motion --scale 0.5 --sheet 0.5,1,2,3.1,5,6.2,7,9 --cols 4`

The "made by a person" pass (`makeStage`): all art goes through an SVG displacement
filter (slow wobble + rough ink edges, three seeds cycling at 8/s for line boil),
text stays crisp on top, then a print-grain overlay covers everything.

## Animation grammar (borrowed from JohnHeibel/PDoomVideo, reimplemented)

- **Moods never snap** (`mood(t, keys)`): eyes shut for a beat, the body squashes and
  springs back, an emote ("!", "?", sweat, spark) pops in and fades.
- **Always alive**: auto-blink every ~3.3 s, flame sways and breathes, idle squash.
- **Overshoot** on everything that appears (`backOut`); keyframes via `kf()`.
- **Camera never parks**: pushes, pulls, dives; zoom interpolated in log space.
- **Motivated transitions**: dive into an object and it becomes the next scene;
  Dalio's hatch-in (`stage.hatchIn`) between chapters.
- **Contact sheets** (`--sheet`) to check motion before rendering video.
- Not adopted: p5.brush watercolour (about 2.5 s/frame, so hours per episode). Our pipeline
  runs about 0.05 s/frame on the Mac GPU.
