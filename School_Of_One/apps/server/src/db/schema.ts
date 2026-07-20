import { pgTable, text, jsonb, integer, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().default(""),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at").notNull(),
});

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull().default("默认卡组"),
  starterCardId: text("starter_card_id").notNull(),
  cardIds: jsonb("card_ids").notNull().$type<string[]>(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  factionId: text("faction_id"),
  masterName: text("master_name"),
  rounds: integer("rounds").default(0),
  matchedCardId: text("matched_card_id"),
  createdAt: text("created_at").notNull(),
});

export const duelRecords = pgTable("duel_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  opponent: text("opponent").notNull().default("AI"),
  winner: text("winner").notNull(),
  rounds: integer("rounds").notNull().default(0),
  playerHearts: integer("player_hearts").notNull().default(10),
  aiHearts: integer("ai_hearts").notNull().default(10),
  history: jsonb("history").$type<unknown[]>().default([]),
  createdAt: text("created_at").notNull(),
});

export const userCards = pgTable("user_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id),
  cardId: text("card_id").notNull(),
  unlockedAt: text("unlocked_at").notNull(),
});
