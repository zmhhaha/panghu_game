import type { GameState, PublicationRecord } from "@tashuo/core";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { InMemoryGameRepository } from "../src/memory-repository.js";
import { PostgresGameRepository } from "../src/postgres-repository.js";
import type { PublicationKey } from "../src/repository.js";
import { IdempotencyConflictError } from "../src/repository.js";

const key: PublicationKey = { caseId: "lost-control-demo", caseVersion: "1.0.0", contentId: "tv_breaking", promptVersion: "publisher-v1" };
const article = (overrides: Partial<PublicationRecord> = {}): PublicationRecord => ({
  id: "published-1", contentId: key.contentId, caseVersion: key.caseVersion,
  title: "公开演示发生意外", body: "主持人口播正文。\n\n记者现场报道正文。", materialIds: ["public-video-1"],
  generatedAt: "2026-10-22T00:00:00.000Z", provider: "test-fixture", model: "test-model", promptVersion: key.promptVersion,
  ...overrides,
});

describe("shared baseline publications", () => {
  it("generates a publication once across concurrent requests and reuses its original text", async () => {
    const repository = new InMemoryGameRepository();
    let complete!: (value: PublicationRecord) => void;
    const generate = vi.fn(() => new Promise<PublicationRecord>((resolve) => { complete = resolve; }));
    const pending = Array.from({ length: 8 }, () => repository.getOrCreatePublication(key, generate));
    await Promise.resolve();
    expect(generate).toHaveBeenCalledTimes(1);
    complete(article());
    const results = await Promise.all(pending);
    expect(results).toEqual(Array.from({ length: 8 }, () => article()));
    results[0].body = "读取副本被修改";
    results[0].materialIds.push("forged-material");
    const forbiddenRegeneration = vi.fn(async () => { throw new Error("must not regenerate"); });
    expect(await repository.getOrCreatePublication(key, forbiddenRegeneration)).toEqual(article());
    expect(forbiddenRegeneration).not.toHaveBeenCalled();
  });

  it("does not cache generation failures and can retry the same task", async () => {
    const repository = new InMemoryGameRepository();
    const generate = vi.fn<() => Promise<PublicationRecord>>()
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce(article());
    const failed = await Promise.allSettled([
      repository.getOrCreatePublication(key, generate),
      repository.getOrCreatePublication(key, generate),
    ]);
    expect(failed.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await repository.getOrCreatePublication(key, generate)).toEqual(article());
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("separates case, case version, material, and prompt version", async () => {
    const repository = new InMemoryGameRepository();
    const keys = [key, { ...key, caseId: "blue-river" }, { ...key, caseVersion: "2.0.0" }, { ...key, contentId: "newspaper-1" }, { ...key, promptVersion: "publisher-v2" }];
    for (const [index, current] of keys.entries()) {
      const publication = article({ id: `published-${index}`, caseVersion: current.caseVersion, contentId: current.contentId, promptVersion: current.promptVersion });
      expect(await repository.getOrCreatePublication(current, async () => publication)).toEqual(publication);
    }
    expect(await repository.getOrCreatePublication(key, async () => { throw new Error("unexpected generation"); })).toEqual(article({ id: "published-0" }));
  });

  it.each(["caseVersion", "contentId", "promptVersion"] as const)("rejects a mismatched %s without poisoning the publication key", async (field) => {
    const repository = new InMemoryGameRepository();
    await expect(repository.getOrCreatePublication(key, async () => article({ [field]: "wrong-value" }))).rejects.toThrow("版本不匹配");
    expect(await repository.getOrCreatePublication(key, async () => article())).toEqual(article());
  });
});

describe("PostgreSQL publication transaction contract", () => {
  function connection(query: ReturnType<typeof vi.fn>) {
    const release = vi.fn();
    const pool = { connect: vi.fn(async () => ({ query, release })) } as unknown as Pool;
    return { repository: new PostgresGameRepository(pool), release };
  }

  it("reads saved articles under the transaction lock without calling the provider", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ publication: article() }], rowCount: 1 });
    const { repository, release } = connection(query);
    const generate = vi.fn(async () => article({ body: "changed" }));
    expect(await repository.getOrCreatePublication(key, generate)).toEqual(article());
    expect(generate).not.toHaveBeenCalled();
    expect(query.mock.calls.map((call) => call[0])).toEqual([
      "BEGIN", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      "SELECT publication FROM publications WHERE case_id = $1 AND case_version = $2 AND content_id = $3 AND prompt_version = $4", "COMMIT",
    ]);
    expect(query.mock.calls[2][1]).toEqual([key.caseId, key.caseVersion, key.contentId, key.promptVersion]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("locks before generating and commits the exact completed article", async () => {
    const order: string[] = [];
    const query = vi.fn(async (sql: string, _parameters?: unknown[]) => { order.push(sql.split(" ")[0]); return { rows: [], rowCount: 0 }; });
    const { repository, release } = connection(query);
    const result = await repository.getOrCreatePublication(key, async () => { order.push("GENERATE"); return article(); });
    expect(result).toEqual(article());
    expect(order).toEqual(["BEGIN", "SELECT", "SELECT", "GENERATE", "INSERT", "COMMIT"]);
    expect(query.mock.calls[3][1]).toEqual([key.caseId, key.caseVersion, key.contentId, key.promptVersion, article()]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects corrupt saved metadata instead of silently generating a replacement", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ publication: article({ promptVersion: "wrong-value" }) }], rowCount: 1 });
    const { repository, release } = connection(query);
    const generate = vi.fn(async () => article());
    await expect(repository.getOrCreatePublication(key, generate)).rejects.toThrow("版本不匹配");
    expect(generate).not.toHaveBeenCalled();
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the lock on generation failure without writing a fallback", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const { repository, release } = connection(query);
    await expect(repository.getOrCreatePublication(key, async () => { throw new Error("provider unavailable"); })).rejects.toThrow("provider unavailable");
    expect(query.mock.calls.some((call) => call[0].startsWith("INSERT"))).toBe(false);
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects a failed database commit and releases the connection", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql === "COMMIT") throw new Error("connection lost");
      return { rows: [], rowCount: 0 };
    });
    const { repository, release } = connection(query);
    await expect(repository.getOrCreatePublication(key, async () => article())).rejects.toThrow("connection lost");
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("discards a connection whose rollback failed while preserving the provider error", async () => {
    const rollbackError = new Error("database disconnected");
    const query = vi.fn(async (sql: string) => {
      if (sql === "ROLLBACK") throw rollbackError;
      return { rows: [], rowCount: 0 };
    });
    const { repository, release } = connection(query);
    await expect(repository.getOrCreatePublication(key, async () => { throw new Error("provider timeout"); })).rejects.toThrow("provider timeout");
    expect(release).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith(rollbackError);
  });

  it("does not inspect another owner's actions when the owned game lookup fails", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const { repository, release } = connection(query);
    const nextState = { id: "game-a", ownerUserId: "user-b", stateVersion: 2 } as GameState;
    expect(await repository.saveGame({ gameInstanceId: "game-a", ownerUserId: "user-b", expectedStateVersion: 1, idempotencyKey: "private-key", actionType: "publish_comment", action: { text: "different text" }, nextState })).toBeNull();
    expect(query.mock.calls[1][1]).toEqual(["game-a", "user-b"]);
    expect(query.mock.calls.some((call) => call[0].includes("game_actions"))).toBe(false);
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects an idempotency body conflict before writing and rolls back", async () => {
    const nextState = { id: "game-a", ownerUserId: "user-a", stateVersion: 2 } as GameState;
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    query.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ state: nextState }] })
      .mockResolvedValueOnce({ rows: [{ action_type: "publish_comment", action: { text: "first question" } }], rowCount: 1 });
    const { repository, release } = connection(query);
    await expect(repository.saveGame({ gameInstanceId: "game-a", ownerUserId: "user-a", expectedStateVersion: 1, idempotencyKey: "private-key", actionType: "publish_comment", action: { text: "different question" }, nextState })).rejects.toBeInstanceOf(IdempotencyConflictError);
    expect(query.mock.calls.some((call) => /^(INSERT|UPDATE)/.test(call[0]))).toBe(false);
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });
});
