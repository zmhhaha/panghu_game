import type {
  ActionResult, CampaignReportBundle, CampaignShareSummary, DifficultyConfig,
  GameAction, PublicWorldState, SharedCampaignReport,
} from "@qianfu/core";

type PublicActionResult = Omit<ActionResult, "state"> & { state: PublicWorldState };

export interface GameContext {
  campaign: { id: string; version: string; name: string };
  locations: { id: string; name: string; district: string; discovered: boolean }[];
  characters: { id: string; name: string; publicIdentity: string; recruitable: boolean; known: boolean }[];
  networkMembers: { id: string; name: string; publicIdentity: string }[];
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
  deleteGame: (id: string) => request<{ deleted: true }>(`/api/v1/games/${id}`, { method: "DELETE" }),
  getContext: (id: string) => request<GameContext>(`/api/v1/games/${id}/context`),
  getReport: (id: string) => request<CampaignReportBundle>(`/api/v1/games/${id}/report`),
  listShares: (id: string) => request<{ shares: CampaignShareSummary[] }>(`/api/v1/games/${id}/shares`),
  createShare: (id: string, expiresInDays: 7 | 30 | 90 | null) => request<CampaignShareSummary>(`/api/v1/games/${id}/shares`, { method: "POST", body: JSON.stringify({ expiresInDays }) }),
  revokeShare: (shareId: string) => request<{ revoked: true }>(`/api/v1/manage-shares/${shareId}`, { method: "DELETE" }),
  getSharedReport: (shareId: string) => request<SharedCampaignReport>(`/api/v1/shares/${shareId}`),
  exportGame: (id: string, format: "json" | "html" = "json") => `/api/v1/games/${id}/export?format=${format}`,
  exportShare: (shareId: string, format: "json" | "html") => `/api/v1/shares/${shareId}/export?format=${format}`,
  act: (id: string, action: GameAction) => request<PublicActionResult>(`/api/v1/games/${id}/actions`, { method: "POST", body: JSON.stringify(action) }),
};
