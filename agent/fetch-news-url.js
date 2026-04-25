import FirecrawlApp from "@mendable/firecrawl-js";

// Searches for a relevant news article URL using Firecrawl.
// Returns the first valid URL found, or null if unavailable.
export async function fetchNewsUrl(postText) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn("[Firecrawl] FIRECRAWL_API_KEY not set — skipping URL fetch");
    return null;
  }

  try {
    const app = new FirecrawlApp({ apiKey });

    // Use the first 200 chars as the search query — enough topic signal
    const query = postText.replace(/[#@]/g, "").slice(0, 200).trim();

    const result = await app.search(query, { limit: 5 });

    // v4 API returns { web: [...] }, older versions used data/results
    const items = result?.web ?? result?.data ?? result?.results ?? [];
    if (!items.length) {
      console.warn("[Firecrawl] No search results returned");
      return null;
    }

    // Skip social platforms, PDF files, and redirectors
    const BLOCKED = ["twitter.com", "x.com", "linkedin.com", "facebook.com", "instagram.com", "tiktok.com"];
    for (const item of items) {
      const u = item.url ?? item.link ?? "";
      if (!u) continue;
      if (u.endsWith(".pdf")) continue;
      const isBlocked = BLOCKED.some((domain) => u.includes(domain));
      if (isBlocked) continue;
      console.log(`[Firecrawl] Found article URL: ${u}`);
      return u;
    }

    // Last resort — return whatever came first
    const fallback = items[0]?.url ?? items[0]?.link ?? null;
    if (fallback) console.log(`[Firecrawl] Fallback URL: ${fallback}`);
    return fallback;
  } catch (err) {
    console.warn(`[Firecrawl] Search failed: ${err.message}`);
    return null;
  }
}
