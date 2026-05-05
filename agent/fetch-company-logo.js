import fs from "fs";

export const COMPANY_DOMAINS = {
  anthropic:   "anthropic.com",
  openai:      "openai.com",
  google:      "google.com",
  meta:        "meta.com",
  microsoft:   "microsoft.com",
  apple:       "apple.com",
  amazon:      "amazon.com",
  heygen:      "heygen.com",
  nvidia:      "nvidia.com",
  tesla:       "tesla.com",
  x:           "x.com",
  twitter:     "x.com",
  linkedin:    "linkedin.com",
  aws:         "aws.amazon.com",
  deepmind:    "deepmind.google",
  mistral:     "mistral.ai",
  perplexity:  "perplexity.ai",
  runway:      "runwayml.com",
  midjourney:  "midjourney.com",
  stability:   "stability.ai",
};

export async function fetchCompanyLogo(companyName) {
  const key = Object.keys(COMPANY_DOMAINS).find((k) =>
    companyName.toLowerCase().includes(k)
  );
  const domain = key ? COMPANY_DOMAINS[key] : null;
  if (!domain) return null;

  fs.mkdirSync("assets/logos", { recursive: true });
  const logoPath = `assets/logos/${key}.png`;
  if (fs.existsSync(logoPath)) return logoPath;

  try {
    const res = await fetch(`https://logo.clearbit.com/${domain}?size=200`);
    if (!res.ok) throw new Error(`Clearbit returned ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(logoPath, buffer);
    console.log(`[Agent X] Logo fetched: ${logoPath}`);
    return logoPath;
  } catch (err) {
    console.warn(`[Agent X] Logo fetch failed for ${companyName}: ${err.message}`);
    return null;
  }
}
