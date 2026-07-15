// 古籍拳谱卡牌渲染 — 按参考图标准：
// 顶部：拳谱卷上（横排居中）
// 右区：第一势 招式名（竖排）
// 中区：心法歌诀（竖排长篇）
// 左区：武者白描线稿
// 左下角：图说小字
// 底部中间：朱砂藏书印
// 整体黑色细木刻版框
function renderCard(c,oc){
  const v=(VERSES[c.name]||FALLBACK[Math.floor(Math.random()*FALLBACK.length)]).split('\n');
  const seal = "武備珍舊拳譜";
  return`<div class="card-parchment" ${oc?'onclick="'+oc+'"':''}>
    <!-- 茶渍虫蛀 -->
    <div class="stain"></div>
    <!-- 黑色细木刻版框（完整四边） -->
    <div class="frame-black"></div>
    <!-- 顶部：拳谱卷上 横排居中 -->
    <div class="book-title">拳譜卷上</div>
    <!-- 右区：第一势 招式名 -->
    <div class="right-title">第一勢<br>${c.name}</div>
    <!-- 右区下方：心訊曰 -->
    <div class="sub-title">心訊曰</div>
    <!-- 中区：长篇歌诀 -->
    <div class="main-text">
      ${v.map(l=>`<div class="verse-line">${l}</div>`).join('')}
      ${v.length <= 2 ? '<div class="verse-line"> </div><div class="verse-line"> </div>' : ''}
    </div>
    <!-- 左区：武者线稿 -->
    <div class="figure-area">
      <svg viewBox="0 0 72 160" width="72" height="160">
        <circle cx="36" cy="22" r="9" stroke="#2c1810" stroke-width="1.4" fill="none"/>
        <circle cx="36" cy="14" r="2.5" fill="#2c1810" opacity=".2"/>
        <line x1="36" y1="33" x2="36" y2="65" stroke="#2c1810" stroke-width="1.4"/>
        <path d="M22,33 L14,56" stroke="#2c1810" stroke-width="1.4" fill="none"/>
        <path d="M50,33 L58,56" stroke="#2c1810" stroke-width="1.4" fill="none"/>
        <path d="M26,65 L18,85" stroke="#2c1810" stroke-width="1.4" fill="none"/>
        <path d="M46,65 L54,85" stroke="#2c1810" stroke-width="1.4" fill="none"/>
        <path d="M28,63 Q36,70 44,63" stroke="#2c1810" stroke-width=".5" fill="none" opacity=".25"/>
      </svg>
    </div>
    <!-- 左下角图说小字 -->
    <div class="fig-caption">圖說：身正·步穩·拳直</div>
    <!-- 底部中间朱砂藏书印 -->
    <div class="seal-main">${seal}</div>
    <!-- 左下角小方印 -->
    <div class="seal-mini">武備</div>
  </div>`;
}