import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storeSource = await readFile(new URL("../src/store.mjs", import.meta.url), "utf8");
const migrationSource = await readFile(new URL("../migrations/004_message_conflict_index.sql", import.meta.url), "utf8");

test("message upserts match the PostgreSQL unique-index conflict target", () => {
  const conflictTargets = storeSource.match(/on conflict \(game_id, external_id\) where external_id is not null do nothing/g) || [];
  assert.equal(conflictTargets.length, 2);
  assert.match(migrationSource, /create unique index messages_game_external_id_idx\s+on shapan\.messages \(game_id, external_id\)/);
  assert.doesNotMatch(migrationSource, /where external_id is not null/);
});

test("PostgreSQL time controls use explicit parameter types", () => {
  assert.match(storeSource, /status = \$2::text/);
  assert.match(storeSource, /time_scale = \$3::smallint/);
  assert.match(storeSource, /last_sequence = \$4::bigint/);
});
