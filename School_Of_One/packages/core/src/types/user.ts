import { UserId } from "./card.js";

export interface User {
  id: UserId;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  level: number;
  xp: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserPublic {
  id: UserId;
  username: string;
  displayName: string;
  level: number;
  xp: number;
}

export interface FactionProgress {
  userId: UserId;
  factionId: string;
  level: number;
  xp: number;
  completedTrainingSessions: number;
  totalScore: number;
}
