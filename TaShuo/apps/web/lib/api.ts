import type { EvidenceEntry, PublicCaseSummary, PublicGameState } from "@tashuo/core";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly payload: Record<string, unknown>) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => ({ error: "请求失败" })) as Record<string, unknown>;
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/oauth2/start?rd=${encodeURIComponent(returnTo)}`);
    }
    throw new ApiError(String(payload.error ?? `HTTP ${response.status}`), response.status, payload);
  }
  return payload as T;
}

const key = () => crypto.randomUUID();

export const api = {
  me: () => request<{ id: string; username: string }>("/api/v1/auth/me"),
  cases: () => request<{ cases: PublicCaseSummary[] }>("/api/v1/cases"),
  games: () => request<{ games: PublicGameState[] }>("/api/v1/games"),
  createGame: (caseId: string) => request<PublicGameState>("/api/v1/games", { method: "POST", body: JSON.stringify({ caseId }) }),
  game: (id: string) => request<PublicGameState>(`/api/v1/games/${id}`),
  deleteGame: (id: string) => request<{ deleted: true }>(`/api/v1/games/${id}`, { method: "DELETE" }),
  sync: (id: string) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/sync`, { method: "POST", body: JSON.stringify({ idempotencyKey: key() }) }),
  pause: (id: string) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/pause`, { method: "POST", body: JSON.stringify({ idempotencyKey: key() }) }),
  resume: (id: string) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/resume`, { method: "POST", body: JSON.stringify({ idempotencyKey: key() }) }),
  timeScale: (id: string, timeScale: 1 | 10 | 100) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/time-scale`, { method: "POST", body: JSON.stringify({ idempotencyKey: key(), timeScale }) }),
  saveContent: (id: string, contentId: string) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/save-content`, { method: "POST", body: JSON.stringify({ idempotencyKey: key(), contentId }) }),
  engage: (id: string, contentId: string, action: "like" | "repost") => request<{ state: PublicGameState }>(`/api/v1/games/${id}/engagement`, { method: "POST", body: JSON.stringify({ idempotencyKey: key(), contentId, action }) }),
  comment: (id: string, contentId: string, text: string, confirmationToken?: string) => request<{ state: PublicGameState; comment: PublicGameState["comments"][number] }>(`/api/v1/games/${id}/comments`, { method: "POST", body: JSON.stringify({ idempotencyKey: key(), contentId, text, confirmationToken }) }),
  evidence: (id: string, entry: EvidenceEntry) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/evidence`, { method: "PUT", body: JSON.stringify({ idempotencyKey: key(), entry }) }),
  createNote: (id: string, text: string, linkedContentIds: string[]) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/notes`, { method: "POST", body: JSON.stringify({ idempotencyKey: key(), text, linkedContentIds }) }),
  deleteNote: (id: string, noteId: string) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/notes/${noteId}`, { method: "DELETE", body: JSON.stringify({ idempotencyKey: key() }) }),
  report: (id: string, text: string) => request<{ state: PublicGameState }>(`/api/v1/games/${id}/report`, { method: "POST", body: JSON.stringify({ idempotencyKey: key(), text }) }),
};
