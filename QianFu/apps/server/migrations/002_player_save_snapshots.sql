BEGIN;
SET search_path TO qianfu, public;

ALTER TABLE game_actions ADD COLUMN IF NOT EXISTS event_seq bigint NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS game_actions_restore_idx ON game_actions (game_instance_id, event_seq);

CREATE TABLE IF NOT EXISTS player_save_snapshots (
  id bigserial PRIMARY KEY,
  game_instance_id uuid NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot IN (1, 2)),
  label text NOT NULL DEFAULT '',
  saved_at timestamptz NOT NULL DEFAULT now(),
  game_time timestamptz NOT NULL,
  state_version integer NOT NULL,
  last_event_seq bigint NOT NULL,
  campaign_version text NOT NULL,
  engine_version text NOT NULL,
  state jsonb NOT NULL,
  UNIQUE (game_instance_id, slot)
);

CREATE INDEX IF NOT EXISTS player_save_snapshots_game_idx
  ON player_save_snapshots (game_instance_id, slot);
COMMIT;
