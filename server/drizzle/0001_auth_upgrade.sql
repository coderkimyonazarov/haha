-- ────────────────────────────────────────────────
-- Migration: 0001_auth_upgrade
-- Adds multi-provider auth, usernames, OTP, etc.
-- ────────────────────────────────────────────────

-- 1. Rebuild users table (SQLite can't ALTER COLUMN, so recreate)
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  username TEXT,
  name TEXT NOT NULL,
  password_hash TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO users_new (id, email, username, name, password_hash, is_admin, is_verified, is_banned, created_at, updated_at)
  SELECT id, email, NULL, name, password_hash, is_admin, 0, 0, created_at, created_at FROM users;

DROP TABLE IF EXISTS users;
ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username) WHERE username IS NOT NULL;

-- 2. Auth providers (replaces telegram_id column)
CREATE TABLE IF NOT EXISTS auth_providers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  linked_at INTEGER NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS auth_providers_user_id_idx ON auth_providers(user_id);

-- 3. OTP codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 4. Email verifications
CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 5. Password resets
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 6. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

-- 7. Migrate existing telegram_id references to auth_providers
-- (only if old users table had telegram_id — safe to skip if empty)
