PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(email) BETWEEN 3 AND 254),
  CHECK (length(password_hash) BETWEEN 1 AND 256)
);

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(display_name) BETWEEN 1 AND 80),
  CHECK (length(currency_code) = 3 AND currency_code = upper(currency_code)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  revoked_at TEXT,
  device_label TEXT,
  CHECK (length(token_hash) = 64),
  CHECK (expires_at > created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  CHECK (length(token_hash) = 64),
  CHECK (expires_at > created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expiry ON password_reset_tokens(expires_at);

CREATE TABLE auth_rate_limits (
  bucket_hash TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL,
  window_started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  CHECK (attempts > 0),
  CHECK (expires_at > window_started_at)
);

CREATE INDEX idx_auth_rate_limits_expiry ON auth_rate_limits(expires_at);