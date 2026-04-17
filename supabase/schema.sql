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
