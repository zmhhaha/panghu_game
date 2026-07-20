# 《自成一派》开发路线图

> **更新日期**：2026-07-20 | **当前阶段**：Phase 2 — 用户系统 + 数据持久化

---

## 📊 总体完成度评估

```
🔴 未开始  🟡 部分完成  🟢 基本完成
```

| 模块 | 完成度 | 状态 |
|:---|:---:|:---:|
| 品牌命名与设计 | 🟢 90% | ✅ 游戏名确定，视觉风格明确 |
| monorepo 工程 | 🟢 90% | ✅ pnpm + TS 配置就绪 |
| Core 类型定义 | 🟢 95% | ✅ 类型完整，无缺失字段 |
| 预设卡牌数据 | 🟢 90% | ✅ 126 张卡牌，全部 description 重写，歌诀待填充 |
| UI 卡牌组件 | 🟢 95% | ✅ 古风渲染组件完成（含底图/人物图/歌诀竖排）|
| 前端页面框架 | 🟢 95% | ✅ 7 个页面路由 + 全部页面就绪 |
| 后端 Express | 🟢 80% | ✅ 路由 + 代理（含反向代理问题修复），❌ 数据库未用 |
| AI Agent (Python) | 🟢 90% | ✅ 三个 Agent 代码完整 + DeepSeek LLM 接入 |
| 习武场前端 | 🟢 90% | ✅ multi-round 对话 UI + 对接 Python Agent（已跑通） |
| game-logic 战斗引擎 | 🟢 100% | ✅ DuelEngine 完成 |
| api-client | 🟢 100% | ✅ API 封装 + 类型导出 |
| 卡牌 displacement | 🟢 100% | ✅ 136 张全赋值 |
| 比武场对接 AI | 🟢 90% | ✅ 对接 DuelEngine + duel-judge API（连招、换牌、跳过、结算） |
| 兵器版前端 | 🔴 0% | ❌ 未开始 |
| 测试 | 🔴 0% | ❌ 零测试 |
| 数据库 + 用户系统 | 🟢 85% | ✅ PostgreSQL + Drizzle ORM 接入，用户自动注册，卡组/对战/习武 CRUD API |
| 部署 × 生产就绪 | 🟢 85% | ✅ school-of-one.panghuer.top 已部署运行 |

**整体粗估：~55%**

---

## 📅 Phase 1：核心框架（当前阶段）

> **目标**：让《武林争霸》前端页面全部跑通，核心玩法可体验

### ✅ 已完成

- [x] monorepo 工程搭建（pnpm workspace + TypeScript）
- [x] 核心类型定义（card/faction/deck/duel/training/user）
- [x] 136 张预设卡牌数据（4 门派 15 分支）
- [x] 古风卡牌 UI 组件（CardComponent + MartialArtsFigure）
- [x] 前端 6 个页面路由（Vite + React Router）
- [x] Express 后端框架 + 路由 + AI Agent 反向代理
- [x] 3 个 Python AI Agent（duel-judge / combo-judge / training-ground）
- [x] Docker + K8s 部署配置
- [x] game-logic 战斗核心（DuelEngine）
- [x] api-client 封装层
- [x] 卡牌 displacement 数值赋值
- [x] 比武场对接 DuelEngine（替代随机 mock）
- [x] 演武场改用真实卡牌数据
- [x] 习武场多轮对话 UI（三段式：选门派/对话/结果）
- [x] 对接 Python Agent 习武场（DeepSeek LLM 已跑通）

### ✅ Phase 1 已基本完成

Phase 1 核心框架代码和部署均已基本完成，项目已在 school-of-one.panghuer.top 上线运行。

---

## 📅 Phase 2：用户系统 + 数据持久化

> **目标**：用户能注册登录，游戏进度可保存

### ✅ 已完成

- [x] 数据库表结构设计（PostgreSQL + Drizzle ORM）
- [x] Drizzle ORM Schema（users / decks / training_sessions / duel_records）
- [x] Auth middleware 自动注册用户
- [x] 用户 /me API（含等级经验）
- [x] 卡组持久化 API（保存/加载/删除）
- [x] 对战记录 API
- [x] 习武记录 API
- [x] api-client 类型和方法更新
- [x] 服务器 Dockerfile 更新（pg 替代 better-sqlite3）

### 🟡 部分完成 / 待定

| # | 任务 | 优先级 | 预计工时 | 备注 |
|:---:|:---|:---:|:---:|:---|
| 1 | 前端 DeckBuilder 对接保存 API | 🟡 | 1h | 当前用 localStorage，可加云同步 |
| 2 | 前端 DuelPage 结束时保存对战记录 | 🟡 | 1h | 可调用 api.duels.record() |
| 3 | 前端 TrainingGround 结束时保存习武记录 | 🟡 | 1h | 可调用 api.training.sessions.create() |
| 4 | 前端登录注册页 | 🟢 | 0h | SSO 已覆盖，暂不需要 |
| 5 | 前端对战/习武历史展示页 | 🟡 | 2h | 查看历史记录 |

---

## 📅 Phase 3：完整对阵体验

> **目标**：比武场拥有完整的 PvAI 和 PvP 体验

| # | 任务 | 优先级 | 预计工时 | 备注 |
|:---:|:---|:---:|:---:|:---|
| 1 | **连招 UI 接入** | 🟡 | 3h | combo-judge 前端对接 |
| 2 | **完整的 PvAI 对战流程** | 🟡 | 4h | AI 智能选牌（非随机） |
| 3 | **起手式选择** | 🟡 | 2h | 开局从各门派起手中选一个 |
| 4 | **战斗动画效果** | 🟡 | 4h | 命中/格挡/摔倒的过渡 |
| 5 | **胜负判定 + 结算** | 🟡 | 2h | 经验/奖励 |
| 6 | **WebSocket 实时对战** | 🟡 | 6h | 为 PvP 做准备 |

---

## 📅 Phase 4：兵器版启动

> **目标**：开始建造第二个游戏版本

| # | 任务 | 优先级 | 预计工时 | 备注 |
|:---:|:---|:---:|:---:|:---|
| 1 | **兵器版项目初始化** | 🟡 | 1h | `apps/duel-on-mount-hua/` |
| 2 | **兵器卡牌数据** | 🟡 | 8h | 剑/刀/棍/暗器等 |
| 3 | **兵器版 UI 主题** | 🟡 | 4h | 银灰/青蓝配色 |
| 4 | **兵器战斗机制** | 🟡 | 6h | 武器范围 + 相克 |
| 5 | **共享组件抽象** | 🟡 | 4h | 将 martial-hegemony 通用组件抽象到 ui-core |

---

## 📅 Phase 5：打磨 + 测试 + 发布

> **目标**：MVP 可上线

| # | 任务 | 优先级 | 预计工时 | 备注 |
|:---:|:---|:---:|:---:|:---|
| 1 | **单元测试（core）** | 🔴 | 6h | 验证/数据/类型 |
| 2 | **组件测试（ui-core）** | 🟡 | 4h | CardComponent 等 |
| 3 | **E2E 测试（前端）** | 🟡 | 8h | 核心操作流 |
| 4 | **AI Agent 测试** | 🟡 | 4h | 各 Agent 的集成测试 |
| 5 | **性能优化** | 🟡 | 4h | 首屏加载、卡牌渲染 |
| 6 | **安全审计** | 🟡 | 3h | JWT、输入校验、API 鉴权 |
| 7 | **CI/CD 流水线** | 🟡 | 4h | GitHub Actions |
| 8 | **正式部署** | 🟡 | 4h | K8s 生产环境 |

---

## 🎯 Phase 6 及以后（远期规划）

| 功能 | 说明 | 优先级 |
|:---|:---|:---:|
| 世外高人自定义招式 | 前端对接 training-ground，支持全流程 | 🟡 |
| PvP 实时对战 | WebSocket | 🟡 |
| 排位赛系统 | 天梯/赛季 | 🟢 |
| 卡牌合成/升级 | 收集品级系统 | 🟢 |
| 成就系统 | 里程碑/称号 | 🟢 |
| 好友系统 | 添加好友/约战 | 🟢 |
| 师门挑战 | 门派间活动 | 🟢 |
| 兵器版 α 测试 | 小范围上架 | 🟡 |
| 移动端适配 | 响应式/PWA | 🟢 |
| 多语言 | 英/日等 | 🟢 |
| 社区工坊 | 玩家分享自创卡牌 | 🟢 |

---

## 🎯 当前聚焦 & 推荐顺序

```
Phase 1 核心框架 — 基本完成，准备部署验证：

┌── 部署验证 ──────┐
│ 本地 pnpm dev 跑通 │  ← 当前
│ 全部页面无报错     │
└───────┬───────────┘
        ▼
┌── 生产部署 ────────┐
│ 构建镜像 → 推送     │
│ K8s 部署 + DB 初始化 │
│ oauth2-proxy 接入   │
│ Python Agent 配置   │
└───────┬───────────┘
        ▼
┌── 验证优化 ────────┐
│ 习武场对接 AI Agent │
│ 比武场对接 duel-judge│
└────────────────────┘

部署后即达到「有完整循环的可玩 MVP」状态
```

---

## 📝 版本里程碑

| 版本 | 目标日期（预估） | 核心交付 |
|:---|:---:|:---|
| v0.1 | 当前 | 框架搭建完毕，AI Agent 就绪，可本地开发 |
| v0.2 | 部署后 | 生产环境部署，SSO 接入，习武+比武对接 AI |

---

## 🏗️ 技术债务清单

| 债务 | 严重度 | 位置 |
|:---|:---:|:---|
| `getAllPresetCards()` 返回类型与 `PresetCard[]` 不匹配，多处用 `as PresetCard[]` 硬转 | 🟡 | `CardsPage.tsx` / `DuelPage.tsx` |
| frontend/public/index.html 存有完整 JS 版本的实现（双份代码） | 🟡 | `apps/martial-hegemony/public/index.html` |
| 无 ESLint 和 Prettier 实际配置 | 🟡 | 根目录 |
| 无任何测试 | 🟡 | 全项目 |

### 🐳 Docker 构建已知问题

| 问题 | 说明 | 解决方式 |
|:---|:---|:---|
| **pnpm --shamefully-hoist** | pnpm 默认创建嵌套 node_modules（.pnpm store），导致 `npx vite`/`.bin/tsx` 找不到可执行文件 | 安装时加 `--shamefully-hoist` 展平 node_modules，或直接用绝对路径 `/app/apps/server/node_modules/.bin/tsx` |
| **pnpm-lock.yaml 缺失** | 项目无 lockfile，Dockerfile 中 `COPY pnpm-lock.yaml` 会导致构建失败 | 用 `COPY package.json` 替代，`pnpm install --no-frozen-lockfile` |
| **better-sqlite3 + node-gyp** | 需要 `python3 make g++` + `node-gyp` 编译原生模块 | 构建阶段用 `FROM node:20-alpine` + `RUN apk add pnpm python3 make g++ && npm install -g node-gyp` |

---

## ✅ 当前任务

> **Phase 1 已基本完成**，项目已在 school-of-one.panghuer.top 部署运行中。
> SSO 已接入，Python Agent 已接入 DeepSeek LLM 并正常运行。
>
> 后续可做：
>
> 1. **补充卡牌歌诀 verses 数据** — 给 136 张卡牌填充古风诗句
> 2. **起手式选择** — 比武场开局从四门派起手中选一个
> 3. **连招 UI 接入 combo-judge** — 选牌时显示连招匹配度
> 4. **本地 pnpm dev 开发环境搭建** — 方便本地调试
