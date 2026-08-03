function mapDefs({ friendly, enemy, grid, forest, water }) {
  return `
    <defs>
      <pattern id="minorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke="${grid}" stroke-width="0.75" opacity="0.3" />
      </pattern>
      <pattern id="majorGrid" width="200" height="200" patternUnits="userSpaceOnUse">
        <rect width="200" height="200" fill="url(#minorGrid)" />
        <path d="M200 0H0V200" fill="none" stroke="${grid}" stroke-width="1.4" opacity="0.48" />
      </pattern>
      <pattern id="paperFlecks" width="47" height="43" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="11" r="0.8" fill="#766f58" opacity="0.16" />
        <circle cx="31" cy="7" r="0.55" fill="#766f58" opacity="0.13" />
        <circle cx="20" cy="32" r="0.7" fill="#766f58" opacity="0.12" />
        <path d="M38 28h4M11 39h3" stroke="#766f58" stroke-width="0.5" opacity="0.12" />
      </pattern>
      <pattern id="forestHatch" width="34" height="34" patternUnits="userSpaceOnUse">
        <rect width="34" height="34" fill="${forest}" />
        <path d="M7 18l5-10 5 10h-3l4 7H6l4-7zM25 12l3-6 3 6h-2l3 5h-8l3-5z" fill="none" stroke="#4b563e" stroke-width="1" opacity="0.6" />
      </pattern>
      <pattern id="paddyPattern" width="30" height="24" patternUnits="userSpaceOnUse">
        <path d="M0 12h30M7 0v24M22 0v24" fill="none" stroke="#65755f" stroke-width="0.8" opacity="0.42" />
        <path d="M10 16q4-8 8 0M13 17v4M16 17v4" fill="none" stroke="#65755f" stroke-width="0.8" opacity="0.56" />
      </pattern>
      <pattern id="orchard" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="7" r="2.4" fill="none" stroke="#566548" stroke-width="1" opacity="0.75" />
        <path d="M7 9v4M21 23v4" stroke="#566548" stroke-width="1" opacity="0.75" />
        <circle cx="21" cy="21" r="2.4" fill="none" stroke="#566548" stroke-width="1" opacity="0.75" />
      </pattern>
      <marker id="friendlyArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0 0v6l9-3-2.5 0z" fill="${friendly}" />
      </marker>
      <marker id="enemyArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0 0v6l9-3-2.5 0z" fill="${enemy}" />
      </marker>
      <filter id="roughInk" x="-12%" y="-20%" width="124%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="8" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="mapShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#3d372c" flood-opacity=".28" />
      </filter>
    </defs>`;
}

function gridIndex(topLabels, sideLabels) {
  return `
    <g class="grid-layer" data-layer-group="grid">
      <path class="map-grid" d="M0 0H1000V720H0z" fill="url(#majorGrid)" />
      <g class="grid-index" aria-hidden="true">
        ${topLabels.map((label, index) => `<text x="${95 + index * 200}" y="17">${label}</text>`).join("")}
        ${topLabels.map((label, index) => `<text x="${95 + index * 200}" y="710">${label}</text>`).join("")}
        ${sideLabels.map((label, index) => `<text x="9" y="${105 + index * 200}">${label}</text><text x="977" y="${105 + index * 200}">${label}</text>`).join("")}
      </g>
    </g>`;
}

const taierzhuangMap = `
  <svg class="battle-map taierzhuang-map" viewBox="0 0 1000 720" role="img" aria-label="1938年台儿庄战役作战地图">
    <title>1938年台儿庄地区第五战区作战图</title>
    <desc>显示台儿庄城、运河、铁路、中国守军最后报告位置以及日军敌情。</desc>
    ${mapDefs({ friendly: "#9c3b32", enemy: "#315779", grid: "#8b6755", forest: "#a5aa88", water: "#78969a" })}
    <rect class="map-paper" width="1000" height="720" />
    <rect class="paper-flecks" width="1000" height="720" fill="url(#paperFlecks)" />
    ${gridIndex(["壹", "贰", "叁", "肆", "伍"], ["丁", "丙", "乙"])}

    <g class="terrain-layer">
      <path class="paddy" d="M0 35h275v185H0zM0 455h245v205H0zM740 15h260v198H740zM762 472h238v248H762z" />
      <path class="woodland" d="M35 228c67-48 148-41 191 13 37 46 13 103-54 119-72 17-143-24-156-75-5-22 2-41 19-57z" />
      <path class="woodland" d="M808 238c56-34 132-18 172 31v132c-57 32-131 27-168-18-38-46-40-108-4-145z" />
      <path class="orchard" d="M123 381h133v84H123zM744 380h102v71H744z" />

      <g class="contours" fill="none">
        <path d="M38 160c69-43 147-47 224-14" /><path d="M51 183c66-36 136-38 203-10" />
        <path d="M760 95c80-34 157-27 228 18" /><path d="M774 119c67-26 133-18 202 25" />
        <path d="M26 670c89-31 166-27 236 9" /><path d="M751 666c85-39 164-43 249-5" />
      </g>

      <path class="canal-bank" d="M-25 558C218 531 393 548 589 570s284 15 438-17" />
      <path class="canal" d="M-25 558C218 531 393 548 589 570s284 15 438-17" />
      <path class="irrigation" d="M34 438c111 7 183 31 275 76M798 452c-45 45-81 74-128 104M94 72c21 53 48 94 91 130" />

      <g class="roads" fill="none">
        <path class="road-major" d="M-20 367C191 358 279 342 337 334M692 328c111-8 203-2 328 28" />
        <path class="road-major" d="M514 0c-1 98-7 154-10 196M511 503c8 72 6 139-5 238" />
        <path class="road-minor" d="M142 720c47-106 105-165 193-212M694 499c84 61 145 117 213 221" />
      </g>

      <g class="railway" fill="none">
        <path d="M828-20c-13 154-15 282-3 420s6 226-9 340" />
        <path class="rail-ties" d="M828-20c-13 154-15 282-3 420s6 226-9 340" />
      </g>

      <g class="city-wall">
        <path d="M318 188L690 174l38 80-8 245-390 5-42-78 7-179z" />
        <path class="wall-inner" d="M329 201l350-13 34 69-8 228-363 4-38-68 7-168z" />
        <g class="city-gates">
          <path d="M492 181v25M507 181v25M296 329h26M704 318h26M505 487v25" />
        </g>
      </g>

      <g class="city-blocks">
        <path d="M341 230h64v43h-64zM423 219h61v59h-61zM515 213h75v54h-75zM611 211h54v57h-54z" />
        <path d="M327 296h74v55h-74zM421 299h69v47h-69zM513 286h58v64h-58zM592 291h100v54H592z" />
        <path d="M332 375h55v76h-55zM407 367h77v94h-77zM505 371h70v81h-70zM598 365h91v88H598z" />
        <path class="street" d="M316 359h397M495 195v296M585 190v299M399 205v283" />
      </g>

      <g class="bridge" transform="translate(504 565)">
        <rect x="-30" y="-8" width="60" height="16" /><path d="M-24-12v24M-8-12v24M8-12v24M24-12v24" />
      </g>
    </g>

    <g class="settlements historical-labels">
      <text class="major-place" x="506" y="338" text-anchor="middle">臺兒莊<tspan x="506" dy="15">TAI-ERH-CHUANG</tspan></text>
      <text x="456" y="164">北門</text><text x="733" y="312">東門</text><text x="252" y="322">西門</text>
      <text class="water-label" x="520" y="604">大 運 河</text>
      <text class="rail-label" x="848" y="119" transform="rotate(85 848 119)">臺 棗 支 線</text>
      <text x="80" y="260">劉家湖</text><text x="838" y="433">東莊</text><text x="156" y="648">南洛</text>
    </g>

    <g class="labels">
      <text class="sheet-note" x="35" y="40">第五戰區作戰用圖 · 臺兒莊地區 · 五萬分一</text>
      <text class="sheet-note right" x="965" y="40" text-anchor="end">民國二十七年三月三十一日校訂</text>
      <g class="security-stamp" transform="translate(871 678) rotate(-3)"><rect x="-83" y="-20" width="166" height="31" /><text text-anchor="middle">機密 · 第二集團軍司令部</text></g>
      <text class="grid-note" x="42" y="690">方格每邊一公里 · 磁偏角見圖廓</text>
    </g>

    <g class="order-layer asia-orders" data-layer-group="orders">
      <path class="plan-arrow friendly" d="M198 612c82-53 123-84 170-121" marker-end="url(#friendlyArrow)" />
      <path class="plan-arrow friendly dashed" d="M212 307c47 4 73 12 105 25" marker-end="url(#friendlyArrow)" />
      <path class="plan-arrow enemy" d="M901 321c-68 0-112 2-169 20" marker-end="url(#enemyArrow)" />
      <path class="plan-arrow enemy dashed" d="M855 205c-52 22-89 44-128 83" marker-end="url(#enemyArrow)" />
      <path class="defence-line friendly" d="M310 474q20-15 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" filter="url(#roughInk)" />
      <text class="hand-note friendly" x="182" y="592" transform="rotate(-12 182 592)">第30師增援方向</text>
      <text class="hand-note friendly" x="350" y="472">城南最後防線</text>
      <text class="hand-note enemy" x="764" y="296" transform="rotate(-4 764 296)">日軍突入方向？</text>
    </g>

    <g class="intel-layer asia-intel" data-layer-group="intel">
      <g class="intel-contact" tabindex="0" role="button" data-contact="jpseya" transform="translate(775 334)">
        <circle class="uncertainty high" r="57" /><rect class="enemy-counter" x="-38" y="-21" width="76" height="42" />
        <path d="M-22-12L22 12M22-12L-22 12" /><text y="40">瀨谷支隊？ · 17:20</text>
      </g>
      <g class="intel-contact" tabindex="0" role="button" data-contact="jpguns" transform="translate(856 205)">
        <circle class="uncertainty low" r="52" /><rect class="enemy-counter faint" x="-34" y="-20" width="68" height="40" />
        <circle cx="0" cy="0" r="8" /><text y="38">炮兵 · 16:40</text>
      </g>
      <g class="intel-contact" tabindex="0" role="button" data-contact="jparmor" transform="translate(855 429)">
        <circle class="uncertainty medium" r="46" /><rect class="enemy-counter" x="-34" y="-20" width="68" height="40" />
        <path d="M-17 7V-7h34V7M-8-7l5-7h8l5 7" /><text y="38">戰車？ · 17:05</text>
      </g>
    </g>

    <g class="unit-layer asia-units" data-layer-group="units">
      <g class="unit-marker selected" tabindex="0" role="button" data-unit="cn31" transform="translate(410 414)">
        <path class="echelon" d="M-5-36v-8M5-36v-8" /><rect x="-42" y="-25" width="84" height="50" />
        <path d="M-25-14L25 14M25-14L-25 14" /><text class="unit-id" y="-32">第31師</text><text class="unit-time" y="44">17:42</text>
      </g>
      <g class="unit-marker" tabindex="0" role="button" data-unit="cn30" transform="translate(214 611)">
        <path class="echelon" d="M-5-36v-8M5-36v-8" /><rect x="-42" y="-25" width="84" height="50" />
        <path d="M-25-14L25 14M25-14L-25 14" /><text class="unit-id" y="-32">第30師</text><text class="unit-time" y="44">17:35</text>
      </g>
      <g class="unit-marker" tabindex="0" role="button" data-unit="cn27" transform="translate(203 306)">
        <path class="echelon" d="M-5-36v-8M5-36v-8" /><rect x="-42" y="-25" width="84" height="50" />
        <path d="M-25-14L25 14M25-14L-25 14" /><text class="unit-id" y="-32">第27師</text><text class="unit-time" y="44">17:18</text>
      </g>
      <g class="unit-marker" tabindex="0" role="button" data-unit="cnart" transform="translate(372 653)">
        <rect x="-42" y="-24" width="84" height="48" /><circle cx="0" cy="0" r="9" />
        <text class="unit-id" y="-31">直屬炮兵</text><text class="unit-time" y="42">17:26</text>
      </g>
    </g>

    <g class="map-compass" transform="translate(936 76)"><text y="-27">北</text><path d="M0-20l10 37-10-7-10 7z" /></g>
  </svg>`;

const arnhemMap = `
  <svg class="battle-map arnhem-map" viewBox="0 0 1000 720" role="img" aria-label="1944年阿纳姆战役作战地图">
    <title>1944年阿纳姆地区英国第1空降师作战图</title>
    <desc>显示阿纳姆、奥斯特贝克、下莱茵河、空降地域以及盟军最后报告位置。</desc>
    ${mapDefs({ friendly: "#255d9a", enemy: "#a03c35", grid: "#536f82", forest: "#9ca581", water: "#78969a" })}
    <rect class="map-paper" width="1000" height="720" />
    <rect class="paper-flecks" width="1000" height="720" fill="url(#paperFlecks)" />
    ${gridIndex(["E6", "E7", "E8", "E9", "F0"], ["N8", "N7", "N6"])}

    <g class="terrain-layer">
      <path class="woodland" d="M0 31c102-27 220-20 295 39 56 45 53 116-11 154-70 41-176 26-284-9V31z" />
      <path class="woodland" d="M273 245c80-39 181-26 229 30 43 49 19 112-46 138-77 31-178 1-213-61-23-41-10-80 30-107z" />
      <path class="woodland" d="M0 344c68-28 140-17 178 32 42 54 17 122-55 147-39 14-81 13-123 4V344z" />
      <path class="orchard" d="M519 173h125v79H519zM198 528h139v77H198z" />

      <g class="contours" fill="none">
        <path d="M25 271c98-55 205-57 315-6s208 43 302-17" /><path d="M17 296c111-49 210-46 317 2s212 34 318-22" />
        <path d="M43 324c104-38 192-32 288 12s196 32 306-25" /><path d="M616 77c80-34 166-27 255 18" />
        <path d="M642 103c70-26 141-18 218 22" /><path d="M665 128c61-19 123-10 185 25" />
      </g>

      <path class="river-bank" d="M-30 536C198 500 402 512 597 540s286 31 433-15" />
      <path class="river" d="M-30 536C198 500 402 512 597 540s286 31 433-15" />

      <g class="roads" fill="none">
        <path class="road-major" d="M-20 391c162-23 299-35 425-36s268 5 612-53" />
        <path class="road-major" d="M788 0c-7 122-3 217 1 317s5 197-9 423" />
        <path class="road-minor" d="M92 639c79-101 155-173 252-223M308 714c54-93 91-164 107-260M521 316c-19-96-17-188 8-278" />
      </g>

      <g class="railway" fill="none">
        <path d="M-20 267c184-5 322-5 448-18s279-32 592-20" />
        <path class="rail-ties" d="M-20 267c184-5 322-5 448-18s279-32 592-20" />
      </g>

      <g class="city-blocks arnhem-city">
        <path d="M662 161h58v39h-58zM730 153h61v47h-61zM801 147h72v45h-72zM884 140h79v44h-79z" />
        <path d="M650 213h68v51h-68zM728 211h55v45h-55zM792 205h84v52h-84zM885 199h91v50h-91z" />
        <path d="M654 276h56v50h-56zM720 271h71v53h-71zM802 266h64v52h-64zM877 259h100v57h-100z" />
        <path class="street" d="M642 205h345M642 264h345M718 142v190M790 139v190M875 132v194" />
      </g>

      <g class="city-blocks oosterbeek-city">
        <path d="M345 330h42v29h-42zM398 323h48v34h-48zM456 319h46v33h-46zM366 373h49v31h-49zM426 367h58v34h-58z" />
      </g>

      <g class="bridge" transform="translate(789 529) rotate(2)">
        <rect x="-11" y="-57" width="22" height="114" /><path d="M-15-49h30M-15-28h30M-15-7h30M-15 14h30M-15 35h30" />
      </g>

      <g class="landing-zones">
        <path d="M77 92h151v103H77z" /><path d="M66 566h137v96H66z" />
        <text x="151" y="140" text-anchor="middle">DZ X</text><text x="134" y="614" text-anchor="middle">LZ S</text>
      </g>
    </g>

    <g class="settlements historical-labels">
      <text class="major-place" x="817" y="110" text-anchor="middle">ARNHEM<tspan x="817" dy="14">阿納姆</tspan></text>
      <text x="421" y="306" text-anchor="middle">OOSTERBEEK<tspan x="421" dy="12">奧斯特貝克</tspan></text>
      <text x="482" y="640" text-anchor="middle">DRIEL<tspan x="482" dy="12">德里爾</tspan></text>
      <text class="water-label" x="518" y="580">NEDERRIJN · 下萊茵河</text>
      <text x="814" y="466">ROAD BRIDGE</text><text x="49" y="252">EDE</text>
    </g>

    <g class="labels">
      <text class="sheet-note" x="35" y="40">G.S.G.S. · NORTH-WEST EUROPE · ARNHEM DISTRICT · 1:50,000</text>
      <text class="sheet-note right" x="965" y="40" text-anchor="end">FIELD REVISION · 12 SEP 1944</text>
      <g class="security-stamp" transform="translate(872 679) rotate(-3)"><rect x="-76" y="-20" width="152" height="31" /><text text-anchor="middle">SECRET · 1 AIRBORNE DIV</text></g>
      <text class="grid-note" x="42" y="690">MODIFIED BRITISH SYSTEM · EACH SMALL SQUARE 1 KM</text>
    </g>

    <g class="order-layer" data-layer-group="orders">
      <path class="plan-arrow friendly" d="M236 374c152-16 293-33 462-58" marker-end="url(#friendlyArrow)" />
      <path class="plan-arrow friendly" d="M501 352c102-19 177-28 253-30" marker-end="url(#friendlyArrow)" />
      <path class="plan-arrow friendly dashed" d="M165 170c174 63 306 96 494 107" marker-end="url(#friendlyArrow)" />
      <path class="plan-arrow enemy" d="M951 286c-57 16-100 23-157 34" marker-end="url(#enemyArrow)" />
      <path class="plan-arrow enemy dashed" d="M868 624c-31-36-49-61-66-91" marker-end="url(#enemyArrow)" />
      <path class="defence-line enemy" d="M717 345q18-14 36 0t36 0t36 0t36 0" filter="url(#roughInk)" />
      <text class="hand-note friendly" x="356" y="338" transform="rotate(-7 356 338)">1 PARA BDE ROUTE</text>
      <text class="hand-note friendly" x="620" y="299">2 PARA · BRIDGE</text>
      <text class="hand-note enemy" x="816" y="371">BLOCKING LINE?</text>
    </g>

    <g class="intel-layer" data-layer-group="intel">
      <g class="intel-contact" tabindex="0" role="button" data-contact="de9ss" transform="translate(882 288)">
        <circle class="uncertainty high" r="58" /><rect class="enemy-counter" x="-38" y="-21" width="76" height="42" />
        <path d="M-17 7V-7h34V7M-8-7l5-7h8l5 7" /><text y="40">ARMOUR? · 14:25</text>
      </g>
      <g class="intel-contact" tabindex="0" role="button" data-contact="deinf" transform="translate(715 367)">
        <circle class="uncertainty medium" r="43" /><rect class="enemy-counter" x="-34" y="-20" width="68" height="40" />
        <path d="M-18-11L18 11M18-11L-18 11" /><text y="39">INFANTRY · 14:42</text>
      </g>
      <g class="intel-contact" tabindex="0" role="button" data-contact="deflak" transform="translate(864 617)">
        <circle class="uncertainty low" r="49" /><rect class="enemy-counter faint" x="-34" y="-20" width="68" height="40" />
        <circle cx="0" cy="0" r="8" /><text y="39">FLAK? · 13:50</text>
      </g>
    </g>

    <g class="unit-layer" data-layer-group="units">
      <g class="unit-marker selected" tabindex="0" role="button" data-unit="uk1para" transform="translate(236 374)">
        <path class="echelon" d="M-5-36v-8M5-36v-8" /><rect x="-42" y="-25" width="84" height="50" />
        <path d="M-25-14L25 14M25-14L-25 14" /><text class="unit-id" y="-32">1 PARA BDE</text><text class="unit-time" y="44">14:38</text>
      </g>
      <g class="unit-marker" tabindex="0" role="button" data-unit="uk2para" transform="translate(735 319)">
        <path class="echelon" d="M-4-35v-8M4-35v-8" /><rect x="-41" y="-24" width="82" height="48" />
        <path d="M-24-13L24 13M24-13L-24 13" /><text class="unit-id" y="-31">2 PARA</text><text class="unit-time" y="43">14:47</text>
      </g>
      <g class="unit-marker" tabindex="0" role="button" data-unit="ukairland" transform="translate(164 171)">
        <path class="echelon" d="M-5-36v-8M5-36v-8" /><rect x="-43" y="-25" width="86" height="50" />
        <path d="M-25-14L25 14M25-14L-25 14" /><text class="unit-id" y="-32">1 AIRLDG</text><text class="unit-time" y="44">14:31</text>
      </g>
      <g class="unit-marker" tabindex="0" role="button" data-unit="ukrecon" transform="translate(501 352)">
        <rect x="-40" y="-24" width="80" height="48" /><path d="M-22 10l11-20h22l11 20zM-17 10h34" />
        <text class="unit-id" y="-31">RECCE</text><text class="unit-time" y="43">14:45</text>
      </g>
    </g>

    <g class="map-compass" transform="translate(936 78)"><text y="-27">N</text><path d="M0-20l10 37-10-7-10 7z" /></g>
  </svg>`;

window.BATTLE_MAPS = {
  taierzhuang: taierzhuangMap,
  arnhem: arnhemMap
};
