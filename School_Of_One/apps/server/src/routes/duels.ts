import { Router } from "express";
import { v4 as uuid } from "uuid";
import { authMiddleware } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { duelRecords, users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const router = Router();

router.use(authMiddleware);

// ── 房间管理（内存存储，进程重启即丢失） ──────────────

interface DuelRoom {
  id: string;
  code: string;
  playerA: { userId: string; username: string; deckIds: string[]; starterId: string; ready: boolean };
  playerB: { userId: string; username: string; deckIds: string[]; starterId: string; ready: boolean } | null;
  state: "waiting" | "ready" | "in_progress" | "finished";
  currentRound: number;
  roundActions: { player: "A" | "B"; cardId: string; comboPrefix?: string }[];
  roundStartTime: number;
}
const ROUND_TIMEOUT = 30000;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const rooms = new Map<string, DuelRoom>();

// ── 约战 API ──────────────────────────────────────────

/** POST /api/v1/duels/room/lookup — 通过房间码查找 roomId */
router.post("/room/lookup", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "code required" }); return; }

  for (const [id, room] of rooms) {
    if (room.code === code.toUpperCase() && room.state !== "finished") {
      res.json({ roomId: id });
      return;
    }
  }
  res.status(404).json({ error: "房间不存在或已结束" });
});

/** POST /api/v1/duels/room — 创建房间 */
router.post("/room", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { deckIds, starterId } = req.body;
  if (!deckIds || !starterId) { res.status(400).json({ error: "deckIds and starterId required" }); return; }

  const id = uuid();
  const code = generateCode();
  const now = Date.now();
  rooms.set(id, {
    id,
    code,
    playerA: { userId: req.user.id, username: req.user.username, deckIds, starterId, ready: true },
    playerB: null,
    state: "waiting",
    currentRound: 0,
    roundActions: [],
    roundStartTime: now,
  });

  res.status(201).json({ roomId: id, code, shareLink: `${req.headers.origin}/duel/room/${id}` });
});

/** POST /api/v1/duels/room/:id/join — 加入房间 */
router.post("/room/:id/join", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { code, deckIds, starterId } = req.body;
  if (!code || !deckIds || !starterId) { res.status(400).json({ error: "code, deckIds and starterId required" }); return; }

  const room = rooms.get(req.params.id);
  if (!room) { res.status(404).json({ error: "房间不存在" }); return; }
  if (room.code !== code) { res.status(403).json({ error: "房间码错误" }); return; }
  if (room.playerB) { res.status(400).json({ error: "房间已满" }); return; }
  if (room.playerA.userId === req.user.id) { res.status(400).json({ error: "不能加入自己的房间" }); return; }

  room.playerB = { userId: req.user.id, username: req.user.username, deckIds, starterId, ready: true };
  room.state = "ready";
  res.json({ roomId: room.id, side: "B" });
});

/** GET /api/v1/duels/room/:id — 轮询房间状态 */
router.get("/room/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const room = rooms.get(req.params.id);
  if (!room) { res.status(404).json({ error: "房间不存在" }); return; }

  const side = room.playerA.userId === req.user.id ? "A" : room.playerB?.userId === req.user.id ? "B" : null;
  if (!side) { res.status(403).json({ error: "你不是该房间的玩家" }); return; }

  const opponent = side === "A" ? room.playerB : room.playerA;
  const myAction = room.roundActions.find((a) => a.player === side);
  const opponentAction = room.roundActions.find((a) => a.player !== side);

  // 超时检测：如果有人 30 秒没出招，替他用起手式出招
  let timeout = false;
  const now = Date.now();
  if (room.roundActions.length > 0 && now - room.roundStartTime > ROUND_TIMEOUT && room.state !== "finished") {
    if (!myAction) {
      room.roundActions.push({ player: side, cardId: "__timeout__", comboPrefix: "超时，退回起手式" });
      room.currentRound = Math.ceil(room.roundActions.length / 2);
      timeout = true;
    }
  }

  res.json({
    roomId: room.id,
    state: room.state,
    side,
    opponentName: opponent?.username || null,
    myTurn: myAction ? false : !opponentAction || room.roundActions.length === 0,
    currentRound: room.currentRound,
    roundActions: room.roundActions,
    started: room.state === "ready" || room.state === "in_progress",
    finished: room.state === "finished",
    timeout,
  });
});

/** POST /api/v1/duels/room/:id/action — 提交出招 */
router.post("/room/:id/action", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { cardId, comboPrefix } = req.body;
  if (!cardId) { res.status(400).json({ error: "cardId required" }); return; }

  const room = rooms.get(req.params.id);
  if (!room) { res.status(404).json({ error: "房间不存在" }); return; }
  if (room.state === "finished") { res.status(400).json({ error: "比武已结束" }); return; }

  const side = room.playerA.userId === req.user.id ? "A" : room.playerB?.userId === req.user.id ? "B" : null;
  if (!side) { res.status(403).json({ error: "你不是该房间的玩家" }); return; }
  if (room.roundActions.find((a) => a.player === side)) { res.status(400).json({ error: "本回合已出招" }); return; }

  room.roundActions.push({ player: side, cardId, comboPrefix: comboPrefix || "" });
  if (room.state === "waiting") room.state = "in_progress";
  room.currentRound = Math.ceil(room.roundActions.length / 2);
  // 双方都出招时重置计时器以待下轮
  if (room.roundActions.filter((a) => a.player === "A" || a.player === "B").length >= 2) {
    room.roundStartTime = Date.now();
  }

  // 双方都出招了
  const bothActed = room.roundActions.filter((a) =>
    a.player === "A" || room.roundActions.find((b) => b.player === "B")
  ).length >= 2 && room.roundActions.length >= 2;

  res.json({ round: room.currentRound, bothActed, waiting: !bothActed });
});

/** POST /api/v1/duels/room/:id/finish — 结束对战 */
router.post("/room/:id/finish", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { winner, rounds, playerHearts, aiHearts } = req.body;

  const room = rooms.get(req.params.id);
  if (!room) { res.status(404).json({ error: "房间不存在" }); return; }

  room.state = "finished";

  // 双方都保存对战记录
  try {
    const db = getDb();
    for (const player of [room.playerA, room.playerB]) {
      if (!player) continue;
      await db.insert(duelRecords).values({
        id: uuid(),
        userId: player.userId,
        opponent: (player.userId === room.playerA.userId ? room.playerB?.username : room.playerA.username) || "未知",
        winner,
        rounds: rounds || 0,
        playerHearts: playerHearts ?? 10,
        aiHearts: aiHearts ?? 10,
        history: [{ roomId: room.id }],
        createdAt: new Date().toISOString(),
      });
    }
  } catch { /* ignore db errors */ }

  res.json({ message: "比武结束" });
});

// ── 原有的对战历史 API ─────────────────────────────────

/** GET /api/v1/duels — 用户对战历史 */
router.get("/", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  try {
    const db = getDb();
    const rows = await db.select().from(duelRecords).where(eq(duelRecords.userId, req.user.id));
    res.json({ duels: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/v1/duels — 记录对战结果 */
router.post("/", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "未登录" }); return; }
  const { opponent, winner, rounds, playerHearts, aiHearts, history } = req.body;

  try {
    const db = getDb();
    const id = uuid();
    await db.insert(duelRecords).values({
      id,
      userId: req.user.id,
      opponent: opponent || "AI",
      winner: winner || "未知",
      rounds: rounds || 0,
      playerHearts: playerHearts ?? 10,
      aiHearts: aiHearts ?? 10,
      history: history || [],
      createdAt: new Date().toISOString(),
    });

    // 获胜加经验
    if (winner === "player") {
      try {
        await db.update(users)
          .set({ xp: (await db.select().from(users).where(eq(users.id, req.user.id)).limit(1))[0]?.xp ?? 0 + 10 })
          .where(eq(users.id, req.user.id));
      } catch { /* ignore xp errors */ }
    }

    res.status(201).json({ id, message: "对战记录已保存" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
