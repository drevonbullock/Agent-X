// Adaptive creative variant library.
//
// IMAGE_THEMES drive the look of rendered cards (accent color, background, font
// pairing). The renderer (images/render-cheatsheet.js) takes one of these and
// reproduces the brand default when none is passed. COPY_STYLES are directive
// snippets injected into the written-post prompt to vary structure/voice.
//
// The optimizer (analytics/optimizer.js) rotates challengers from these pools,
// measures real engagement per variant, and promotes the winner.

// The first entry is the brand default and MUST reproduce the original look.
export const IMAGE_THEMES = [
  {
    id: "signal_dark",
    accent: "#FF6B00",
    accentLight: "#FF9A50",
    bg: "#060c18",
    fontHeading: "Space Grotesk",
    fontMono: "JetBrains Mono",
    fontLink: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap",
  },
  {
    id: "cyan_tech",
    accent: "#00D2FF",
    accentLight: "#6EE7FF",
    bg: "#05101c",
    fontHeading: "Sora",
    fontMono: "JetBrains Mono",
    fontLink: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap",
  },
  {
    id: "emerald_clean",
    accent: "#22c55e",
    accentLight: "#6ee7a8",
    bg: "#07140f",
    fontHeading: "Inter",
    fontMono: "IBM Plex Mono",
    fontLink: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap",
  },
  {
    id: "magenta_bold",
    accent: "#FF3D81",
    accentLight: "#FF85B0",
    bg: "#14060f",
    fontHeading: "Manrope",
    fontMono: "JetBrains Mono",
    fontLink: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap",
  },
  {
    id: "amber_warm",
    accent: "#F5A623",
    accentLight: "#FFCE73",
    bg: "#150f04",
    fontHeading: "Space Grotesk",
    fontMono: "JetBrains Mono",
    fontLink: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap",
  },
];

export const DEFAULT_THEME_ID = IMAGE_THEMES[0].id;

// Competitor-derived themes (Phase 3). Loaded from the `design_themes` table at
// runtime via setDynamicThemes(); empty until the competitor miner has run, so
// the pool is just the static brand themes by default.
let DYNAMIC_THEMES = [];

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

// A dynamic theme must be fully valid or the renderer could break — invalid
// entries are dropped here so getTheme/variantPool only ever expose safe themes.
export function isValidTheme(t) {
  return !!t
    && typeof t.id === "string" && t.id.length > 0
    && HEX6.test(t.accent ?? "") && HEX6.test(t.accentLight ?? "") && HEX6.test(t.bg ?? "")
    && typeof t.fontHeading === "string"
    && typeof t.fontMono === "string"
    && typeof t.fontLink === "string" && t.fontLink.startsWith("https://fonts.googleapis.com/");
}

export function setDynamicThemes(themes) {
  DYNAMIC_THEMES = (themes ?? []).filter(isValidTheme);
}

export function allImageThemes() {
  return [...IMAGE_THEMES, ...DYNAMIC_THEMES];
}

export function getTheme(id) {
  return allImageThemes().find((t) => t.id === id) ?? IMAGE_THEMES[0];
}

// Written-post copy styles. id "default" injects no directive — identical to
// current behavior. The rest are appended to the generation prompt.
export const COPY_STYLES = [
  { id: "default", directive: "" },
  { id: "punchy_short", directive: "Keep it under 4 short sentences. Every line lands hard. No wind-up." },
  { id: "story_led", directive: "Open with a one-line micro-scenario a business owner would recognize, then make the point." },
  { id: "data_led", directive: "Open with a specific number or stat that reframes the topic, then explain why it matters." },
  { id: "question_hook", directive: "Open with a sharp question the reader can't answer comfortably, then resolve it." },
];

export const DEFAULT_COPY_ID = COPY_STYLES[0].id;

export function getCopyStyle(id) {
  return COPY_STYLES.find((c) => c.id === id) ?? COPY_STYLES[0];
}

// The id pool the optimizer can pick from for a given post_type.
export function variantPool(postType) {
  return postType === "text"
    ? COPY_STYLES.map((c) => c.id)
    : allImageThemes().map((t) => t.id);
}

export function defaultVariant(postType) {
  return postType === "text" ? DEFAULT_COPY_ID : DEFAULT_THEME_ID;
}
