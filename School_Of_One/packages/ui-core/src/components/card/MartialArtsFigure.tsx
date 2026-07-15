// 白描线稿武术小人 — 展示在比武场中对位站立
// 根据 distance 值在 arena 中左右排布

interface Props {
  pose?: string;
  size?: number;
  color?: string;
  flipped?: boolean; // 对手朝左，玩家朝右，面对面
  distance?: number; // 0-5m，影响 horizontal offset
  isFall?: boolean;  // 摔倒状态
}

// 各招式的动作组合（pose → legs/arms 组合）
const POSE_MAP: Record<string, { legs: number; arms: number }> = {
  "起手": { legs: 0, arms: 0 },
  "拳法": { legs: 1, arms: 2 },
  "掌法": { legs: 0, arms: 1 },
  "腿法": { legs: 2, arms: 0 },
  "指法": { legs: 0, arms: 3 },
  "肘法": { legs: 0, arms: 4 },
  "防御": { legs: 0, arms: 5 },
  "腾空": { legs: 3, arms: 0 },
  "摔倒": { legs: 4, arms: 6 },
};

// 根据卡牌 keywords 推断动作姿态
function inferPose(keywords?: string[]): { legs: number; arms: number } {
  if (!keywords?.length) return { legs: 0, arms: 0 };
  for (const kw of keywords) {
    if (kw.includes("摔") || kw.includes("倒")) return POSE_MAP["摔倒"];
    if (kw.includes("腿") || kw.includes("踢") || kw.includes("弹")) return POSE_MAP["腿法"];
    if (kw.includes("掌") || kw.includes("推")) return POSE_MAP["掌法"];
    if (kw.includes("指") || kw.includes("点")) return POSE_MAP["指法"];
    if (kw.includes("肘")) return POSE_MAP["肘法"];
    if (kw.includes("拳") || kw.includes("冲") || kw.includes("捶") || kw.includes("炮")) return POSE_MAP["拳法"];
    if (kw.includes("防") || kw.includes("护") || kw.includes("格") || kw.includes("守")) return POSE_MAP["防御"];
    if (kw.includes("腾") || kw.includes("跃") || kw.includes("跳")) return POSE_MAP["腾空"];
  }
  return POSE_MAP["起手"];
}

export function MartialArtsFigure({ size = 80, color = "#f5e6c8", flipped = false, isFall = false }: Props) {
  const s = size;
  const cx = s / 2;
  const headR = s * 0.12;

  // 头部 y
  const headY = s * 0.15;

  // 身体
  const bodyTop = headY + headR;
  const bodyBottom = s * 0.55;
  const bodyMid = (bodyTop + bodyBottom) / 2;

  // 手臂
  const shoulderY = bodyTop + (bodyBottom - bodyTop) * 0.15;
  const handY = bodyBottom - (bodyBottom - bodyTop) * 0.35;

  // 腿
  const hipY = bodyBottom;
  const kneeY = s * 0.75;
  const footY = s * 0.92;

  // 面向：玩家朝右，对手朝左
  const dir = flipped ? -1 : 1;

  // 摔倒状态：直接画一个倒地的
  if (isFall) {
    return (
      <div style={{ width: s, height: s, position: "relative" }}>
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
          {/* 身体 — 横躺 */}
          <line x1={cx - s * 0.2} y1={bodyMid} x2={cx + s * 0.2} y2={bodyMid} stroke={color} strokeWidth={3} strokeLinecap="round" />
          {/* 头 */}
          <circle cx={cx - s * 0.25} cy={headY + s * 0.15} r={headR} fill="none" stroke={color} strokeWidth={2.5} />
          {/* 腿 */}
          <line x1={cx + s * 0.15} y1={bodyMid} x2={cx + s * 0.3} y2={bodyMid + s * 0.15} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={cx + s * 0.15} y1={bodyMid} x2={cx + s * 0.35} y2={bodyMid - s * 0.1} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          {/* 手臂 */}
          <line x1={cx - s * 0.05} y1={bodyMid} x2={cx - s * 0.2} y2={bodyMid + s * 0.1} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={cx - s * 0.05} y1={bodyMid} x2={cx - s * 0.25} y2={bodyMid - s * 0.1} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", bottom: 0, fontSize: s * 0.3, left: "50%", transform: "translateX(-50%)" }}>💫</div>
      </div>
    );
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {/* 头 */}
      <circle cx={cx + dir * 2} cy={headY} r={headR} fill="none" stroke={color} strokeWidth={2.5} />

      {/* 身体 — 稍微前倾 */}
      <line x1={cx} y1={bodyTop} x2={cx + dir * s * 0.04} y2={bodyBottom} stroke={color} strokeWidth={3} strokeLinecap="round" />

      {/* 前手 — 向前伸出 */}
      <line x1={cx} y1={shoulderY} x2={cx + dir * s * 0.4} y2={handY - s * 0.1} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      {/* 后手 — 护在胸前 */}
      <line x1={cx} y1={shoulderY + s * 0.05} x2={cx - dir * s * 0.15} y2={handY} stroke={color} strokeWidth={2.5} strokeLinecap="round" />

      {/* 前腿 */}
      <line x1={cx + dir * s * 0.04} y1={hipY} x2={cx + dir * s * 0.18} y2={kneeY} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={cx + dir * s * 0.18} y1={kneeY} x2={cx + dir * s * 0.25} y2={footY} stroke={color} strokeWidth={3} strokeLinecap="round" />

      {/* 后腿 */}
      <line x1={cx + dir * s * 0.04} y1={hipY} x2={cx - dir * s * 0.1} y2={kneeY + s * 0.05} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={cx - dir * s * 0.1} y1={kneeY + s * 0.05} x2={cx - dir * s * 0.2} y2={footY} stroke={color} strokeWidth={3} strokeLinecap="round" />

      {/* 脚下地面圆点 */}
      <circle cx={cx + dir * s * 0.25} cy={footY + s * 0.03} r={2} fill={color} opacity={0.5} />
      <circle cx={cx - dir * s * 0.2} cy={footY + s * 0.03} r={2} fill={color} opacity={0.5} />
    </svg>
  );
}
