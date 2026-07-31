// ─── WICK'S WISDOM — REUSABLE SCENE LIBRARY ─────────────────────────────────
// Art already paid for. Dre: "see what's reusable first before you generate
// anything." Every entry was reviewed by eye; the description is what the frame
// ACTUALLY shows, not what it was originally commissioned for.
//
// The point of this file is to invert the pipeline. Normally copy is written
// first and art is generated to match it. Here the art already exists, so the
// copy is written TO the frame. A slide still satisfies the staging rule,
// because the label is chosen to describe the picture rather than the picture
// being asked to chase the label.
//
// `mood` warm = his own flame is the light, he is holding the controls.
//       cold = screen-lit, the system is holding them.
// `anatomy` ok = wax cylinder body. human = the old wardrobe bug, do not ship.

export const SCENES = [
  // ── LANDSCAPE 3:2 — stacked VERSUS panels ────────────────────────────────
  { file: "/tmp/wick-ex/v0t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "seated on a stool at a kitchen counter, one hand on an open laptop showing a calendar grid, coffee mug beside it, calm and unhurried",
    fits: ["setting a reminder", "scheduling a cancellation", "planning ahead", "booking the date"] },
  { file: "/tmp/wick-ex/v1t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "leaning over a desk reading a long document on a laptop screen, notepad and mug beside him, absorbed and unhurried",
    fits: ["reading the terms", "checking before agreeing", "reviewing the statement", "doing the homework"] },
  { file: "/tmp/wick-ex/v2t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "standing in a lift holding a phone at his side, unbothered, doors closed behind him",
    fits: ["checking on the move", "a decision already made", "walking away from it"] },
  { file: "/tmp/wick-ex/v3t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "seated in an office chair at a desk facing a large monitor showing a simple chart, calm and attentive",
    fits: ["tracking the number", "reviewing the month", "watching the trend"] },

  { file: "/tmp/wick-ex/v0b.png", shape: "3:2", mood: "cold", anatomy: "ok",
    shows: "sitting on a sofa with both arms thrown up in frustration, a phone glowing face-up on the cushion beside him",
    fits: ["finding the charge", "the surprise bill", "realising too late"] },
  { file: "/tmp/wick-ex/v1b.png", shape: "3:2", mood: "cold", anatomy: "ok",
    shows: "standing alone in a dark kitchen holding a phone, uneasy, the room lit only by the screen",
    fits: ["late night checking", "avoiding the balance", "the 2am scroll"] },
  { file: "/tmp/wick-ex/v2b.png", shape: "3:2", mood: "cold", anatomy: "ok",
    shows: "seated at a cafe table in the rain reaching toward a laptop, distressed, cup untouched",
    fits: ["the moment it lands", "scrambling to fix it", "the email nobody wants"] },
  { file: "/tmp/wick-ex/v3b.png", shape: "3:2", mood: "cold", anatomy: "ok",
    shows: "lying in bed at night holding a phone close to his face, faintly pleased, room otherwise dark",
    fits: ["shopping in bed", "the midnight cart", "one more scroll"] },

  // ── LANDSCAPE 3:2 — second stacked set ───────────────────────────────────
  { file: "/tmp/wick-ex/o0t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "perched on a kitchen counter frowning at a phone, a router and a mug beside him, irritated but in control",
    fits: ["cancelling it", "querying the bill", "the annoyed audit"] },
  { file: "/tmp/wick-ex/o1t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "mid-stride across a living room holding a phone, stern and purposeful, empty armchair behind",
    fits: ["walking out", "leaving the deal", "acting on it immediately"] },
  { file: "/tmp/wick-ex/o2t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "seated at a desk under a lamp typing into a laptop showing a neat list, mug beside him, content",
    fits: ["writing it all down", "listing every charge", "building the ledger"] },
  { file: "/tmp/wick-ex/o3t.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "beside an open car door with both arms raised in celebration, a lit gym visible behind him",
    fits: ["the win", "the streak held", "finally free of it"] },

  { file: "/tmp/wick-ex/o0b.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "kneeling at a low table with a laptop open and printed charts spread on the floor, absorbed and satisfied",
    fits: ["doing the maths", "the annual number", "spreading it all out"] },
  { file: "/tmp/wick-ex/o1b.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "standing at a table with arms folded looking down at a phone and a mug, resolved and still",
    fits: ["the decision", "sitting with it", "refusing to act on the feeling"] },
  { file: "/tmp/wick-ex/o2b.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "slumped in an armchair beside a large glowing checklist board full of ticked rows, weary",
    fits: ["the full list", "how many there were", "counting them up"] },
  { file: "/tmp/wick-ex/o3b.png", shape: "3:2", mood: "warm", anatomy: "ok",
    shows: "standing in a warm living room holding a phone, quietly content, blanket over the chair behind",
    fits: ["calm evening", "nothing owed", "the quiet after"] },

  // ── PORTRAIT 3:4 — LESSON items, ORDER slides, parable beats ─────────────
  { file: "/tmp/wick-ex/l1.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "standing by a kitchen counter holding a phone with a long receipt hanging off the counter, a takeaway box on a side table and a gym bag by the front door, worried",
    fits: ["the month you didn't plan for", "irregular costs", "the skipped gym and the delivery"] },
  { file: "/tmp/wick-ex/l2.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "standing at an open fridge holding up a phone, a recycling bin overflowing with takeaway boxes beside him, worried",
    fits: ["ordering in again", "the empty fridge", "convenience spending"] },
  { file: "/tmp/wick-ex/l3.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "sitting in a parked car at night holding a phone, coffee cup in the console, city lights through the windscreen, worried",
    fits: ["buying in the car park", "the drive-through decision", "spending before going in"] },
  { file: "/tmp/wick-ex/l4.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "standing at a desk at night facing a laptop showing a list of coloured rows, empty chair pushed back, uneasy",
    fits: ["the subscription list", "reviewing what renews", "the charges you forgot"] },
  { file: "/tmp/wick-ex/l5.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "standing in a convenience store aisle holding a phone with a shopping basket at his feet, snack shelves lit behind him, worried",
    fits: ["the small top-up shop", "the impulse aisle", "one more thing"] },
  { file: "/tmp/wick-ex/lcover.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "sitting on a kitchen counter beside a closed laptop and a coffee mug with a stack of delivery boxes behind him, deadpan and unimpressed",
    fits: ["cover frame", "the pile that arrived", "deadpan reckoning"] },
  { file: "/tmp/wick-ex/lrecap.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "small figure on a city pavement at dusk beneath several glowing arrow signs all pointing the same way, one clear street ahead",
    fits: ["recap frame", "every road pointing one way", "the choice at the end"] },
  { file: "/tmp/wick-ex/vcta.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "seated at a round table with an open ruled notebook, a phone and a mug, calm and quietly satisfied",
    fits: ["closing frame", "writing it down", "the audit finished"] },
  { file: "/tmp/wick-ex/octa.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "seated at a desk facing a monitor showing a rising bar chart, papers beside him, calm",
    fits: ["closing frame", "the number going the right way"] },
  { file: "/tmp/wick-ex/ccta.png", shape: "3:4", mood: "warm", anatomy: "ok",
    shows: "seated at a round table with printed charts, a glass of water and an open laptop, calm and clear eyed",
    fits: ["closing frame", "the whole picture laid out"] },

  // ── COSTUME roles — ON TOPIC but carry the human-body bug ────────────────
  { file: "/tmp/wick-ex/c0.png", shape: "3:4", mood: "warm", anatomy: "human",
    shows: "seated at a desk in a dark control room, server racks and a world map glowing behind, gesturing at papers",
    fits: ["the one who sets the rails"] },
  { file: "/tmp/wick-ex/c1.png", shape: "3:4", mood: "warm", anatomy: "human",
    shows: "leaning back in a corner-office chair with arms open, city skyline behind, laptop and signed papers on the glass desk",
    fits: ["the one who issues the card"] },
  { file: "/tmp/wick-ex/c2.png", shape: "3:4", mood: "warm", anatomy: "human",
    shows: "small figure in a server aisle touching a lit wall panel, lanyard round the neck",
    fits: ["the one who moves the data"] },
  { file: "/tmp/wick-ex/c3.png", shape: "3:4", mood: "warm", anatomy: "human",
    shows: "kneeling at a card terminal feeding a receipt roll into it, cables behind",
    fits: ["the one who handles the merchant"] },
  { file: "/tmp/wick-ex/c4.png", shape: "3:4", mood: "warm", anatomy: "human",
    shows: "behind a shop counter in an apron reaching to a card reader, shelves of stock behind",
    fits: ["the one who absorbs the fee"] },
  { file: "/tmp/wick-ex/c5.png", shape: "3:4", mood: "warm", anatomy: "human",
    shows: "standing at a self-checkout tapping a card on the reader, tote bag on the bagging shelf",
    fits: ["the one who never sees the fee"] },
];

export const usable = () => SCENES.filter((s) => s.anatomy === "ok");
export const byShape = (shape) => usable().filter((s) => s.shape === shape);
export const byMood = (shape, mood) => byShape(shape).filter((s) => s.mood === mood);

if (process.argv[1]?.endsWith("wick-assets.js")) {
  const ok = usable();
  console.log(`${SCENES.length} scenes catalogued, ${ok.length} shippable\n`);
  for (const shape of ["3:2", "3:4"]) {
    const warm = byMood(shape, "warm").length, cold = byMood(shape, "cold").length;
    console.log(`  ${shape}: ${warm} warm, ${cold} cold`);
  }
  console.log(`\n  ${SCENES.length - ok.length} withheld (human-body bug)`);
  process.exit(0);
}
