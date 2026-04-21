import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../supabase/client.js";
import { postToLinkedIn } from "../agent/post-to-linkedin.js";
import { generateImage } from "../agent/generate-image.js";

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

async function logNewsPost(postId, postUrl, postText, articleUrl) {
  const hook = postText.split(/[.!?\n]/)[0].trim().slice(0, 200);
  await supabase.from("posts").insert({
    content: postText,
    platform: "linkedin",
    post_type: "image",
    post_id: postId,
    post_url: postUrl,
    hook,
    format: "news_reaction",
  });
}

// ─── MAIN: CHECK AND POST ─────────────────────────────────────────────────────

export async function checkAndPost() {
  console.log(`[NewsAgent] Checking for breaking news...`);

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

  // Generate reactive post
  let postText;
  try {
    postText = await generateReactivePost(target);
    console.log(`[NewsAgent] Post generated (${postText.length} chars)`);
  } catch (err) {
    console.error(`[NewsAgent] Post generation failed: ${err.message}`);
    return;
  }

  // Generate image
  let imageBuffer = null;
  try {
    imageBuffer = await generateImage(postText);
  } catch {
    // text-only is fine
  }

  // Post to LinkedIn
  try {
    const { postId, postUrl } = await postToLinkedIn(postText, imageBuffer, null);
    console.log(`[NewsAgent] Posted! ID: ${postId} | URL: ${postUrl}`);
    await markArticleSeen(target, true);
    await logNewsPost(postId, postUrl, postText, target.url);
  } catch (err) {
    console.error(`[NewsAgent] LinkedIn post failed: ${err.message}`);
  }
}
