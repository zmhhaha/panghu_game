import type { CampaignDefinition } from "@qianfu/core";
import { LINJIANG_1942 } from "./campaigns/linjiang-1942/index.js";

const CAMPAIGNS = new Map<string, CampaignDefinition>([
  [campaignKey(LINJIANG_1942.id, LINJIANG_1942.version), LINJIANG_1942],
]);

export function getCampaignDefinition(id: string, version: string): CampaignDefinition {
  const campaign = CAMPAIGNS.get(campaignKey(id, version));
  if (!campaign) throw new Error(`Unknown campaign content: ${id}@${version}`);
  return campaign;
}

export function listCampaignDefinitions(): CampaignDefinition[] {
  return [...CAMPAIGNS.values()];
}

function campaignKey(id: string, version: string) {
  return `${id}@${version}`;
}
