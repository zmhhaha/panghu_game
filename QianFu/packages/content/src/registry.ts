import type { CampaignCatalogEntry, CampaignDefinition } from "@qianfu/core";
import { LINJIANG_1942 } from "./campaigns/linjiang-1942/index.js";

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
