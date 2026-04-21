import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { postToLinkedIn } from "../agent/post-to-linkedin.js";
import { generateImage } from "../agent/generate-image.js";
import { postTextToThreads } from "../distributors/threads.js";

const client = new Anthropic();

const KEYWORDS = [
  "AI automation small business",
  "artificial intelligence fintech",
  "agentic AI workflow",
  "business automation 2025",
  "AI agents enterprise",
  "ChatGPT business use",
  "automation replace jobs",
  "AI customer service",
];

const THREADS_REACTIVE_SYSTEM = `You are writing a reactive Threads post as Dre'von Bullock — AI automation builder in New York.

A breaking news story just dropped. Write a short, punchy reaction. Threads native voice — like texting a smart friend.

Rules:
- Max 400 characters total
- No hashtags
- Lead with what this actually means for business owners
- No filler phrases, no hype, no em dashes
- One clear take. Could be a 2-liner or a short paragraph.`;

const REACTIVE_SYSTEM = `You are writing a reactive LinkedIn post as Dre'von Bullock — AI automation builder in New York.
A breaking news story was just published. Your job is to write a sharp, direct take on it.

Voice rules:
- Conversational. Confident. No hype.
- Lead with what the story actually means for business owners — not what it says.
- Include 1-2 specific details from the story.
- Max 2 hashtags.
- No filler phrases: "game changer", "let's dive in", "unpopular opinion"
- NEVER use em dashes (—), en dashes (–), or hyphens as pauses ( - ). Write flowing prose instead
- 150-350 words. One clear point.

Format:
Hook (1 punchy line) → What happened (2-3 sentences, specific) → What it means for the business owner (3-4 sentences) → One sharp closing line.`;

// ─── NEWS FETCH ───────────────────────────────────────────────────────────────

async function fetchLatestNews() {
  const key = process.env.NEWS_API_KEY;
  if (!key) throw new Error("NEWS_API_KEY not set in .env");

  const query = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI error (${res.status})`);

  const data = await res.json();
  return (data.articles ?? []).filter((a) => a.title && a.description && a.url);
}

// ─── DEDUP CHECK ──────────────────────────────────────────────────────────────

async function isArticleSeen(url) {
  const { data } = await supabase.from("news_seen").select("id").eq("article_url", url).maybeSingle();
  return !!data;
}

async function markArticleSeen(article, posted = false) {
  await supabase.from("news_seen").upsert(
    { article_url: article.url, headline: article.title, posted },
    { onConflict: "article_url" }
  );
}

// ─── POST GENERATION ──────────────────────────────────────────────────────────

async function generateThreadsReactivePost(article) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: THREADS_REACTIVE_SYSTEM,
    messages: [{ role: "user", content: `Headline: ${article.title}\nSummary: ${article.description}` }],
  });
  return msg.content[0].text.trim().slice(0, 400);
}

async function generateReactivePost(article) {
  const prompt = `Breaking news article:

Headline: ${article.title}
Source: ${article.source?.name ?? "Unknown"}
Published: ${article.publishedAt}
Summary: ${article.description}
${article.content ? `\nContent excerpt: ${article.content.slice(0, 600)}` : ""}

Write a reactive LinkedIn post about this story.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: REACTIVE_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  return msg.content[0].text.trim();
}

// ─── SUPABASE LOG ─────────────────────────────────────────────────────────────

async function logNewsPost(postId, postUrl, postText, articleUrl, platform = "linkedin") {
  const hook = postText.split(/[.!?\n]/)[0].trim().slice(0, 200);
  await supabase.from("posts").insert({
    content: postText,
    platform,
    post_type: platform === "threads" ? "text" : "image",
    post_id: postId,
    post_url: postUrl,
    hook,
    format: "news_reaction",
  });
}

// ─── DAILY CAP + COOLDOWN CHECK ──────────────────────────────────────────────

const DAILY_CAP = 3;
const COOLDOWN_HOURS = 4;

async function canPost(platform = "linkedin") {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("posts")
    .select("created_at")
    .eq("format", "news_reaction")
    .eq("platform", platform)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[NewsAgent] Cap check failed (${platform}): ${error.message} — allowing post`);
    return true;
  }

  if ((data?.length ?? 0) >= DAILY_CAP) {
    console.log(`[NewsAgent] ${platform} daily cap reached (${data.length}/${DAILY_CAP}) — skipping`);
    return false;
  }

  if (data?.length > 0) {
    const lastPostAt = new Date(data[0].created_at);
    const hoursSince = (Date.now() - lastPostAt.getTime()) / 3_600_000;
    if (hoursSince < COOLDOWN_HOURS) {
      console.log(`[NewsAgent] ${platform} cooldown active — ${hoursSince.toFixed(1)}h since last (need ${COOLDOWN_HOURS}h) — skipping`);
      return false;
    }
  }

  return true;
}

// ─── MAIN: CHECK AND POST ─────────────────────────────────────────────────────

export async function checkAndPost() {
  console.log(`[NewsAgent] Checking for breaking news...`);

  const [linkedinOk, threadsOk] = await Promise.all([
    canPost("linkedin"),
    canPost("threads"),
  ]);

  if (!linkedinOk && !threadsOk) return;

  let articles;
  try {
    articles = await fetchLatestNews();
  } catch (err) {
    console.error(`[NewsAgent] News fetch failed: ${err.message}`);
    return;
  }

  // Find first unseen article
  let target = null;
  for (const article of articles) {
    const seen = await isArticleSeen(article.url);
    if (!seen) { target = article; break; }
  }

  if (!target) {
    console.log(`[NewsAgent] No new articles found — skipping`);
    return;
  }

  console.log(`[NewsAgent] New story: "${target.title}"`);
  await markArticleSeen(target, false);

  // ── LinkedIn ────────────────────────────────────────────────────────────────
  if (linkedinOk) {
    try {
      const postText = await generateReactivePost(target);
      console.log(`[NewsAgent] LinkedIn post generated (${postText.length} chars)`);

      let imageBuffer = null;
      try { imageBuffer = await generateImage(postText); } catch { /* text-only ok */ }

      const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
      console.log(`[NewsAgent] LinkedIn posted! ID: ${postId} | ${postUrl}`);
      await markArticleSeen(target, true);
      await logNewsPost(postId, postUrl, postText, target.url, "linkedin");
    } catch (err) {
      console.error(`[NewsAgent] LinkedIn post failed: ${err.message}`);
    }
  }

  // ── Threads ─────────────────────────────────────────────────────────────────
  if (threadsOk && process.env.THREADS_ACCESS_TOKEN) {
    try {
      const postText = await generateThreadsReactivePost(target);
      console.log(`[NewsAgent] Threads post generated (${postText.length} chars)`);

      const { postId, postUrl } = await postTextToThreads(postText);
      console.log(`[NewsAgent] Threads posted! ID: ${postId} | ${postUrl}`);
      await logNewsPost(postId, postUrl, postText, target.url, "threads");
    } catch (err) {
      console.error(`[NewsAgent] Threads post failed: ${err.message}`);
    }
  }
}
