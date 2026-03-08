-- Migration: 0002_preferences.sql
-- Adds user_preferences table for personalized onboarding & theme system

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id    TEXT    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme      TEXT    NOT NULL DEFAULT 'system',   -- 'light' | 'dark' | 'system'
  accent     TEXT    NOT NULL DEFAULT 'sky',      -- 'sky' | 'violet' | 'rose' | 'amber' | 'emerald'
  vibe       TEXT    NOT NULL DEFAULT 'minimal',  -- 'minimal' | 'playful' | 'bold'
  onboarding_done INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
