import type { ActionResult, DifficultyConfig, GameAction, PublicWorldState } from "@qianfu/core";

type PublicActionResult = Omit<ActionResult, "state"> & { state: PublicWorldState };

export interface GameContext {
  campaign: { id: string; version: string; name: string };
  locations: { id: string; name: string; district: string }[];
  characters: { id: string; name: string; publicIdentity: string; recruitable: boolean }[];
  intel: { id: string; title: string; requiredFields: string[] }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  me: () => request<{ id: string; username: string }>("/api/v1/auth/me"),
  listGames: () => request<{ games: PublicWorldState[] }>("/api/v1/games"),
  createGame: (difficulty: DifficultyConfig["id"]) => request<PublicWorldState>("/api/v1/games", { method: "POST", body: JSON.stringify({ difficulty }) }),
  getGame: (id: string) => request<PublicWorldState>(`/api/v1/games/${id}`),
  getContext: (id: string) => request<GameContext>(`/api/v1/games/${id}/context`),
  exportGame: (id: string) => `/api/v1/games/${id}/export`,
  act: (id: string, action: GameAction) => request<PublicActionResult>(`/api/v1/games/${id}/actions`, { method: "POST", body: JSON.stringify(action) }),
};
