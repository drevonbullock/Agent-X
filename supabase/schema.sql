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

-- ─── WICK'S WISDOM — REELS + GENERATED TOPICS ────────────────────────────────
-- These two were originally created ad-hoc by migration and were missing from
-- this file, which is why they shipped without RLS (Supabase flagged both as
-- "RLS Disabled in Public" on 2026-08-03). Defined here so a rebuild is correct.

CREATE TABLE IF NOT EXISTS wick_reels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            TEXT NOT NULL,
  slot_index          INT  NOT NULL,
  layout              TEXT NOT NULL,          -- 'STEPS' | 'TIERS'
  topic_id            INT,
  pillar              TEXT,
  suited              BOOLEAN NOT NULL DEFAULT false,
  copy                JSONB NOT NULL,
  caption             TEXT,
  cover_url           TEXT,
  thumb_url           TEXT,
  status              TEXT NOT NULL DEFAULT 'approved',
  telegram_sent_at    TIMESTAMPTZ,
  telegram_send_count INT NOT NULL DEFAULT 0,
  ig_media_id         TEXT,
  post_url            TEXT,
  published_at        TIMESTAMPTZ,
  likes    INT DEFAULT 0,  comments INT DEFAULT 0,
  shares   INT DEFAULT 0,  saves    INT DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- New episodes minted when a lane in the fixed registry runs dry (never recycle).
CREATE TABLE IF NOT EXISTS wick_generated_topics (
  topic_id   INT  NOT NULL,
  lane       TEXT NOT NULL,
  title      TEXT NOT NULL,
  hook       TEXT,
  payoff     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- CREATE TABLE does NOT enable RLS, so every table here would be readable AND
-- writable by anyone holding the anon key (which is public by design and ships
-- in any client). Agent X connects with SUPABASE_SECRET_KEY, and the service
-- role BYPASSES RLS entirely, so enabling it with ZERO policies is exactly what
-- this system wants: the app keeps full access, anon gets nothing.
--
-- Deliberately no policies. Adding one would GRANT access, not restrict it.
-- Only add policies if a browser client ever talks to Supabase directly.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── RLS GUARD FUNCTIONS ─────────────────────────────────────────────────────
-- Backing the boot/daily check in modules/rls-guard.js. Both are SECURITY
-- DEFINER (they read pg_class / run DDL) with execute revoked from anon, so an
-- attacker can neither enumerate unprotected tables nor call them.
CREATE OR REPLACE FUNCTION public.rls_audit()
RETURNS TABLE(unprotected_table TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT c.relname::text FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  ORDER BY 1;
$$;

-- Can ONLY turn RLS on, never off, and never creates a policy, so the worst it
-- can do is remove anon access.
CREATE OR REPLACE FUNCTION public.rls_protect(target TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE ok BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname=target) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'no such public table: %', target; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.rls_audit()          FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_protect(TEXT)    FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_audit()       TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_protect(TEXT) TO service_role;
