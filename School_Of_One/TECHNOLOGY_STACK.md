# School Of One — 自成一派

## 项目总览

**School Of One**（自成一派）是一款以中华武术为题材的卡牌游戏项目。玩家通过选择师门、构建卡组、描述招式、对决判定等方式体验武侠世界的切磋较量。

项目采用 **monorepo** 架构，包含 **TypeScript** 前端应用、**TypeScript** 后端 API 服务、**Python FastAPI** AI 微服务三大技术栈。

---

## 整体架构

```
用户浏览器
    │
    ▼
Nginx（前端静态服务器）
    │
    ├── /api/* ──────► Express 后端 (port 3001)
    │                     ├── /api/v1/*       → 自有路由 (card/faction/auth)
    │                     ├── /api/ai/duel/*   → 对决判定 Agent (Python)
    │                     ├── /api/ai/combo/*  → 连招判定 Agent (Python)
    │                     └── /api/ai/training/* → 习武场 Agent (Python)
    │
    └── / ───────────► React SPA（Vite 构建）
```

---

## 技术栈

### 前端

| 技术 | 用途 | 版本 |
|------|------|------|
| **React** | 前端框架 | ^18.3.0 |
| **TypeScript** | 类型系统 | ^5.5.0 |
| **Vite** | 构建工具 | ^5.4.0 |
| **React Router** | 客户端路由 | ^6.25.0 |
| **pnpm** | 包管理器（workspace）| latest |

**前端页面路由：**

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | HomePage | 首页 |
| `/factions` | FactionsPage | 师门浏览 |
| `/cards` | CardsPage | 卡牌图鉴 |
| `/training` | TrainingGroundPage | 习武场（连接 AI Agent） |
| `/deck` | DeckBuilderPage | 演武场（卡组编辑） |
| `/duel` | DuelPage | 比武场（对决） |

### 后端（TypeScript）

| 技术 | 用途 | 版本 |
|------|------|------|
| **Express** | Web 框架 | ^4.19.0 |
| **http-proxy-middleware** | 反向代理 AI Agent | ^3.0.0 |
| **Drizzle ORM** | 数据库 ORM | ^0.30.0 |
| **better-sqlite3** | 嵌入式数据库 | ^11.0.0 |
| **jsonwebtoken** | JWT 认证 | ^9.0.2 |
| **Zod** | 输入验证 | ^3.23.0 |
| **tsx** | TypeScript 开发热重载 | ^4.15.0 |

**后端 API 路由：**

| 端点 | 说明 | 状态 |
|------|------|------|
| `GET /api/health` | 健康检查 | ✅ |
| `POST /api/v1/auth/register` | 用户注册 | 🚧 存根 |
| `POST /api/v1/auth/login` | 用户登录 | 🚧 存根 |
| `GET /api/v1/factions` | 门派列表 | ✅ |
| `GET /api/v1/factions/:id` | 门派详情 | ✅ |
| `GET /api/v1/cards/preset` | 卡牌列表（含过滤） | ✅ |
| `GET /api/v1/cards/preset/:id` | 卡牌详情 | ✅ |
| `GET /api/ai/duel/judge` | → 转发到 duel-judge | ✅ |
| `GET /api/ai/combo/judge` | → 转发到 combo-judge | ✅ |
| `GET /api/ai/training/*` | → 转发到 training-ground | ✅ |

### AI Agent（Python FastAPI）

三个独立的 AI 微服务，均使用 Python FastAPI 构建，通过 LLM（默认 DeepSeek）提供语义理解能力。

| Agent | 端口 | 功能 | 技术特色 |
|-------|------|------|----------|
| **duel-judge** | 8003 | 对战双方动作判定 | 3 Agent 流水线：招式分析→对决仲裁→战况叙述 |
| **combo-judge** | 8004 | 连招衔接可行性判定 | 单一 Agent，多维度身体力学分析 |
| **training-ground** | 8005 | 门派大师指导习武 | 多轮对话 + Redis session 存储 + 卡牌语义匹配 |

**核心技术：**

| 技术 | 用途 |
|------|------|
| **FastAPI** | Web 框架 |
| **OpenAI Python SDK** | 兼容 DeepSeek / OpenAI / Anthropic 等多种 LLM |
| **httpx** | Python 异步 HTTP 客户端 |
| **Redis** | training-ground session 存储 |
| **LLM Provider 抽象** | 环境变量 `PROVIDER` 切换模型提供商 |

**LLM 配置方式：**

```bash
PROVIDER=deepseek  # 默认，也可切换 openai / anthropic / custom
```

### 共享包（TypeScript Workspace）

| 包名 | 路径 | 说明 |
|------|------|------|
| `@school-of-one/core` | `packages/core/` | 核心类型定义 + 卡牌数据 + 校验逻辑 |
| `@school-of-one/ui-core` | `packages/ui-core/` | 共享 UI 组件（卡牌渲染、角色图） |
| `@school-of-one/api-client` | `packages/api-client/` | API 客户端（当前为存根） |

---

## 核心游戏数据

### 四大门派

| 门派 | 风格 | 子分支 | 掌门大师 |
|------|------|--------|----------|
| **少林寺** | 全面均衡 | 少林拳、罗汉拳、五形拳 | 玄慈大师 |
| **武当派** | 以柔克刚 | 太极拳、八卦掌、形意拳 | 冲虚道长 |
| **北派** | 刚猛爆裂 | 八极拳、通背拳、翻子拳、戳脚、螳螂拳、迷踪拳 | 北派宗师 |
| **南派** | 灵巧短打 | 咏春拳、洪拳、蔡李佛 | 南派宗师 |

### 卡牌系统

- 预设卡牌：约 136 张，分布于 4 大门派 15 个子分支
- 每张卡牌包含：名称、描述、位移值、关键词列表
- **位移值**驱动战斗系统：代表招式使出后双方的相对距离变化
- `keywords` 数组供 AI 语义匹配使用

### 战斗系统

- 双方各有 **10 颗心**（生命值）
- **距离值**（0-5m）决定招式是否可用
- 出牌规则：`distance ≥ card.displacement` 才能出牌
- 摔倒规则：双方位移叠加超过当前距离 → `distance < 0` → 双方相撞摔倒在地，下一回合重置为 1m
- 每回合随机判定 **命中 / 格挡**

---

## 项目结构

```
School_Of_One/
├── apps/                          # 应用
│   ├── martial-hegemony/          # React 前端 SPA
│   │   ├── src/pages/             # 6 个页面组件
│   │   └── vite.config.ts         # Vite 配置
│   ├── server/                    # Express 后端 API
│   │   └── src/
│   │       ├── routes/            # factions / cards / auth
│   │       └── middleware/        # 错误处理
│   ├── agents/                     # AI Agent（Python）
│   │   ├── duel-judge/             # 对决判定 Agent
│   │   ├── combo-judge/            # 连招判定 Agent
│   │   └── training-ground/        # 习武场 Agent
│   └── duel-on-mount-hua/          # 第二游戏版本（存根）
├── packages/                      # 共享包
│   ├── core/                      # 类型 + 数据 + 校验
│   │   └── src/data/              # 卡牌数据 + 门派数据
│   ├── ui-core/                   # UI 组件库
│   └── api-client/                # API 客户端（存根）
├── deploy/                        # 部署配置
│   ├── docker/                    # Dockerfile（frontend / server）
│   ├── k8s/                       # K8s YAML（6 个服务）
│   └── README.md                  # 部署文档
├── assets/                        # 图片资源
├── 参考素材/                       # 设计素材
├── game_name_design.md            # 游戏名设计文档
├── package.json                   # 顶层 monorepo 配置
├── pnpm-workspace.yaml            # pnpm workspace 声明
└── tsconfig.base.json             # 共享 TypeScript 配置
```

---

## 部署架构

采用 **Kubernetes** 部署：

```
K8s Namespace: school-of-one

┌─────────────┐   ┌──────────────┐
│  frontend   │   │    server    │
│  (nginx:80) │   │ (Express:3001)│
└──────┬──────┘   └──────┬───────┘
       │                 │
       └─────────────────┤
                         │
          ┌──────────────┼──────────────┐
          │              │              │
     ┌────▼────┐  ┌─────▼─────┐  ┌─────▼──────┐
     │duel-judge│  │combo-judge│  │training-gr.│
     │ :8003   │  │  :8004    │  │  :8005     │
     └─────────┘  └───────────┘  │ (Redis)    │
                                  └────────────┘
```

**Ingress 统一路由：**

| 路径前缀 | 后端服务 |
|----------|----------|
| `/` | frontend-service:80 |
| `/api/v1` | server-service:3001 |
| `/api/ai/duel` | duel-judge:8003 |
| `/api/ai/combo` | combo-judge:8004 |
| `/api/ai/training` | training-ground:8005 |

---

## 开发模式

```bash
# 安装依赖（根目录）
pnpm install

# 启动后端 server（端口 3001）
cd apps/server && pnpm dev

# 启动前端（端口 5173，自动代理 /api → localhost:3001）
cd apps/martial-hegemony && pnpm dev

# 启动 AI Agent（需要设置 DEEPSEEK_API_KEY）
cd apps/agents/duel-judge && python duel_judge.py          # 端口 8003
cd apps/agents/combo-judge && python combo_judge.py        # 端口 8004
cd apps/agents/training-ground && python training_ground.py  # 端口 8005
```

---

## 技术决策说明

1. **双语言架构**：TypeScript 处理核心游戏逻辑和前端交互，Python 处理 AI/LLM 相关任务。两个技术栈各取所长。
2. **独立 AI Agent**：每个 Agent 是独立 FastAPI 服务，独立部署扩缩容，不影响核心游戏服务。
3. **LLM Provider 抽象**：通过 `PROVIDER` 环境变量切换 DeepSeek/OpenAI/Anthropic，不绑定单一厂商。
4. **习武场 Redis 存储**：training-ground 使用 Redis 存储多轮会话，支持多 Pod 部署。
5. **pnpm workspace**：共享包（core / ui-core / api-client）与前端统一版本管理。
