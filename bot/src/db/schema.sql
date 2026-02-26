-- ============================================================
--  Sypev Bot — Supabase Authentication Schema
--  Paste into Supabase SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- 1. users  (core profile)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  password_hash TEXT,                       -- NULL for Telegram-only users
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 2. linked_identifiers  (email / phone / telegram / username)
-- ──────────────────────────────────────────────────────────────
CREATE TYPE identifier_type AS ENUM ('email', 'phone', 'telegram_id', 'username');

CREATE TABLE IF NOT EXISTS linked_identifiers (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         identifier_type NOT NULL,
  value        TEXT NOT NULL,
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  linked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, value)
);

CREATE INDEX idx_linked_identifiers_value ON linked_identifiers(type, value);
CREATE INDEX idx_linked_identifiers_user  ON linked_identifiers(user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. otp_codes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target      TEXT NOT NULL,           -- email or phone
  code        TEXT NOT NULL,
  purpose     TEXT NOT NULL DEFAULT 'verify',  -- verify | login | link
  attempts    INT NOT NULL DEFAULT 0,
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_user ON otp_codes(user_id, expires_at);

-- ──────────────────────────────────────────────────────────────
-- 4. bot_sessions  (grammY session storage)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_sessions (
  key     TEXT PRIMARY KEY,
  value   JSONB NOT NULL DEFAULT '{}'
);

-- ──────────────────────────────────────────────────────────────
-- 5. login_attempts  (brute-force / suspicious-login tracking)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  identifier   TEXT,
  telegram_id  TEXT,
  success      BOOLEAN NOT NULL DEFAULT FALSE,
  ip_hint      TEXT,                        -- from Telegram data if available
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_user    ON login_attempts(user_id, created_at);
CREATE INDEX idx_attempts_tg      ON login_attempts(telegram_id, created_at);

-- ──────────────────────────────────────────────────────────────
-- 6. Row Level Security — service-key bypasses all
-- ──────────────────────────────────────────────────────────────
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_identifiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts      ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bot uses service_role key)
CREATE POLICY "service_all" ON users              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON linked_identifiers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON otp_codes          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON bot_sessions       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON login_attempts     FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- 7. Auto-update updated_at trigger
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
