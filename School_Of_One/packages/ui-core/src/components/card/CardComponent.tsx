import type { CardBase, PresetCard } from "@school-of-one/core";

interface CardProps {
  card: CardBase | PresetCard;
  size?: "sm" | "md" | "lg";
  state?: "default" | "selected" | "disabled";
  onClick?: () => void;
}

const S = { sm: {w:180,h:270}, md:{w:220,h:330}, lg:{w:280,h:420} };

const VERSES: Record<string,string> = {
  "罗汉拳":"羅漢出洞·拳開山岳\n金剛怒目·降龍伏虎",
  "铁山靠":"以肩爲盾·以背爲牆\n靠山撞壁·勢不可擋",
  "日字冲拳":"中線出拳·寸勁爆發\n朝面追形·不脫不黏",
  "如封似闭":"雙手合圍·如關城門\n封敵來路·閉門打狗",
};
const FALLBACKS = ["蓄勁如弓·發勁如箭\n剛柔並濟·動靜相宜","沉肩墜肘·氣沉丹田\n虛靈頂勁·周身一家"];

function getVerse(n:string){return VERSES[n]?.split('\n')||FALLBACKS[Math.floor(Math.random()*FALLBACKS.length)].split('\n')}

export function CardComponent({card,size="md",state="default",onClick}:CardProps){
  const d=S[size];const v=getVerse(card.name);
  const ink="#2c1810";const isDark=state==="disabled";const isSel=state==="selected";
  return <div onClick={onClick} style={{
    opacity:isDark?.5:1,transform:isSel?"translateY(-6px)":"none",transition:"all .2s",cursor:onClick?"pointer":"default",
    width:d.w,height:d.h,
    background:"linear-gradient(180deg, #f5eacb 0%, #e8d5a3 40%, #dcc29e 70%, #d4b88a 100%)",
    border:"1px solid #b8956a",position:"relative",overflow:"hidden",
    boxShadow:"2px 3px 12px rgba(139,100,55,0.25), inset 0 0 40px rgba(139,100,55,0.08)",
    fontFamily:"'KaiTi','STKaiti','Noto Serif SC',serif",color:ink,
  }}>
    <div style={{position:"absolute",right:6,top:12,bottom:12,width:1,
      background:"repeating-linear-gradient(180deg,#b8956a 0px,#b8956a 3px,transparent 3px,transparent 7px)"}}/>
    <div style={{position:"absolute",top:8,left:6,right:10,bottom:8,border:"1px solid #2c18101a",pointerEvents:"none"}}/>
    <div style={{position:"absolute",right:16,top:32,width:80,bottom:32,writingMode:"vertical-rl",textOrientation:"mixed",display:"flex",flexDirection:"column",gap:1,zIndex:2}}>
      <div style={{fontSize:18,fontWeight:"bold",color:"#1a0e08",letterSpacing:3,marginBottom:2}}>{card.name}</div>
      {v.map((l,i)=><div key={i} style={{fontSize:11,color:"#5a3a2a",letterSpacing:1,lineHeight:1.7,opacity:.72}}>{l}</div>)}
    </div>
  </div>;
}
