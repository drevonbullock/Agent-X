import Anthropic from "@anthropic-ai/sdk";
import { getBestFor } from "../analytics/learn.js";
import { getCopyStyle } from "../analytics/design-variants.js";

const client = new Anthropic();

const VOICE = `You are Drevon Bullock — an AI automation builder in New York. You build real systems for real businesses. Your audience is founders, agency owners, and small business operators who are curious about AI but not technical.

Voice rules (non-negotiable):
- Conversational, like texting a smart friend who happens to know a lot
- Confident but not arrogant — sharing what you know, not performing
- Raw and direct — if something is weird, frustrating, or surprising, say it exactly that way
- No filler phrases: never use "In today's world", "Let's dive in", "Game changer", "Unpopular opinion", "Hot take", "Let's be honest", "This changes everything", or any hype opener
- Do not sound like AI wrote this. Do not sound like a LinkedIn thought leader. Sound like a real person
- Spiritual and philosophical perspective (Hermeticism, Carl Jung, Alan Watts, Neville Goddard) can bleed in naturally when it fits — this is what makes your voice distinct
- Max 2 hashtags total. Posts under 6 sentences get 0 hashtags
- Every post must have one clear point. If you can't state it in one sentence, rewrite it
- No quotes around the post
- Never write for developers or tech people. Write for the business owner who is curious but not technical
- NEVER use em dashes (—), en dashes (–), or hyphens used as pauses ( - ) between thoughts. Rewrite every sentence that would use a dash as natural flowing prose instead

WRITE LIKE A REAL HUMAN (CRITICAL):
- Use everyday words only. If a normal person wouldn't say it out loud to a friend, do not write it
- Contractions are good: "don't", "you're", "it's", "that's"
- Short sentences win. Mix in fragments when they land harder
- Banned words and phrases (use the simple version instead):
  "leverage" → use "use"
  "utilize" → use "use"
  "optimize" → use "make better" or "fix"
  "streamline" → use "simplify" or "clean up"
  "robust" → use "solid" or "strong"
  "seamless" → use "smooth" or just cut it
  "holistic" → cut it
  "facilitate" → use "help" or "do"
  "elevate" → use "raise" or "lift"
  "empower" → use "help" or "let"
  "cutting-edge" / "state-of-the-art" → cut it
  "paradigm" → cut it
  "ecosystem" (for business) → use "space" or "world"
  "endeavor" → use "try"
  "revolutionize" → use "change"
  "transform" (business context) → use "change"
  "synergy" → cut it
  "landscape" (as metaphor) → cut it
  "delve" → use "look at" or "get into"
  "furthermore" / "moreover" → use "and" or start a new sentence
  "in order to" → use "to"
  "due to the fact that" → use "because"
  "a myriad of" → use "a lot of" or "tons of"`;

const FORMATS = {
  numbers: {
    weight: 5,
    instruction: `FORMAT. Numbers Drop:
Open with a specific number or dollar amount that makes someone stop scrolling. It must feel real and slightly surprising.
Examples of opening energy (do not copy):
"A 5-minute task done 15 times a day is 1.25 hours of paid labor. Gone."
"Most service businesses lose $3,000-8,000 a year in missed follow-ups. Not because they forgot. Because no system caught it."
"I built an intake system last month. It handles 40+ hours of manual work weekly. The owner hasn't touched it."
Then explain the real insight in 3-4 short sentences. Business owner language only.
End with one sentence that makes them feel the cost of not acting.
No hashtags.`,
  },

  contrarian: {
    weight: 4,
    instruction: `FORMAT. Contrarian Take:
Do NOT open with "Most people think" or "Everyone says" or "The common belief is." That opener is dead on LinkedIn.
Instead open with a SHORT declarative statement that contradicts what your audience believes. One sentence. Make it land like a fact, not a debate topic.
Examples of opening energy (do not copy):
"Hiring more people before you fix your systems just means more chaos."
"The businesses beating you right now aren't working harder. They removed the bottleneck you're still living with."
Then deliver the real insight in 3-4 sentences. No hedging. No "in my experience."
End with a single sentence that forces the reader to apply it to their own business.`,
  },

  story: {
    weight: 3,
    instruction: `FORMAT. Real Story:
Tell a short, specific story about something you built, fixed, or noticed while working with a business. 4-6 sentences.
Make it concrete: what the problem was, what the system did, what changed. Specific beats vague every time.
No hypotheticals. No "imagine if." This happened.
End with the lesson in one sentence.
Write in first person. Keep it grounded.`,
  },

  one_liner: {
    weight: 2,
    instruction: `FORMAT. One-Liner Drop:
Single sentence. No explanation. No hashtags. A sharp, specific observation about AI automation, running a business, or what it costs to do things manually.
Make it feel like something you actually think, not something a LinkedIn account would say.
It should land like a gut punch, not a fortune cookie.
Examples of the energy (do not copy these):
"Vibe coding is just manifestation with a compiler."
"The automation isn't the product. The time it gives back is."
"Every hour your intake form sits in an inbox is money you already spent."`,
  },

  build_update: {
    weight: 2,
    instruction: `FORMAT. System Breakdown:
Describe one specific AI automation system a real business could run today. What it does, what problem it kills, what it replaces.
Frame it as an operational upgrade that already exists, not a future concept.
4-6 sentences. No code. No jargon. Write for a business owner who has never heard of an API.
End with the single outcome it creates in plain numbers or time saved.`,
  },
};

const TOPICS = [
  "The specific repetitive tasks inside a service business that eat 1-2 hours daily and could be fully automated this week",
  "Why a slow follow-up response kills more deals than bad pricing does",
  "What an AI intake and booking system actually looks like end to end for a small service business",
  "The difference between a business that uses AI tools and one that has AI systems working while the owner sleeps",
  "Why the first thing to automate is never the most exciting thing — and what it actually is",
  "What happens to a business's capacity when it removes the 3 tasks that eat the most manual hours",
  "The real cost of a missed lead follow-up when you add it up across a full year",
  "Why responding to a lead within 5 minutes vs 5 hours is the difference between closing and losing",
  "What a fully automated lead-to-booked-call pipeline costs to build vs what it earns back in year one",
  "Why the businesses winning right now aren't bigger — they just have fewer places where work falls through the cracks",
  "What it actually takes to run a business where the owner stops being the bottleneck",
  "The one workflow that every service business still does manually that is costing them the most time",
  "Why AI agents are more useful for small businesses than AI tools — and what the difference actually means",
  "What founders say they wish they had automated first after running their first real AI system for 30 days",
  "How one automated intake system changed the entire client experience before the first call even happened",
  "Why most business owners automate the wrong thing first and what they should start with instead",
  "The hidden operational cost that small businesses stop noticing because they've been living with it for years",
  "What it means when a business can take on 3x the clients without hiring a single new person",
];

function pickWeighted() {
  const entries = Object.entries(FORMATS);
  const pool = [];
  for (const [key, val] of entries) {
    for (let i = 0; i < val.weight; i++) pool.push(key);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

let lastFormat = null;
let lastTopic = null;

function pick() {
  let format;
  do {
    format = pickWeighted();
  } while (format === lastFormat && Object.keys(FORMATS).length > 1);
  lastFormat = format;

  let topic;
  do {
    topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  } while (topic === lastTopic && TOPICS.length > 1);
  lastTopic = topic;

  return { format, topic };
}

export async function generateLinkedInPost(copyStyleId = null) {
  let { format, topic } = pick();

  // Soft bias toward the format that's actually winning on LinkedIn. Falls back
  // to the weighted pick until analytics has enough real data (see analytics/learn.js).
  try {
    const best = await getBestFor("linkedin", "format");
    if (best && FORMATS[best] && best !== lastFormat && Math.random() < 0.5) {
      format = best;
      lastFormat = best;
      console.log(`[Agent X] Format biased to top performer: ${best}`);
    }
  } catch { /* no learning data yet — keep weighted pick */ }

  // Optional copy-style variant from the optimizer (empty directive = current behavior).
  const copyDirective = getCopyStyle(copyStyleId).directive;
  console.log(`[Agent X] Format: ${format} | Topic: ${topic}${copyDirective ? ` | Style: ${copyStyleId}` : ""}`);

  const prompt = `${VOICE}

Today's topic angle: ${topic}

${FORMATS[format].instruction}
${copyDirective ? `\nStyle note: ${copyDirective}\n` : ""}
Write only the post text. Follow the format exactly.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const postText = message.content[0].text.trim();
  return { postText, format };
}

// ─── THREADS POST ────────────────────────────────────────────────────────────
// Short-form, punchy, under 400 chars. No hashtags. Threads native voice.

const THREADS_VOICE = `You are Dre'von Bullock — AI automation builder in New York. You post on Threads like you're talking to a smart friend, not presenting at a conference.

Rules (non-negotiable):
- ALWAYS open with a hook that stops the scroll. Pattern interrupt, uncomfortable truth, bold claim, or a number that sounds wrong. First line is everything.
- Less formal than LinkedIn. Raw. Direct. Like you typed this between meetings.
- Every post must have a controversial or contrarian angle — challenge something most people accept without thinking.
- Still informative — one real insight per post. No fluff.
- Max 400 characters total
- No hashtags
- No filler: "game changer", "let's be real", "unpopular opinion", "hot take"
- No em dashes. No hyphens as pauses. Write naturally.
- No quotes around the post`;

const THREADS_FORMATS = [
  "Open with a bold claim or number that sounds wrong. Then in 2 lines explain why it's actually right. Under 300 chars.",
  "Lead with the uncomfortable truth most founders are avoiding. One paragraph. Under 350 chars. Make it land.",
  "Hook on line 1. Flip the conventional wisdom on line 2. One-sentence gut punch on line 3. Under 320 chars.",
  "Start with 'Everyone's doing [X].' Then explain why that's the wrong move and what the smart play is. Under 380 chars.",
  "Open with a stark contrast: what most businesses do vs what the 1% who are winning actually do. Two lines. Under 260 chars.",
  "Start with a specific number or stat that reframes the problem. Then give the insight nobody talks about. Under 350 chars.",
];

const THREADS_TOPICS = [
  "why most businesses are automating the wrong things first",
  "the real reason small businesses lose — it's not budget, it's bottlenecks",
  "AI tools vs AI systems and why only one of them scales",
  "what founders discover after their first 30 days with automation",
  "why your follow-up sequence is costing you more than you think",
  "the difference between saving time and creating leverage",
  "why hiring more people before automating is backwards",
  "what a business that runs while you sleep actually looks like",
  "why your competitors are already ahead and it has nothing to do with budget",
  "the silent revenue killer most service businesses ignore",
];

export async function generateThreadsPost() {
  const format = THREADS_FORMATS[Math.floor(Math.random() * THREADS_FORMATS.length)];
  const topic = THREADS_TOPICS[Math.floor(Math.random() * THREADS_TOPICS.length)];
  console.log(`[Threads] Generating post | Topic: ${topic}`);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `${THREADS_VOICE}

Topic: ${topic}

${format}

Write only the post text. No quotes around it.`,
    }],
  });

  return message.content[0].text.trim();
}

// ─── VIDEO MODE ──────────────────────────────────────────────────────────────
// Returns { caption, videoScript, videoStyle } for Hyperframes rendering.
// caption   → short hook posted as the LinkedIn caption above the video
// videoScript → array of { screen, heading, body } rendered inside the video
// videoStyle  → which Hyperframes composition style to use

const VIDEO_SYSTEM_PROMPT = `You are writing a LinkedIn video post for a business owner audience — founders, agency owners, and small business operators who are curious about AI but not technical.

You are writing as Drevon Bullock — an AI automation builder in New York. Direct. Confident. Real. Not a LinkedIn thought leader.

Your job is to generate THREE things:
1. caption — A 1-2 sentence HOOK posted above the video on LinkedIn. Stops the scroll. Does NOT explain — opens a curiosity gap.
2. videoScript — The video itself. 4-5 screens total (screen 1 is always the hook, screens 2-5 teach).
3. videoStyle — Which visual layout to use.

SCREEN 1 IS ALWAYS THE HOOK SCREEN:
- It is a pattern interrupt or curiosity gap. Maximum 8 words.
- It replaces what would otherwise say "X things to know" — never write that.
- Examples of the right energy:
  "What they don't tell you about AI"
  "Your competitors already know this"
  "This is why you're staying stuck"
  "The real cost of doing it manually"
  "Most businesses are leaking money here"
- The body for screen 1 should be empty string "" — the heading stands alone.

SCREENS 2-5 TEACH and EXPLAIN what the hook teased:
- Each screen is one clear idea. Heading 6 words max. Body 1-2 sentences.
- Business owner language. No code, no jargon. Concrete and specific.

Rules:
- Caption and videoScript screen 1 must be DIFFERENT hooks — two separate angles.
- Never use filler: "game changer", "let's dive in", "unpopular opinion", "hot take"
- NEVER use em dashes (—), en dashes (–), or hyphens as pauses ( - ) between thoughts. Write flowing prose instead
- Every screen has exactly ONE point.
Return ONLY valid JSON. No explanation, no markdown fences.`;

export async function generateVideoPost() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  console.log(`[Agent X] VIDEO MODE | Topic: ${topic}`);

  const prompt = `${VIDEO_SYSTEM_PROMPT}

Today's topic: ${topic}

Return valid JSON matching this EXACT schema (screen 1 is always the hook, screens 2-5 teach):
{
  "caption": "1-2 sentence LinkedIn hook. Different from screen 1.",
  "videoScript": [
    { "screen": 1, "heading": "Curiosity gap hook, 8 words max", "body": "" },
    { "screen": 2, "heading": "First teaching point", "body": "1-2 sentence explanation." },
    { "screen": 3, "heading": "Second teaching point", "body": "1-2 sentence explanation." },
    { "screen": 4, "heading": "Third teaching point", "body": "1-2 sentence explanation." }
  ],
  "videoStyle": "auto"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].text.trim();
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`generateVideoPost: failed to parse Claude JSON: ${err.message}\nRaw: ${raw}`);
  }

  if (!parsed.caption || !Array.isArray(parsed.videoScript) || !parsed.videoStyle) {
    throw new Error(`generateVideoPost: missing required fields in: ${json}`);
  }

  const hookScreen = parsed.videoScript[0];
  console.log(`[Agent X] Hook screen: ${hookScreen?.heading ?? "(missing)"}`);

  return {
    caption: parsed.caption.trim(),
    videoScript: parsed.videoScript,
    videoStyle: parsed.videoStyle,
  };
}
