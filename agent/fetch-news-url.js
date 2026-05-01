import FirecrawlApp from "@mendable/firecrawl-js";

// Preferred news domains — prioritized in order.
// Only these sources get screenshot treatment.
const PREFERRED_DOMAINS = [
  "cnbc.com",
  "bloomberg.com",
  "businessinsider.com",
  "foxbusiness.com",
  "foxnews.com",
  "wsj.com",
  "reuters.com",
  "apnews.com",
  "techcrunch.com",
  "axios.com",
  "thehill.com",
  "ft.com",
  "economist.com",
  "forbes.com",
  "fortune.com",
];

const BLOCKED = [
  "twitter.com", "x.com", "linkedin.com", "facebook.com",
  "instagram.com", "tiktok.com", "reddit.com", "youtube.com",
];

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function isPreferred(url) {
  const d = domainOf(url);
  return PREFERRED_DOMAINS.some((p) => d === p || d.endsWith(`.${p}`));
}

function isBlocked(url) {
  const d = domainOf(url);
  return BLOCKED.some((b) => d === b || d.endsWith(`.${b}`));
}

export async function fetchNewsUrl(postText) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn("[Firecrawl] FIRECRAWL_API_KEY not set — skipping URL fetch");
    return null;
  }

  const app   = new FirecrawlApp({ apiKey });
  const query = postText.replace(/[#@]/g, "").slice(0, 200).trim();

  // ── Pass 1: search preferred domains directly ─────────────────────────────
  // Build a targeted query scoped to trusted news sites
  const siteQuery = `(${PREFERRED_DOMAINS.slice(0, 6).map((d) => `site:${d}`).join(" OR ")}) ${query}`;
  try {
    const result = await app.search(siteQuery, { limit: 6 });
    const items  = result?.web ?? result?.data ?? result?.results ?? [];
    for (const item of items) {
      const u = item.url ?? item.link ?? "";
      if (!u || u.endsWith(".pdf")) continue;
      if (isPreferred(u)) {
        console.log(`[Firecrawl] Preferred domain hit: ${u}`);
        return u;
      }
    }
  } catch { /* fall through to pass 2 */ }

  // ── Pass 2: general search, filter to preferred domains first ─────────────
  try {
    const result = await app.search(query, { limit: 8 });
    const items  = result?.web ?? result?.data ?? result?.results ?? [];

    if (!items.length) {
      console.warn("[Firecrawl] No search results returned");
      return null;
    }

    // First pass over results: return first preferred domain
    for (const item of items) {
      const u = item.url ?? item.link ?? "";
      if (!u || u.endsWith(".pdf") || isBlocked(u)) continue;
      if (isPreferred(u)) {
        console.log(`[Firecrawl] Preferred domain: ${u}`);
        return u;
      }
    }

    // Second pass: any non-blocked, non-social URL
    for (const item of items) {
      const u = item.url ?? item.link ?? "";
      if (!u || u.endsWith(".pdf") || isBlocked(u)) continue;
      console.log(`[Firecrawl] Fallback URL: ${u}`);
      return u;
    }
  } catch (err) {
    console.warn(`[Firecrawl] Search failed: ${err.message}`);
  }

  return null;
}
