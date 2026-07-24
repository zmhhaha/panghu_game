import { Pool } from "pg";
import type { GameRepository } from "./repository.js";
import { PostgresGameRepository } from "./postgres-repository.js";
import { InMemoryGameRepository } from "./store.js";

function createGameRepository(): GameRepository {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production");
    }
    console.warn("[QianFu] DATABASE_URL is not set; using non-persistent in-memory storage");
    return new InMemoryGameRepository();
  }
  return new PostgresGameRepository(new Pool({
    connectionString,
    // Every connection is isolated to QianFu's schema inside the shared database.
    options: "-c search_path=qianfu,public",
  }));
}

export const gameRepository = createGameRepository();
