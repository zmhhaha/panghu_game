BEGIN;

CREATE SCHEMA IF NOT EXISTS qianfu;
SET search_path TO qianfu, public;

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

CREATE TABLE IF NOT EXISTS game_instances (
  id uuid PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id),
  campaign_id text NOT NULL,
  campaign_version text NOT NULL,
  engine_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'paused', 'finished', 'abandoned')),
  state_version integer NOT NULL DEFAULT 0,
  last_event_seq bigint NOT NULL DEFAULT 0,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS game_instances_owner_updated_idx
  ON game_instances (owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS game_actions (
  id bigserial PRIMARY KEY,
  game_instance_id uuid NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  action_type text NOT NULL,
  action jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_instance_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY,
  game_instance_id uuid NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  event_seq bigint NOT NULL,
  idempotency_key text NOT NULL,
  type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_instance_id, event_seq)
);

CREATE INDEX IF NOT EXISTS game_events_replay_idx
  ON game_events (game_instance_id, event_seq);

CREATE TABLE IF NOT EXISTS game_snapshots (
  id bigserial PRIMARY KEY,
  game_instance_id uuid NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  state_version integer NOT NULL,
  last_applied_event_seq bigint NOT NULL,
  campaign_version text NOT NULL,
  engine_version text NOT NULL,
  state jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_instance_id, state_version)
);

CREATE INDEX IF NOT EXISTS game_snapshots_restore_idx
  ON game_snapshots (game_instance_id, state_version DESC);

COMMIT;
