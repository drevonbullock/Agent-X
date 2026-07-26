import Anthropic from "@anthropic-ai/sdk";
import { getBestFor } from "../analytics/learn.js";
import { getCopyStyle } from "../analytics/design-variants.js";
import { readBrief } from "../modules/feedback-loop.js";

const client = new Anthropic();

import { pickControversyTopic, CONTROVERSY_VOICE } from "./controversy-topics.js";

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
- ALWAYS end with a short question directed at the reader. LinkedIn comments are weighted 15x higher than likes by the algorithm. The question must be specific to the post topic, not generic ("what do you think?" is banned). Make it the kind of question a real person would actually answer.
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
Close with one sentence that makes them feel the cost of not acting.
Final line: a short specific question the reader can actually answer. Not "what do you think?" — something like "What's the task in your business that eats the most hours right now?"`,
  },

  contrarian: {
    weight: 4,
    useControversyEngine: true, // topic comes from agent/controversy-topics.js
    instruction: `FORMAT. Contrarian Take (controversy engine):
Do NOT open with "Most people think" or "Everyone says" or "The common belief is." That opener is dead on LinkedIn.
Open with the claim you are given, stated as settled fact in one short declarative sentence. Not a debate topic. A fact.
Then argue it in 3-4 sentences via WHAT, WHY, and WHEN only — never the HOW. No hedging. Never "in my experience" or "in my opinion."
Attack the group's identity behind the opposing view, not just the idea.
Final line: leave the dangling counterargument you are given hanging, unanswered, phrased so the reader has to argue back.`,
  },

  story: {
    weight: 3,
    instruction: `FORMAT. Real Story:
Tell a short, specific story about something you built, fixed, or noticed while working with a business. 4-6 sentences.
Make it concrete: what the problem was, what the system did, what changed. Specific beats vague every time.
No hypotheticals. No "imagine if." This happened.
State the lesson in one sentence.
Final line: ask the reader a question tied directly to the story. Something like "Have you mapped out where your biggest time drain actually is?"`,
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
State the single outcome it creates in plain numbers or time saved.
Final line: ask which part of this they'd want to fix first in their own business.`,
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

// ─── CONVERSATION-STARTER VOICE (scheduled TEXT posts) ───────────────────────
// Dre (2026-07-24): text posts on LinkedIn + Threads must be CASUAL, brief
// conversation starters — not statements, not the harsh controversy voice
// (that stays on the paper-cut videos). Same pillar topics as subject matter,
// completely different delivery.
const CONVERSATION_VOICE = `You are Drevon Bullock posting a short, casual text post. Think texting a smart friend, not publishing a manifesto.

RULES:
- Casual and human. Relaxed, a little playful. First person.
- BRIEF. 1 to 3 short sentences. Aim under 280 characters. No walls of text, no lists, no line-break drama.
- It is a CONVERSATION STARTER, not a statement. Share a thought or observation and genuinely invite people in.
- End with a light, real question or an open hook that makes someone want to reply. Curiosity, not a debate challenge.
- Have an opinion but hold it loosely. Never harsh, never contemptuous, no "cope" or "I'll wait" energy. Approachable.
- No hashtags. No emojis. Never use em dashes or en dashes, just write short separate sentences.
- Never mention your personal life, job history, or how many systems you have built. The idea carries it.
- Write ONLY the post text. No quotes around it, no preamble.`;

// Shared generator for all scheduled text posts. Seeds subject matter from the
// controversy lanes (keeps the content pillars) but delivers it casually.
export async function generateConversationStarter({ maxChars = 500 } = {}) {
  const t = pickControversyTopic();
  const brief = readBrief();
  const avoid = brief && (brief.avoid_patterns ?? []).length
    ? `\nAVOID these tired patterns: ${brief.avoid_patterns.join(", ")}\n` : "";
  console.log(`[Agent X] Conversation starter | Lane: ${t.lane}`);
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 220,
    messages: [{
      role: "user",
      content: `${CONVERSATION_VOICE}
${avoid}
Underlying idea to spin into a casual conversation starter (soften it, do NOT state it as harsh fact): "${t.claim}"
An angle people naturally have feelings about: "${t.bait}"

Write one casual, brief conversation starter under ${maxChars} characters. Make people want to reply.`,
    }],
  });
  return message.content[0].text.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .slice(0, maxChars);
}



export async function generateLinkedInPost(_copyStyleId = null) {
  // All scheduled LinkedIn text posts are casual conversation starters now
  // (Dre, 2026-07-24). News cards are handled separately by news-agent; the
  // harsh statement voice lives only on the videos.
  const postText = await generateConversationStarter({ maxChars: 600 });
  return { postText, format: "conversation" };
}

// ─── THREADS POST ────────────────────────────────────────────────────────────
// Short-form, punchy, under 400 chars. No hashtags. Threads native voice.

const THREADS_VOICE = `You are Drevon Bullock — AI automation builder in New York. You post on Threads like you're texting a smart friend between meetings. Not a conference talk. Not a LinkedIn post.

Rules (non-negotiable):
- First line is everything. If it doesn't stop the scroll, the rest doesn't exist. Open with a specific number, a blunt statement, or something that sounds slightly wrong.
- Raw and direct. Short sentences. Fragments when they hit harder.
- One real insight. No fluff. No setup that takes 2 lines to get to the point.
- ALWAYS end with a question. One short question that invites a reply. This is the most important rule.
- Max 380 characters total
- No hashtags
- No em dashes, no hyphens as pauses
- No filler: "game changer", "let's be real", "unpopular opinion", "hot take", "at the end of the day"
- No quotes around the post
- Sound like a real person who actually builds this stuff, not someone performing expertise`;

const THREADS_FORMATS = [
  "Line 1: a specific number or dollar amount that makes someone pause. Line 2-3: what it means for their business. Final line: short question asking if they're doing this. Under 320 chars.",
  "Line 1: a blunt statement about what most business owners get wrong. Line 2: one sentence explaining the real cost. Line 3: the smarter move in plain language. Final line: a question that makes them answer honestly. Under 360 chars.",
  "Line 1: the result most owners want. Line 2: the thing they're doing instead that blocks it. Line 3: the fix in one sentence. Final line: question asking which stage they're at. Under 340 chars.",
  "Line 1: a short bold claim about AI or automation that sounds counterintuitive. Line 2-3: why it's actually true with a specific example. Final line: question asking what they think or what they've seen. Under 350 chars.",
  "Line 1: a real cost or time number that most owners don't track. Line 2: where that number comes from in a typical service business. Line 3: what changes when you fix it. Final line: ask if they've measured this. Under 360 chars.",
];

const THREADS_TOPICS = [
  "the specific task inside most service businesses that eats the most hours and is the easiest to automate",
  "why a lead that doesn't hear back in 5 minutes has a 90% chance of going cold",
  "the difference between an AI tool and an AI system, and why only one of them runs while you sleep",
  "what actually changes in a business after the first 30 days of real automation",
  "why hiring before fixing your intake process just means more chaos faster",
  "how much money the average service business loses per year from missed follow-ups",
  "why your competitors who are winning aren't working harder, they just removed one bottleneck",
  "the one workflow every service business still does manually that costs the most per week",
  "what it actually costs to respond to a lead in 5 hours instead of 5 minutes",
  "why most business owners automate the wrong thing first and what they should start with instead",
  "what a fully booked service business looks like when the intake and follow-up run on autopilot",
  "the real reason small businesses lose clients they already had — and it has nothing to do with price",
  "why AI agents are more useful than AI tools for small businesses",
  "what business owners say they wish they automated first after 60 days of running a real system",
];

export async function generateThreadsPost() {
  // Casual conversation starter, Threads-length (Dre, 2026-07-24).
  return generateConversationStarter({ maxChars: 480 });
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
  // Videos run on the controversy engine: blunt binary claims, 2:1
  // receipt:ragebait ratio, dangling counterargument left as comment bait.
  const t = pickControversyTopic();
  console.log(`[Agent X] VIDEO MODE | Lane: ${t.lane} | [${t.tag}] ${t.claim}`);

  const prompt = `${VIDEO_SYSTEM_PROMPT}
${CONTROVERSY_VOICE}

Today's claim (state it as settled fact, this is the spine of the video): "${t.claim}"
Lane: ${t.lane}
Tag: ${t.tag}
Comment bait to leave dangling in the caption, UNANSWERED: "${t.bait}"

Return valid JSON matching this EXACT schema (screen 1 is always the hook, screens 2-5 argue the claim via WHAT/WHY/WHEN — never HOW):
{
  "caption": "2-3 sentences. Restate the claim as fact, then end with the dangling counterargument phrased so people have to argue back. No question marks softening it into a poll.",
  "videoScript": [
    { "screen": 1, "heading": "The claim as a punch, 8 words max", "body": "" },
    { "screen": 2, "heading": "First argument", "body": "ONE punchy sentence, 18 words max. WHAT or WHY, never HOW." },
    { "screen": 3, "heading": "Second argument", "body": "ONE punchy sentence, 18 words max." },
    { "screen": 4, "heading": "The receipt or the gut punch", "body": "ONE sentence close that picks the fight, 18 words max." }
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
