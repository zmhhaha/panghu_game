export const campaigns = {
  taierzhuang: {
    id: "taierzhuang",
    title: "台儿庄战役",
    theater: "亚洲战场",
    mapStyle: "china-roca-1938",
    contentVersion: "taierzhuang-1938.v1",
    startAt: "1938-03-31T18:00:00+08:00",
    startMinute: 1080,
    deadlineMinute: 1800,
    objective: "坚守台儿庄核心阵地",
    units: ["cn31", "cn30", "cn27", "cnart", "cnreserve"]
  },
  arnhem: {
    id: "arnhem",
    title: "阿纳姆战役",
    theater: "欧洲战场",
    mapStyle: "europe-west-allied-1944",
    contentVersion: "arnhem-1944.v1",
    startAt: "1944-09-17T15:00:00+01:00",
    startMinute: 900,
    deadlineMinute: 1800,
    objective: "夺取并保持阿纳姆公路桥",
    units: ["uk1para", "uk2para", "ukairland", "ukrecon", "ukart"]
  }
};

export function getCampaign(id) {
  return campaigns[id] ?? null;
}

export function listCampaigns() {
  return Object.values(campaigns).map(({ id, title, theater, mapStyle, contentVersion, startAt, startMinute, deadlineMinute, objective }) => ({
    id,
    title,
    theater,
    mapStyle,
    contentVersion,
    startAt,
    startMinute,
    deadlineMinute,
    objective
  }));
}
