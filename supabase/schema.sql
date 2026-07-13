-- Agent X v2 — Supabase Schema
-- Run once in Supabase SQL editor

CREATE TABLE IF NOT EXISTS posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content          TEXT,
  platform         TEXT,
  post_type        TEXT,           -- 'text' | 'image' | 'video'
  hook             TEXT,           -- first sentence extracted as the hook
  format           TEXT,           -- contrarian | one_liner | build_update | insight | video
  thumbnail_url    TEXT,
  post_id          TEXT,           -- platform-native post ID (e.g. LinkedIn x-restli-id)
  post_url         TEXT,
  views            INTEGER DEFAULT 0,
  likes            INTEGER DEFAULT 0,
  shares           INTEGER DEFAULT 0,
  comments         INTEGER DEFAULT 0,
  engagement_rate  FLOAT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  is_winner        BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS variations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_post_id   UUID REFERENCES posts(id) ON DELETE CASCADE,
  variation_number INTEGER,
  content          TEXT,
  platform         TEXT,
  hook             TEXT,
  format           TEXT,
  post_id          TEXT,
  post_url         TEXT,
  performance_score FLOAT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_briefs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start       DATE,
  top_hooks        TEXT[],
  top_formats      TEXT[],
  top_topics       TEXT[],
  avoid_patterns   TEXT[],
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_seen (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_url      TEXT UNIQUE,
  headline         TEXT,
  posted           BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Crash-safe job queue for variation posting (replaces setTimeout)
CREATE TABLE IF NOT EXISTS variations_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_post_id   UUID REFERENCES posts(id) ON DELETE CASCADE,
  variation_number INTEGER,
  content          TEXT,
  platform         TEXT,
  hook             TEXT,
  format           TEXT,
  scheduled_for    TIMESTAMPTZ NOT NULL,
  sent             BOOLEAN DEFAULT false,
  post_id          TEXT,
  post_url         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Comment reply tracking — never reply to the same comment twice
CREATE TABLE IF NOT EXISTS comment_replies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT NOT NULL,
  comment_id       TEXT NOT NULL UNIQUE,
  post_id          TEXT,
  commenter_name   TEXT,
  comment_text     TEXT,
  reply_text       TEXT,
  replied_at       TIMESTAMPTZ DEFAULT now()
);

-- Keyword lead tracking — comments containing CTA keywords
CREATE TABLE IF NOT EXISTS keyword_leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT NOT NULL,
  comment_id       TEXT NOT NULL UNIQUE,
  post_id          TEXT,
  commenter_name   TEXT,
  commenter_id     TEXT,
  keyword          TEXT,
  comment_text     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── ANALYTICS ────────────────────────────────────────────────────────────────
-- The analytics/ module fetches real engagement back from each platform into
-- posts (views/likes/comments/shares/engagement_rate), learns per-platform, and
-- runs variant-pair A/B experiments.

-- Track when metrics were last pulled, and link posts to A/B experiments.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS metrics_synced_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS experiment_id     UUID;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS variant           TEXT;   -- 'a' | 'b'

-- Per-platform performance aggregates (recomputed from real metrics).
-- One row per (platform, dimension, value). dimension: 'format' | 'post_type'.
CREATE TABLE IF NOT EXISTS platform_performance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         TEXT NOT NULL,
  dimension        TEXT NOT NULL,
  value            TEXT NOT NULL,
  avg_score        FLOAT DEFAULT 0,
  sample_size      INTEGER DEFAULT 0,
  computed_at      TIMESTAMPTZ DEFAULT now()
);

-- A/B experiments: two variants posted to the same platform/slot, winner
-- decided by engagement score after a fixed window.
CREATE TABLE IF NOT EXISTS experiments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform           TEXT NOT NULL,
  slot               TEXT,
  hypothesis         TEXT,
  variant_a_post_id  UUID REFERENCES posts(id) ON DELETE SET NULL,
  variant_b_post_id  UUID REFERENCES posts(id) ON DELETE SET NULL,
  variant_a_label    TEXT,
  variant_b_label    TEXT,
  status             TEXT DEFAULT 'running',   -- running | decided
  winner             TEXT,                     -- 'a' | 'b' | 'tie'
  winning_score      FLOAT,
  decided_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ─── ADAPTIVE CREATIVE OPTIMIZER ──────────────────────────────────────────────
-- Which design theme / copy style a post used, so the optimizer can attribute
-- engagement to a specific creative variant.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS design_variant TEXT;

-- One row per (platform, post_type). Tracks the current best-performing variant
-- (champion), whether we're exploiting it or exploring challengers, and how many
-- recent posts in a row have fallen below the rolling baseline. The optimizer
-- only flips to 'explore' once underperform_streak crosses the threshold, so a
-- single slow day never triggers a creative change.
CREATE TABLE IF NOT EXISTS optimization_state (
  platform           TEXT NOT NULL,
  post_type          TEXT NOT NULL,
  champion_variant   TEXT,
  mode               TEXT DEFAULT 'exploit',   -- exploit | explore
  underperform_streak INTEGER DEFAULT 0,
  baseline_score     FLOAT DEFAULT 0,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (platform, post_type)
);

-- ─── VIDEO APPROVAL GATE ──────────────────────────────────────────────────────
-- Every rendered video lands here as 'pending' instead of auto-publishing. The
-- compressed MP4 is uploaded to Supabase storage first, so the item survives a
-- container restart. processReviewQueue() publishes 'approved' rows to each of
-- their `targets` (linkedin/instagram/threads/tiktok/youtube), then marks 'posted'.
CREATE TABLE IF NOT EXISTS review_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  targets     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- platforms to publish to on approval
  caption     TEXT,
  format      TEXT DEFAULT 'video',
  video_url   TEXT NOT NULL,                        -- public Supabase storage URL
  meta        JSONB DEFAULT '{}'::jsonb,
  status      TEXT DEFAULT 'pending',               -- pending | approved | rejected | posted
  created_at  TIMESTAMPTZ DEFAULT now(),
  decided_at  TIMESTAMPTZ,
  posted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);

-- ─── COMPETITOR MINING ────────────────────────────────────────────────────────
-- Claude-vision analysis of competitors' top-performing Instagram graphics
-- (pulled via Business Discovery). One row per analyzed post; `analysis` holds
-- the extracted design system (accent, background, font, layout, hook style).
CREATE TABLE IF NOT EXISTS competitor_insights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT NOT NULL,
  permalink   TEXT UNIQUE,           -- dedup: never re-analyze the same post
  likes       INTEGER DEFAULT 0,
  comments    INTEGER DEFAULT 0,
  analysis    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Design themes synthesized from competitor analysis. Loaded into the variant
-- pool at runtime (setDynamicThemes) so the optimizer can A/B them as challengers
-- and promote any that beat the brand champion. `theme` matches the IMAGE_THEMES shape.
CREATE TABLE IF NOT EXISTS design_themes (
  id          TEXT PRIMARY KEY,      -- e.g. comp_<username>
  theme       JSONB NOT NULL,
  source      TEXT DEFAULT 'competitor',
  active      BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Meta token persistence — refreshed tokens survive deploys (modules/token-manager.js)
CREATE TABLE IF NOT EXISTS platform_tokens (
  platform     TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ
);
