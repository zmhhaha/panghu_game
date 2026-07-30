import type {
  ActionResult, CampaignCatalogEntry, CampaignReportBundle, CampaignShareSummary, DifficultyConfig,
  DifficultyVisibilityPolicy, GameAction, GameEvent, PublicWorldState, RecruitmentCase, SharedCampaignReport,
  RadioMessageFormat, RadioMessageItem, RadioMinigameConfig, RadioTiming,
} from "@qianfu/core";

export type PublicActionResult = Omit<ActionResult, "state"> & { state: PublicWorldState };
export type CampaignListItem = PublicWorldState & { campaignName: string; currentLocationName: string };

export interface GameContext {
  visibility: DifficultyVisibilityPolicy;
  radioMinigame: RadioMinigameConfig;
  campaign: { id: string; version: string; name: string };
  settlement: { ready: boolean; pendingReceipts: number };
  locations: { id: string; name: string; district: string; travelMinutes: Record<string, number>; discovered: boolean; stage: "unknown" | "rumored" | "located" | "accessible" | "compromised"; hint: string | null }[];
  narrativeThreads: Array<{ id: string; title: string; summary: string; status: "active" | "resolved"; sourceEventId: string; updatedAt: string }>;
  rest: { available: boolean; reason: string };
  countermeasures: Array<{
    kind: "check_tail" | "reinforce_cover" | "plant_decoy" | "relocate_materials";
    label: string;
    durationMinutes: 20 | 30 | 60;
    description: string;
    available: boolean;
    reason: string;
    requiresTarget: boolean;
  }>;
  radioSites: Array<{ id: string; name: string; baseRisk: number; available: boolean; discovered: boolean; currentHeat: number; requiresRecruitedCharacterId: string | null }>;
  characters: { id: string; name: string; publicIdentity: string; recruitable: boolean; known: boolean; verifiableIntelIds: string[]; availableDialogueGoals: import("@qianfu/core").DialogueGoal[] }[];
  networkMembers: { id: string; name: string; publicIdentity: string }[];
  recruitmentCandidates: Array<{
    id: string;
    name: string;
    publicIdentity: string;
    stage: RecruitmentCase["stage"];
    completedTestTypes: RecruitmentCase["completedTestTypes"];
    evidence: Array<Omit<RecruitmentCase["evidence"][number], "result"> & { result: RecruitmentCase["evidence"][number]["result"] | null }>;
    requirements: {
      contactReady: boolean;
      cooperationReady: boolean;
      rapportReady: boolean;
      testsCompleted: number;
      testsRequired: number;
    };
    canRecruit: boolean;
  }>;
  intel: { id: string; title: string; requiredFields: string[]; fieldLabels: Record<string, string> }[];
  objectives: Array<{
    id: string;
    title: string;
    deadline: string;
    minimumConfidence: number;
    acceptedDeliveryMethods: string[];
    status: "locked" | "in_progress" | "ready_to_transmit" | "completed" | "failed" | "overdue";
    remainingMinutes: number;
    intel: Array<{
      id: string;
      title: string;
      requiredFields: string[];
      knownFields: string[];
      deliveredFields: string[];
      confidence: number;
      delivered: boolean;
      missingFields: string[];
      receiptStatus: "not_sent" | "pending" | "confirmed" | "partial" | "no_receipt" | "courier_delivered";
    }>;
  }>;
}

export interface PlayerSnapshotSummary {
  slot: 1 | 2; label: string; savedAt: string; currentTime: string; stateVersion: number; lastEventSeq: number;
}

export interface RadioChallenge {
  token: string;
  sequence: string;
  groups: string[];
  interruptions: Array<{ id: string; atSymbol: number; gameMinute: number; kind: "static" | "patrol" | "power_flicker"; title: string; description: string }>;
  checksPerformed: number;
  config: RadioMinigameConfig;
  expiresAt: string;
  content: Array<{ intelId: string; title: string; fields: string[] }>;
}

export interface RadioChallengeRequest {
  items: RadioMessageItem[];
  format: RadioMessageFormat;
  codebookId: "one_time_pad" | "book_cipher";
  timing: RadioTiming;
  locationId: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const authenticationExpired = response.status === 401 || (response.status === 403 && contentType.includes("text/html"));
    if (authenticationExpired && typeof window !== "undefined") {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(`/oauth2/start?rd=${encodeURIComponent(returnTo)}`);
      throw new Error("登录状态已过期，正在重新登录");
    }
    const payload = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  me: () => request<{ id: string; username: string }>("/api/v1/auth/me"),
  listCampaigns: () => request<{ campaigns: CampaignCatalogEntry[] }>("/api/v1/campaigns"),
  listGames: () => request<{ games: CampaignListItem[] }>("/api/v1/games"),
  createGame: (campaign: Pick<CampaignCatalogEntry, "id" | "version">, difficulty: DifficultyConfig["id"], coverProfileId: PublicWorldState["cover"]["profileId"]) => request<PublicWorldState>("/api/v1/games", {
    method: "POST",
    body: JSON.stringify({ campaignId: campaign.id, campaignVersion: campaign.version, difficulty, coverProfileId }),
  }),
  getGame: (id: string) => request<PublicWorldState>(`/api/v1/games/${id}`),
  deleteGame: (id: string) => request<{ deleted: true }>(`/api/v1/games/${id}`, { method: "DELETE" }),
  getContext: (id: string) => request<GameContext>(`/api/v1/games/${id}/context`),
  getEvents: (id: string) => request<{ events: GameEvent[] }>(`/api/v1/games/${id}/events`),
  createRadioChallenge: (id: string, selection: RadioChallengeRequest) => request<RadioChallenge>(`/api/v1/games/${id}/radio-challenges`, { method: "POST", body: JSON.stringify(selection) }),
  listSnapshots: (id: string) => request<{ snapshots: PlayerSnapshotSummary[] }>(`/api/v1/games/${id}/snapshots`),
  saveSnapshot: (id: string, slot: 1 | 2, label: string) => request<PlayerSnapshotSummary>(`/api/v1/games/${id}/snapshots/${slot}`, { method: "PUT", body: JSON.stringify({ label }) }),
  loadSnapshot: (id: string, slot: 1 | 2) => request<{ state: PublicWorldState; events: GameEvent[] }>(`/api/v1/games/${id}/snapshots/${slot}/load`, { method: "POST", body: "{}" }),
  getReport: (id: string) => request<CampaignReportBundle>(`/api/v1/games/${id}/report`),
  listShares: (id: string) => request<{ shares: CampaignShareSummary[] }>(`/api/v1/games/${id}/shares`),
  createShare: (id: string, expiresInDays: 7 | 30 | 90 | null) => request<CampaignShareSummary>(`/api/v1/games/${id}/shares`, { method: "POST", body: JSON.stringify({ expiresInDays }) }),
  revokeShare: (shareId: string) => request<{ revoked: true }>(`/api/v1/manage-shares/${shareId}`, { method: "DELETE" }),
  getSharedReport: (shareId: string) => request<SharedCampaignReport>(`/api/v1/shares/${shareId}`),
  exportGame: (id: string, format: "json" | "html" = "json") => `/api/v1/games/${id}/export?format=${format}`,
  exportShare: (shareId: string, format: "json" | "html") => `/api/v1/shares/${shareId}/export?format=${format}`,
  act: (id: string, action: GameAction) => request<PublicActionResult>(`/api/v1/games/${id}/actions`, { method: "POST", body: JSON.stringify(action) }),
};
