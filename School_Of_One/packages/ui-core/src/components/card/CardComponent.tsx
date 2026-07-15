import type { CardBase, PresetCard } from "@school-of-one/core";

interface CardProps {
  card: CardBase | PresetCard;
  size?: "sm" | "md" | "lg";
  state?: "default" | "selected" | "disabled";
  onClick?: () => void;
}

const S = { sm: {w:180,h:255}, md:{w:220,h:311}, lg:{w:280,h:396} };

const FALLBACKS = [
  ["蓄勁如弓·發勁如箭","剛柔並濟·動靜相宜","進退有度·攻守兼備"],
  ["沉肩墜肘·氣沉丹田","虛靈頂勁·周身一家","眼到手到·身步合一"],
  ["剛柔並濟·動靜相宜","不即不離·不丟不頂","隨機應變·變化莫測"],
  ["以柔克剛·以靜制動","借力打力·四兩撥千","順勢而爲·自然而然"],
];

function getVerse(card: CardBase): string[] {
  if (card.verses && card.verses.length > 0) return card.verses;
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

export function CardComponent({card,size="md",state="default",onClick}:CardProps){
  const d=S[size];const v=getVerse(card);
  const isDark=state==="disabled";const isSel=state==="selected";
  const figureSrc = card.artAssetId ? `/assets/figures/${card.artAssetId}` : "/assets/picture.png";
  return <div onClick={onClick} style={{
    opacity:isDark?0.4:1,transform:isSel?"translateY(-4px)":"none",transition:"all .2s",
    cursor:onClick?"pointer":"default",
    width:d.w,height:d.h,position:"relative",overflow:"hidden",flexShrink:0,
    fontFamily:"'KaiTi','STKaiti','Noto Serif SC',serif",color:"#2c1810",
  }}>
    {/* 底图 */}
    <img src="/assets/card-bg.png" alt="" style={{
      position:"absolute",inset:0,zIndex:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none",
    }} />
    {/* 人物图 */}
    <img src={figureSrc} alt="" style={{
      position:"absolute",left:0,top:Math.round(d.h*0.235),zIndex:1,
      width:Math.round(d.w*0.667),objectFit:"contain",pointerEvents:"none",opacity:0.88,
    }} />
    {/* 图说 */}
    <div style={{
      position:"absolute",top:Math.round(d.h*0.157),left:Math.round(d.w*0.067),zIndex:2,
      writingMode:"vertical-rl",fontSize:Math.round(d.w*0.039),color:"#2c1810",opacity:0.5,
      letterSpacing:1,border:"1px solid #2c181060",padding:"2px 4px",
      display:"flex",flexDirection:"column",gap:0,alignItems:"center",
    }}>
      <span>圖</span><span>說</span>
    </div>
    {/* 招式名 */}
    <div style={{
      position:"absolute",top:Math.round(d.h*0.141),right:Math.round(d.w*0.111),zIndex:2,
      writingMode:"vertical-rl",fontSize:Math.round(d.w*0.067),fontWeight:"bold",
      color:"#2c1810",letterSpacing:1,
    }}>
      {card.name}
    </div>
    {/* 歌诀 */}
    <div style={{
      position:"absolute",top:Math.round(d.h*0.141),right:Math.round(d.w*0.2),bottom:Math.round(d.h*0.235),zIndex:2,
      display:"flex",flexDirection:"row",gap:1,alignItems:"flex-start",
    }}>
      {v.map((l,i)=><div key={i} style={{
        writingMode:"vertical-rl",textOrientation:"mixed",
        fontSize:Math.round(d.w*0.039),color:"#2c1810",letterSpacing:1.5,
        lineHeight:1.5,opacity:0.7,minWidth:"1.2em",whiteSpace:"nowrap",
      }}>{l}</div>)}
    </div>
  </div>;
}
