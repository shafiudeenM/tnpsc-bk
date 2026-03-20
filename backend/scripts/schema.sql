-- ============================================================
-- TNPSC Guru v2 — Supabase Schema
-- Run this ONCE in your Supabase project → SQL Editor
-- ============================================================

-- 1. Syllabus topics (populated by ingestSyllabus.js)
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id          BIGSERIAL PRIMARY KEY,
  topic       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  exam_group  TEXT NOT NULL DEFAULT 'all',
  class_ref   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (topic, exam_group)
);

-- 2. User progress — which topics each user has asked about
CREATE TABLE IF NOT EXISTS user_progress (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  exam_group  TEXT NOT NULL DEFAULT 'all',
  last_seen   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, topic, exam_group)
);

-- 3. MCQ attempt history
CREATE TABLE IF NOT EXISTS mcq_attempts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic        TEXT NOT NULL,
  exam_group   TEXT NOT NULL DEFAULT 'all',
  questions    JSONB,
  score        INTEGER NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user   ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_group  ON user_progress(exam_group);
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_user    ON mcq_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_group       ON syllabus_topics(exam_group);

-- Row Level Security (RLS)
ALTER TABLE user_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own progress
CREATE POLICY "Users see own progress"
  ON user_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users see own MCQ attempts"
  ON mcq_attempts FOR ALL
  USING (auth.uid() = user_id);

-- Syllabus topics are public read
CREATE POLICY "Syllabus topics public read"
  ON syllabus_topics FOR SELECT
  USING (true);
