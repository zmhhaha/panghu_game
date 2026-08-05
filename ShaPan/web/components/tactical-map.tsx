"use client";

import { ChevronDown, ChevronUp, Crosshair, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export type TacticalUnit = {
  id: string;
  name: string;
  side: "friendly" | "enemy";
  x: number;
  y: number;
  detail: string;
  status: string;
  summary: string;
  symbol: "infantry" | "artillery" | "armor" | "recon" | "hq";
  strength: string;
  morale: string;
  comms: string;
};

export type MapLayers = {
  units: boolean;
  intel: boolean;
  orders: boolean;
  grid: boolean;
};

type TacticalMapProps = {
  campaignId: string;
  battleStarted: boolean;
  paused: boolean;
  battleEnded?: boolean;
  canStart: boolean;
  layers: MapLayers;
  units: TacticalUnit[];
  revealedUnitIds: Set<string>;
  selectedUnit: TacticalUnit;
  visibleReportCount: number;
  onSelectUnit: (unitId: string) => void;
  onSetRecipient: (unitId: string) => void;
  onStartBattle: () => void;
};

function UnitGlyph({ unit }: { unit: TacticalUnit }) {
  if (unit.symbol === "artillery") return <span className="text-base leading-none">●</span>;
  if (unit.symbol === "armor") return <span className="text-sm leading-none">▱</span>;
  if (unit.symbol === "recon") return <span className="text-sm leading-none">◇</span>;
  if (unit.symbol === "hq") return <span className="text-[10px] leading-none">HQ</span>;
  return <span className="text-base leading-none">X</span>;
}

function EuropeMap({ layers, knownUnits }: { layers: MapLayers; knownUnits: Set<string> }) {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="阿纳姆地区认知作战图">
      <defs>
        <pattern id="eu-grid" width="90" height="90" patternUnits="userSpaceOnUse">
          <path d="M 90 0 L 0 0 0 90" fill="none" stroke="#6f765f" strokeWidth="1" opacity=".38" />
          <text x="7" y="14" fill="#5c6657" fontSize="8">E8</text>
        </pattern>
        <pattern id="eu-woods" width="28" height="25" patternUnits="userSpaceOnUse">
          <path d="M8 19 L14 7 L20 19 Z M14 7 L14 22" fill="none" stroke="#6f7b5d" strokeWidth="1.4" opacity=".75" />
        </pattern>
        <marker id="eu-blue-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#2e6ea4" /></marker>
        <marker id="eu-red-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#a9493f" /></marker>
      </defs>
      <rect width="900" height="720" fill="#d8cfaa" />
      {layers.grid ? <rect width="900" height="720" fill="url(#eu-grid)" /> : null}
      <path d="M-40 590 C160 535 315 570 474 605 C640 641 760 645 940 586" fill="none" stroke="#8ea6a1" strokeWidth="66" opacity=".62" />
      <path d="M-40 590 C160 535 315 570 474 605 C640 641 760 645 940 586" fill="none" stroke="#c8d4c9" strokeWidth="36" opacity=".75" />
      <path d="M-20 380 C160 351 314 358 470 342 C640 325 746 282 930 300" fill="none" stroke="#b75e4d" strokeWidth="9" opacity=".75" />
      <path d="M675 -20 C670 150 680 320 674 744" fill="none" stroke="#b75e4d" strokeWidth="9" opacity=".75" />
      <path d="M122 710 L314 420 L393 35" fill="none" stroke="#8d6758" strokeDasharray="7 6" strokeWidth="3" opacity=".72" />
      <path d="M45 170 C150 120 235 130 315 184 C235 236 136 242 46 204 Z" fill="#9aa37b" opacity=".66" />
      <path d="M45 170 C150 120 235 130 315 184 C235 236 136 242 46 204 Z" fill="url(#eu-woods)" />
      <path d="M140 330 C238 282 326 300 385 371 C335 449 216 462 132 405 Z" fill="#9aa37b" opacity=".66" />
      <path d="M140 330 C238 282 326 300 385 371 C335 449 216 462 132 405 Z" fill="url(#eu-woods)" />
      <path d="M707 318 C792 276 884 304 930 380 L930 470 C834 502 745 453 707 392 Z" fill="#9aa37b" opacity=".66" />
      <path d="M707 318 C792 276 884 304 930 380 L930 470 C834 502 745 453 707 392 Z" fill="url(#eu-woods)" />
      <g fill="#675d50" stroke="#d8cfaa" strokeWidth="6">
        <rect x="555" y="120" width="82" height="62" /><rect x="646" y="105" width="102" height="73" /><rect x="760" y="118" width="96" height="62" />
        <rect x="544" y="190" width="94" height="64" /><rect x="649" y="188" width="102" height="75" /><rect x="760" y="188" width="132" height="68" />
        <rect x="548" y="266" width="106" height="63" /><rect x="664" y="275" width="90" height="67" /><rect x="765" y="270" width="125" height="72" />
      </g>
      <g fill="none" stroke="#a47762" strokeWidth="1.6" opacity=".7">
        <path d="M525 55 Q650 -5 785 54" /><path d="M540 78 Q657 25 780 75" /><path d="M558 102 Q664 55 774 98" />
      </g>
      <g fill="#3f493f" fontFamily="Georgia, serif">
        <text x="673" y="73" fontSize="16" fontWeight="700">ARNHEM</text>
        <text x="653" y="91" fontSize="8">阿纳姆</text>
        <text x="321" y="319" fontSize="14" fontWeight="700">OOSTERBEEK</text>
        <text x="319" y="336" fontSize="8">奥斯特贝克</text>
        <text x="105" y="286" fontSize="13" fontWeight="700">EDE</text>
        <text x="465" y="670" fontSize="12" fontWeight="700">DRIEL</text>
        <text x="482" y="624" fill="#547c91" fontSize="13" fontStyle="italic">NEDERRIJN · 下莱茵河</text>
        <text x="702" y="562" fontSize="12" fontWeight="700">ROAD BRIDGE</text>
      </g>
      <g transform="translate(810 62)" fill="#4e5349"><path d="M0 42 L12 0 L24 42 L12 32 Z" /><text x="8" y="58" fontSize="10">N</text></g>
      {layers.orders && knownUnits.has("uk1para") ? <path d="M180 410 C330 395 440 355 555 335 C626 323 663 316 693 305" fill="none" stroke="#2e6ea4" strokeWidth="10" markerEnd="url(#eu-blue-arrow)" opacity=".92" /> : null}
      {layers.orders && knownUnits.has("uk2para") ? <path d="M284 265 C385 298 470 314 564 325" fill="none" stroke="#2e6ea4" strokeWidth="6" strokeDasharray="12 8" markerEnd="url(#eu-blue-arrow)" opacity=".9" /> : null}
      {layers.intel && knownUnits.has("deinf") ? <path d="M858 314 C782 324 740 355 700 398" fill="none" stroke="#a9493f" strokeWidth="7" markerEnd="url(#eu-red-arrow)" opacity=".9" /> : null}
      {layers.intel && knownUnits.has("de9ss") ? <path d="M816 642 C760 590 720 552 688 500" fill="none" stroke="#a9493f" strokeWidth="5" markerEnd="url(#eu-red-arrow)" opacity=".9" /> : null}
      <text x="25" y="695" fill="#496c95" fontSize="11" fontWeight="700">MODIFIED BRITISH SYSTEM · EACH SMALL SQUARE 1 KM</text>
    </svg>
  );
}

function ChinaMap({ layers, knownUnits }: { layers: MapLayers; knownUnits: Set<string> }) {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="台儿庄地区认知作战图">
      <defs>
        <pattern id="cn-grid" width="90" height="90" patternUnits="userSpaceOnUse">
          <path d="M 90 0 L 0 0 0 90" fill="none" stroke="#76755f" strokeWidth="1" opacity=".38" />
          <text x="7" y="14" fill="#5c6657" fontSize="8">壹</text>
        </pattern>
        <pattern id="cn-woods" width="28" height="25" patternUnits="userSpaceOnUse">
          <path d="M8 19 L14 7 L20 19 Z M14 7 L14 22" fill="none" stroke="#6f7b5d" strokeWidth="1.4" opacity=".75" />
        </pattern>
        <marker id="cn-blue-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#2e6ea4" /></marker>
        <marker id="cn-red-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#a9493f" /></marker>
      </defs>
      <rect width="900" height="720" fill="#d8cfaa" />
      {layers.grid ? <rect width="900" height="720" fill="url(#cn-grid)" /> : null}
      <path d="M-30 570 C158 536 308 562 480 590 C650 618 777 615 940 578" fill="none" stroke="#8ea6a1" strokeWidth="66" opacity=".62" />
      <path d="M-30 570 C158 536 308 562 480 590 C650 618 777 615 940 578" fill="none" stroke="#c8d4c9" strokeWidth="36" opacity=".76" />
      <path d="M470 -20 C466 115 472 264 475 390 C480 520 476 628 470 742" fill="none" stroke="#b75e4d" strokeWidth="9" opacity=".78" />
      <path d="M-20 384 C151 377 278 356 405 355 C574 355 729 337 930 374" fill="none" stroke="#b75e4d" strokeWidth="8" opacity=".76" />
      <path d="M226 116 L624 102 L674 184 L662 494 L248 498 L201 430 L204 186 Z" fill="#b2a887" stroke="#655a4e" strokeWidth="7" />
      <path d="M229 145 L616 135 L640 196 L631 461 L271 466 L232 414 L234 201 Z" fill="none" stroke="#80745e" strokeDasharray="9 7" strokeWidth="2" />
      <g fill="#675d50" stroke="#b2a887" strokeWidth="7">
        <rect x="279" y="171" width="78" height="61" /><rect x="366" y="159" width="74" height="72" /><rect x="451" y="153" width="82" height="84" /><rect x="544" y="153" width="76" height="70" />
        <rect x="273" y="248" width="94" height="74" /><rect x="381" y="241" width="93" height="81" /><rect x="485" y="250" width="70" height="72" /><rect x="566" y="244" width="70" height="80" />
        <rect x="280" y="336" width="80" height="76" /><rect x="375" y="339" width="82" height="79" /><rect x="472" y="338" width="72" height="82" /><rect x="557" y="338" width="82" height="80" />
      </g>
      <path d="M224 474 Q245 446 267 474 T311 474 T355 474 T399 474 T443 474 T487 474 T531 474 T575 474 T619 474" fill="none" stroke="#a9493f" strokeWidth="5" />
      <path d="M18 235 C92 178 178 183 225 250 C171 321 82 327 18 286 Z" fill="#9aa37b" opacity=".68" />
      <path d="M18 235 C92 178 178 183 225 250 C171 321 82 327 18 286 Z" fill="url(#cn-woods)" />
      <path d="M676 253 C772 206 859 233 930 315 L930 418 C827 458 726 407 681 343 Z" fill="#9aa37b" opacity=".68" />
      <path d="M676 253 C772 206 859 233 930 315 L930 418 C827 458 726 407 681 343 Z" fill="url(#cn-woods)" />
      <g fill="#3f493f" fontFamily="KaiTi, serif">
        <text x="420" y="304" fontSize="20" fontWeight="700">台儿庄</text>
        <text x="426" y="321" fontSize="8">TAI-ERH-CHWANG</text>
        <text x="116" y="233" fontSize="16">刘家湖</text>
        <text x="180" y="122" fontSize="14">北门</text>
        <text x="698" y="322" fontSize="14">东门</text>
        <text x="28" y="676" fill="#496c95" fontSize="13">方格每边一公里 · 磁偏角见图廓</text>
        <text x="483" y="611" fill="#547c91" fontSize="14" fontStyle="italic">大运河</text>
      </g>
      <g transform="translate(810 56)" fill="#4e5349"><path d="M0 42 L12 0 L24 42 L12 32 Z" /><text x="8" y="58" fontSize="10">N</text></g>
      {layers.orders && knownUnits.has("cn30") ? <path d="M230 652 C290 584 343 524 391 470" fill="none" stroke="#a9493f" strokeWidth="9" markerEnd="url(#cn-red-arrow)" opacity=".92" /> : null}
      {layers.orders && knownUnits.has("cn27") ? <path d="M88 348 C166 344 220 350 273 369" fill="none" stroke="#a9493f" strokeWidth="7" markerEnd="url(#cn-red-arrow)" opacity=".92" /> : null}
      {layers.intel && knownUnits.has("jpseya") ? <path d="M834 257 C762 265 708 285 671 324" fill="none" stroke="#2e6ea4" strokeWidth="6" strokeDasharray="12 8" markerEnd="url(#cn-blue-arrow)" opacity=".9" /> : null}
      {layers.intel && knownUnits.has("jparmor") ? <path d="M807 443 C750 430 704 403 675 370" fill="none" stroke="#2e6ea4" strokeWidth="5" strokeDasharray="10 7" markerEnd="url(#cn-blue-arrow)" opacity=".9" /> : null}
    </svg>
  );
}

export function TacticalMap({ campaignId, battleStarted, paused, battleEnded = false, canStart, layers, units, revealedUnitIds, selectedUnit, visibleReportCount, onSelectUnit, onSetRecipient, onStartBattle }: TacticalMapProps) {
  const isAsia = campaignId === "taierzhuang";
  const hasReports = battleStarted && visibleReportCount > 0;
  const selectedKnown = revealedUnitIds.has(selectedUnit.id);
  const [unitPanelExpanded, setUnitPanelExpanded] = useState(false);

  useEffect(() => {
    setUnitPanelExpanded(false);
  }, [selectedUnit.id]);

  function markerClasses(unit: TacticalUnit) {
    const friendly = unit.side === "friendly";
    if (isAsia) return friendly ? "border-[#a9493f] text-[#8f382f]" : "border-[#2e6ea4] text-[#245b89]";
    return friendly ? "border-[#2e6ea4] text-[#245b89]" : "border-[#a9493f] text-[#8f382f]";
  }

  return (
    <div className="tactical-map relative min-h-[560px] flex-1 overflow-hidden bg-[#d8cfaa] lg:min-h-0">
      {isAsia ? <ChinaMap layers={layers} knownUnits={revealedUnitIds} /> : <EuropeMap layers={layers} knownUnits={revealedUnitIds} />}

      {layers.units ? units.filter((unit) => revealedUnitIds.has(unit.id)).map((unit) => (
        <button
          key={unit.id}
          type="button"
          onClick={() => onSelectUnit(unit.id)}
          className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left"
          style={{ left: `${unit.x}%`, top: `${unit.y}%` }}
          aria-label={`${unit.name}，${unit.status}`}
        >
          <span className={cn(
            "mil-marker flex h-11 w-16 items-center justify-center border-[3px] bg-[#ddd4ad] font-bold",
            markerClasses(unit),
            selectedUnit.id === unit.id && "ring-2 ring-[#eee1a8] ring-offset-2 ring-offset-[#626c59]"
          )}><UnitGlyph unit={unit} /></span>
          <span className={cn("mt-1 block whitespace-nowrap bg-[#ddd4ad]/75 px-1 py-0.5 text-[10px] font-bold", markerClasses(unit))}>{unit.name} · {unit.detail.split("·").at(-1)?.trim()}</span>
        </button>
      )) : null}

      {selectedKnown ? (
        <div className={cn(
          "absolute left-3 top-3 z-30 border border-[#4b544c] bg-[#172019]/95 text-paper shadow-xl transition-[width,padding] duration-150",
          unitPanelExpanded ? "w-[min(276px,calc(100%-1.5rem))] p-3" : "w-[min(220px,calc(100%-1.5rem))] p-2",
        )}>
          <button
            type="button"
            onClick={() => setUnitPanelExpanded((expanded) => !expanded)}
            className="flex w-full min-w-0 items-center gap-2 text-left"
            aria-expanded={unitPanelExpanded}
            aria-controls="selected-unit-details"
            title={unitPanelExpanded ? "收起部队详情" : "展开部队详情"}
          >
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center border text-[10px] font-bold", markerClasses(selectedUnit))}>
              <UnitGlyph unit={selectedUnit} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{selectedUnit.name}</span>
              <span className="mt-0.5 block truncate text-[10px] text-muted">{selectedUnit.status} · {selectedUnit.detail.split("·").at(-1)?.trim()}报告</span>
            </span>
            {unitPanelExpanded ? <ChevronUp size={15} className="shrink-0 text-muted" /> : <ChevronDown size={15} className="shrink-0 text-muted" />}
          </button>

          {unitPanelExpanded ? (
            <div id="selected-unit-details">
              <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-muted">
                <span className={cn("border px-2 py-1", markerClasses(selectedUnit))}>{selectedUnit.side === "friendly" ? "己方部队" : "敌情标记"}</span>
                <span>{selectedUnit.detail.split("·").at(-1)?.trim()} 报告</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-paper/85">{selectedUnit.summary}</p>
              <dl className="mt-3 grid grid-cols-3 border-y border-line py-2.5 text-xs">
                <div><dt className="text-[10px] text-muted">兵力</dt><dd className="mt-1 font-bold">{selectedUnit.strength}</dd></div>
                <div><dt className="text-[10px] text-muted">士气</dt><dd className="mt-1 font-bold">{selectedUnit.morale}</dd></div>
                <div><dt className="text-[10px] text-muted">通信</dt><dd className="mt-1 font-bold">{selectedUnit.comms}</dd></div>
              </dl>
              {selectedUnit.side === "friendly" ? <button type="button" onClick={() => onSetRecipient(selectedUnit.id)} className={cn("mt-3 flex h-8 w-full items-center justify-center gap-2 border text-xs text-paper", isAsia ? "border-alert/70 bg-alert/20" : "border-blueMark/70 bg-blueMark/20")}><Crosshair size={13} />设为命令对象</button> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!battleStarted ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#111613]/70 px-5 backdrop-blur-[1px]">
          <div className="w-full max-w-md border border-copper/70 bg-panel/95 p-6 text-center shadow-2xl">
            <p className="text-[10px] text-copper">OPERATIONS HOLD / 战前待命</p>
            <h3 className="mt-3 text-2xl font-bold">作战时钟尚未启动</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">当前地图只有战前底图。开始战役后，各部队报告、敌情标记与行动线将按照通信延迟逐步抵达。</p>
            <Button className="mt-5" variant="copper" disabled={!canStart} onClick={onStartBattle}><Play size={15} />开始战役</Button>
          </div>
        </div>
      ) : !hasReports ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#d8cfaa]/35"><div className="border border-[#4e5a4c]/60 bg-[#d8cfaa]/90 px-5 py-3 text-xs font-bold text-[#3e493f]">等待第一批战场回报</div></div>
      ) : null}

      {battleStarted && paused && !battleEnded ? <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 border border-copper/70 bg-panel/95 px-4 py-2 text-xs font-bold text-paper shadow-lg">战役已暂停 · 可阅读情报并下达军令</div> : null}

      <div className="absolute bottom-4 left-4 z-30 flex flex-wrap gap-3 border border-[#3b433c] bg-[#172019]/92 px-3 py-2 text-[10px] text-paper shadow-lg">
        <span className="flex items-center gap-1"><i className={cn("h-2.5 w-2.5 border-2", isAsia ? "border-alert" : "border-blueMark")} />己方已确认</span>
        <span className="flex items-center gap-1"><i className={cn("h-2.5 w-2.5 border-2", isAsia ? "border-blueMark" : "border-alert")} />敌情标记</span>
        <span className="flex items-center gap-1"><i className={cn("h-0.5 w-5", isAsia ? "bg-alert" : "bg-blueMark")} />行动标绘</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-copper" />报告可信度</span>
      </div>
      <div className="absolute bottom-4 right-4 z-30 flex items-end gap-2 text-[10px] font-bold text-[#354039]"><span className="block h-2 w-20 border-x border-b-2 border-[#354039]" />2 KM</div>
    </div>
  );
}
