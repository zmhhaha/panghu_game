set search_path to shapan, public;

-- A non-partial unique index is a direct arbiter for ON CONFLICT while still
-- allowing multiple rows whose external_id is null under PostgreSQL semantics.
drop index if exists shapan.messages_game_external_id_idx;

create unique index messages_game_external_id_idx
  on shapan.messages (game_id, external_id);
