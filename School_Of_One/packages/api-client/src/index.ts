/**
 * School of One API Client
 *
 * 统一的前端 API 封装层，处理所有后端 + AI Agent 的 HTTP 调用。
 *
 * 用法：
 *   import { api } from "@school-of-one/api-client";
 *   const factions = await api.factions.list();
 *   const result = await api.duel.judge({ moveA, moveB, distance });
 *
 * 配置：apiClient.baseUrl 默认为空（同源请求），
 *       K8s 生产环境下改成 "https://wulin.panghuer.top"。
 */

import type { Faction, PresetCard } from "@school-of-one/core";
import type {
  DuelJudgeResponse,
  ComboJudgeResponse,
  TrainingSessionStartResponse,
  TrainingRoundResponse,
  TrainingMatchResponse,
  UserProfileResponse,
  DeckResponse,
  DuelRecordResponse,
  TrainingSessionResponse,
} from "./types.js";

export * from "./types.js";

// ── HTTP 基础封装 ─────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiClientConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

let config: ApiClientConfig = {
  baseUrl: "",
  headers: { "Content-Type": "application/json" },
};

export function configureApiClient(cfg: Partial<ApiClientConfig>): void {
  config = { ...config, ...cfg };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { signal?: AbortSignal },
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: config.headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: opts?.signal,
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text().catch(() => null);
    }
    throw new ApiError(
      res.status,
      typeof detail === "object" && detail && "error" in detail
        ? (detail as { error: string }).error
        : res.statusText,
      detail,
    );
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── API 模块 ──────────────────────────────────────────────

export const apiClient = {
  health: {
    check(signal?: AbortSignal) {
      return request<{ status: string; game: string }>("GET", "/api/health", undefined, { signal });
    },
  },

  factions: {
    list(signal?: AbortSignal) {
      return request<{ factions: Faction[] }>("GET", "/api/v1/factions", undefined, { signal });
    },
    getById(id: string, signal?: AbortSignal) {
      return request<{ faction: Faction }>("GET", `/api/v1/factions/${encodeURIComponent(id)}`, undefined, { signal });
    },
  },

  cards: {
    listPreset(params?: { faction?: string; gameId?: string }, signal?: AbortSignal) {
      const query = new URLSearchParams();
      if (params?.faction) query.set("faction", params.faction);
      if (params?.gameId) query.set("gameId", params.gameId);
      const qs = query.toString();
      return request<{ cards: PresetCard[]; total: number }>("GET", `/api/v1/cards/preset${qs ? `?${qs}` : ""}`, undefined, { signal });
    },
    getPreset(id: string, signal?: AbortSignal) {
      return request<{ card: PresetCard }>("GET", `/api/v1/cards/preset/${encodeURIComponent(id)}`, undefined, { signal });
    },
    mine(signal?: AbortSignal) {
      return request<{ cardIds: string[] }>("GET", "/api/v1/cards/mine", undefined, { signal });
    },
    unlock(cardId: string, signal?: AbortSignal) {
      return request<{ message: string; cardId: string }>("POST", "/api/v1/cards/unlock", { cardId }, { signal });
    },
  },

  auth: {
    me(signal?: AbortSignal) {
      return request<UserProfileResponse>("GET", "/api/v1/auth/me", undefined, { signal });
    },
    register(signal?: AbortSignal) {
      return request<{ message: string }>("POST", "/api/v1/auth/register", undefined, { signal });
    },
  },

  duel: {
    judge(
      params: { moveA: string; moveB: string; distance: number; cardA?: string | null; cardB?: string | null; round?: number },
      signal?: AbortSignal,
    ) {
      return request<DuelJudgeResponse>("POST", "/api/ai/duel/judge", params, { signal });
    },
  },

  combo: {
    judge(
      params: { moveA: string; moveB: string; context?: string },
      signal?: AbortSignal,
    ) {
      return request<ComboJudgeResponse>("POST", "/api/ai/combo/judge", params, { signal });
    },
  },

  training: {
    start(params: { factionId: string }, signal?: AbortSignal) {
      return request<TrainingSessionStartResponse>("POST", "/api/ai/training/start", params, { signal });
    },
    submitRound(params: { sessionId: string; description: string }, signal?: AbortSignal) {
      return request<TrainingRoundResponse>("POST", "/api/ai/training/round", params, { signal });
    },
    getMatch(params: { sessionId: string }, signal?: AbortSignal) {
      return request<TrainingMatchResponse>("POST", "/api/ai/training/match", params, { signal });
    },
    sessions: {
      list(signal?: AbortSignal) {
        return request<{ sessions: TrainingSessionResponse[] }>("GET", "/api/v1/training/sessions", undefined, { signal });
      },
      create(params: { factionId?: string; masterName?: string; rounds?: number; matchedCardId?: string }, signal?: AbortSignal) {
        return request<{ id: string; message: string }>("POST", "/api/v1/training/sessions", params, { signal });
      },
    },
  },

  decks: {
    list(signal?: AbortSignal) {
      return request<{ decks: DeckResponse[] }>("GET", "/api/v1/decks", undefined, { signal });
    },
    save(params: { id?: string; name?: string; starterCardId: string; cardIds: string[] }, signal?: AbortSignal) {
      return request<{ id: string; message: string }>("POST", "/api/v1/decks", params, { signal });
    },
    delete(id: string, signal?: AbortSignal) {
      return request<{ message: string }>("DELETE", `/api/v1/decks/${encodeURIComponent(id)}`, undefined, { signal });
    },
  },

  duels: {
    list(signal?: AbortSignal) {
      return request<{ duels: DuelRecordResponse[] }>("GET", "/api/v1/duels", undefined, { signal });
    },
    record(params: { opponent?: string; winner: string; rounds: number; playerHearts: number; aiHearts: number; history?: unknown[] }, signal?: AbortSignal) {
      return request<{ id: string; message: string }>("POST", "/api/v1/duels", params, { signal });
    },
  },
};

// 方便快捷引用
export const api = apiClient;
