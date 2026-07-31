import type { GameRepository } from "./repository.js";
import { InMemoryGameRepository } from "./memory-repository.js";
import { createPostgresRepository } from "./postgres-repository.js";

export function createGameRepository(env: NodeJS.ProcessEnv = process.env): GameRepository {
  if (env.DATABASE_URL) return createPostgresRepository(env.DATABASE_URL);
  if (env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");
  return new InMemoryGameRepository();
}

export const gameRepository = createGameRepository();

