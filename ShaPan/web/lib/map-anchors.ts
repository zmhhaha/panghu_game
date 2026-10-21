import { CAMPAIGN_MAPS, type MapAnchor } from "./map-definition";

export type { MapAnchor, MapAnchorKind } from "./map-definition";

/** The frontend and simulation consume the same physical features and connections. */
export const CAMPAIGN_ANCHORS: Record<string, MapAnchor[]> = Object.fromEntries(
  Object.entries(CAMPAIGN_MAPS).map(([campaignId, definition]) => [
    campaignId,
    definition.anchors.map((anchor) => ({
      ...anchor,
      connectsTo: definition.edges.flatMap((edge) =>
        edge.from === anchor.id ? [edge.to] : edge.to === anchor.id ? [edge.from] : []
      ),
    })),
  ])
);

export function anchorsForCampaign(campaignId: string): MapAnchor[] {
  return CAMPAIGN_ANCHORS[campaignId] ?? [];
}

export function anchorForCampaign(campaignId: string, anchorId: string): MapAnchor | null {
  return anchorsForCampaign(campaignId).find((anchor) => anchor.id === anchorId) ?? null;
}
