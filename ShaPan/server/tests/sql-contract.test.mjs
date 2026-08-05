import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storeSource = await readFile(new URL("../src/store.mjs", import.meta.url), "utf8");
const migrationSource = await readFile(new URL("../migrations/004_message_conflict_index.sql", import.meta.url), "utf8");
const activeCampaignMigration = await readFile(new URL("../migrations/005_single_active_campaign.sql", import.meta.url), "utf8");

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
  assert.match(storeSource, /\[gameId, sequence, type, row\.clock_minute, payload\]/);
});

test("only one active instance is allowed per user and campaign", () => {
  assert.match(activeCampaignMigration, /partition by owner_user_id, campaign_id/);
  assert.match(activeCampaignMigration, /order by created_at desc, id desc/);
  assert.match(activeCampaignMigration, /campaign_instances_one_active_idx/);
  assert.match(activeCampaignMigration, /where status in \('running', 'paused'\)/);
  assert.match(storeSource, /pg_advisory_xact_lock/);
  assert.match(storeSource, /reason: "superseded"/);
});
