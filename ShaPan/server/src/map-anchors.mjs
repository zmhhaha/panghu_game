// Authoritative normalized map anchors shared by route planning and map review.
export const MAP_ANCHORS = {
  taierzhuang: {
    city: { id: "tz-city-center", x: 50.6, y: 43.0 },
    east: { id: "tz-east-gate", x: 77.2, y: 44.0 },
    west: { id: "tz-west-road", x: 21.0, y: 53.0 },
    retreat: { id: "tz-south-assembly", x: 23.8, y: 84.5 },
    bridge: { id: "tz-bridge", x: 55.8, y: 71.8 },
  },
  arnhem: {
    bridge: { id: "ar-bridge", x: 87.7, y: 73.5 },
    north: { id: "ar-bridge-north", x: 87.8, y: 41.0 },
    west: { id: "ar-oosterbeek", x: 46.8, y: 44.5 },
    retreat: { id: "ar-lz-s", x: 15.0, y: 85.0 },
  },
};

export function campaignAnchors(campaignId) {
  return MAP_ANCHORS[campaignId] ?? MAP_ANCHORS.taierzhuang;
}
