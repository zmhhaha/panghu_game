import type { CampaignCatalogEntry, CampaignDefinition } from "@qianfu/core";
import { LINJIANG_1942 } from "./campaigns/linjiang-1942/index.js";
import { HAIZHOU_1943 } from "./campaigns/haizhou-1943/index.js";

interface RegisteredCampaign {
  definition: CampaignDefinition;
  catalog: CampaignCatalogEntry;
}

const REGISTERED_CAMPAIGNS: RegisteredCampaign[] = [{
  definition: LINJIANG_1942,
  catalog: {
    id: LINJIANG_1942.id,
    version: LINJIANG_1942.version,
    name: LINJIANG_1942.name,
    setting: "临江，1942年5月",
    summary: "十日内连续完成无线电设备运输侦察、敌方清查部署确认与地下交通线保全。",
    estimatedDays: 10,
    objectiveCount: LINJIANG_1942.objectives.length,
    coverProfileIds: ["archive_clerk", "travelling_merchant", "freelance_writer"],
    coverProfileOverrides: Object.fromEntries(Object.entries(LINJIANG_1942.coverProfiles).map(([id, profile]) => [id, { title: profile.title, summary: profile.summary, routineLabel: profile.routineLabel }])),
  },
}, {
  definition: HAIZHOU_1943,
  catalog: {
    id: HAIZHOU_1943.id,
    version: HAIZHOU_1943.version,
    name: HAIZHOU_1943.name,
    setting: "海州，1943年9月",
    summary: "从一只失踪的急救药箱入手，揭开伪证诱捕计划，并在封锁前重建南汊地下交通线。",
    estimatedDays: 10,
    objectiveCount: HAIZHOU_1943.objectives.length,
    coverProfileIds: ["archive_clerk", "travelling_merchant", "freelance_writer"],
    coverProfileOverrides: Object.fromEntries(Object.entries(HAIZHOU_1943.coverProfiles).map(([id, profile]) => [id, { title: profile.title, summary: profile.summary, routineLabel: profile.routineLabel }])),
  },
}];

const CAMPAIGNS = new Map<string, CampaignDefinition>(REGISTERED_CAMPAIGNS.map(({ definition }) => [
  campaignKey(definition.id, definition.version),
  definition,
]));

export const DEFAULT_CAMPAIGN_REF = Object.freeze({ id: LINJIANG_1942.id, version: LINJIANG_1942.version });

export function getCampaignDefinition(id: string, version: string): CampaignDefinition {
  const campaign = CAMPAIGNS.get(campaignKey(id, version));
  if (!campaign) throw new Error(`Unknown campaign content: ${id}@${version}`);
  return campaign;
}

export function listCampaignDefinitions(): CampaignDefinition[] {
  return [...CAMPAIGNS.values()];
}

export function listCampaignCatalog(): CampaignCatalogEntry[] {
  return REGISTERED_CAMPAIGNS.map(({ catalog }) => structuredClone(catalog));
}

function campaignKey(id: string, version: string) {
  return `${id}@${version}`;
}
