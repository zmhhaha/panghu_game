BEGIN;

CREATE SCHEMA IF NOT EXISTS guanliao;
SET search_path TO guanliao, public;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  auth_provider text NOT NULL,
  external_subject text NOT NULL,
  username text NOT NULL,
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_provider, external_subject)
);

CREATE TABLE IF NOT EXISTS player_saves (
  owner_user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_saves_updated_idx
  ON player_saves (updated_at DESC);

COMMIT;
