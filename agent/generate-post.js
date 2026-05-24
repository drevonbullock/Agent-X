import Anthropic from "@anthropic-ai/sdk";
import { getBestFor } from "../analytics/learn.js";

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
- NEVER use em dashes (—), en dashes (–), or hyphens used as pauses ( - ) between thoughts. Rewrite every sentence that would use a dash as natural flowing prose instead`;

const FORMATS = {
  contrarian: {
    weight: 4,
    instruction: `FORMAT — Contrarian Take:
Open with "Everyone says [X]." or "The common belief is [X]." or "Most people think [X]."
Then write "Here's what's actually true:" and deliver the real insight in 3-4 sentences.
The topic must challenge a common belief that business owners hold about AI, automation, hiring, or growth.
No client stories. No partner mentions. Speak directly to the business owner reading this.
End with a single punchy sentence that lands like a conclusion.`,
  },

  one_liner: {
    weight: 3,
    instruction: `FORMAT — One-Liner Drop:
Single sentence. No explanation. No hashtags. Just a sharp observation about AI automation, building systems, or what it means to run a business in this era.
Make it land. Make it feel like something you actually think — not something a LinkedIn account would say.
Examples of the energy (do not copy these):
"Vibe coding is just manifestation with a compiler."
"The automation isn't the product. The time it gives back is."`,
  },

  build_update: {
    weight: 2,
    instruction: `FORMAT — System Breakdown:
Describe a specific AI automation system a business could run — what it does, what problem it solves, what it replaces.
Frame it as a real operational upgrade, not a product pitch.
4-6 sentences. Business owner language only — no code, no tech jargon.
End with the single business outcome it creates.`,
  },

  insight: {
    weight: 1,
    instruction: `FORMAT — Sharp Insight:
One observation about how AI automation is changing what it means to run a small business or agency.
3-5 sentences. No fluff.
End with a provocative question or statement that makes a founder stop and think about their own business.`,
  },
};

const TOPICS = [
  "The specific tasks inside a business that AI automation eliminates first — and why those tasks are costing more than owners realize",
  "Why most small businesses are still doing manually what could run on autopilot right now",
  "The operational difference between a business that uses AI tools and one that has AI systems",
  "What happens to your capacity when you remove the 2-hour daily tasks that don't require a human",
  "The three places in any service business where leads fall through the cracks — and how automation seals them",
  "Why response time is the silent killer of small business revenue and what fixes it",
  "What a fully automated lead-to-booking pipeline looks like and what it actually costs to build",
  "The difference between saving time and creating leverage — why most automation advice gets this wrong",
  "What business owners discover after their first 30 days running an AI system they didn't have to babysit",
  "Why the businesses winning right now aren't bigger — they just have fewer bottlenecks",
  "The follow-up sequence most service businesses never send — and how much revenue that silence costs",
  "What it actually means to run a business that operates while you sleep",
  "The real reason small businesses lose to larger competitors — and why AI closes that gap faster than hiring",
  "How automating one intake process changes the entire client experience from the first touchpoint",
  "What founders stop doing manually once they see what an AI system can handle — and what that unlocks",
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

export async function generateLinkedInPost() {
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

  console.log(`[Agent X] Format: ${format} | Topic: ${topic}`);

  const prompt = `${VOICE}

Today's topic angle: ${topic}

${FORMATS[format].instruction}

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
