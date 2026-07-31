BEGIN;

CREATE SCHEMA IF NOT EXISTS tashuo;
SET search_path TO tashuo, public;

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
  case_id text NOT NULL,
  case_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'paused', 'awaiting_report', 'finished')),
  state_version integer NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS game_instances_owner_updated_idx ON game_instances (owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS game_actions (
  id bigserial PRIMARY KEY,
  game_instance_id uuid NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  action_type text NOT NULL,
  action jsonb NOT NULL,
  resulting_state_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_instance_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY,
  game_instance_id uuid NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES users(id),
  agent_type text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  input_state_version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'awaiting_retry')),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_runs_owner_game_idx ON agent_runs (owner_user_id, game_instance_id, started_at DESC);

COMMIT;
