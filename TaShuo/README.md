# 它说（TaShuo）

多用户隔离的 Multi-Agent 信息调查游戏。每名登录用户在独立事件实例中阅读公开媒体、参与评论区讨论、整理证据并提交事实报告。

## 设计与验收规格

- [游戏计划书 v0.6](GAME_PLAN.md)：公开追问、媒体稿件留存、三档游戏时间、公平评分及双剧本互动片段。
- [公共信息调查规格](docs/PUBLIC_INFORMATION_SPEC.md)：可验证的需求与场景。
- [实现与验收进度](docs/IMPLEMENTATION_STATUS.md)：本轮已实现能力、测试范围、迁移要求与剩余工作。
- [OpenSpec 服务](https://openspec.panghuer.top/)：项目 `armbianbegin`（`ec663f5a-53d3-4a0e-9037-933eb788d183`），变更 `enhance-tashuo-public-information-gameplay`，能力 `tashuo-public-information-gameplay`。

2026-10-22 已交付媒体与互动基础，并推进至报告评分：两个 `2.1.0` 事件包、受限知情的持久媒体成稿、连续公开追问、原任务重试、游戏时间控制，以及基于提交证据快照的六维评分、解析确认和逐项复盘。完整更正版本、风险与通知交互及真实模型体验验收仍按 OpenSpec 任务继续推进，详见实现进度。

游戏尚未上线，开发阶段只维护当前内容包，不提供旧测试存档兼容或迁移；内容版本不匹配时重新开始事件。

## 工程结构

- `apps/web`：Next.js 游戏界面。
- `apps/server`：Express API、独立认证实现、PostgreSQL 仓储与模型编排。
- `packages/core`：确定性世界状态、评论影响和评分规则。
- `packages/content`：两个带版本的事件内容包。

## 开发命令

```powershell
pnpm install
pnpm test
pnpm typecheck
pnpm dev
```

模型调用统一走集群内 `llm-service`，TaShuo 自己不持有 provider 凭据。模型服务不提供 fallback：生产环境必须配置 `LLM_BASE_URL`、`LLM_MODEL` 与 `LLM_SERVICE_TOKEN`；模型失败时暂停当前实例，保留已成功步骤与原输入，等待原任务重试，不提交半条评论或重复结算后果。

开发模式未设置 `DATABASE_URL` 时使用进程内存存档，并以固定开发用户运行。生产模式必须配置 PostgreSQL、可信 oauth2-proxy 身份头、`COMMENT_CONFIRMATION_SECRET` 和 llm-service 接入；缺少任何必要配置时服务会拒绝启动。

环境变量模板见 `.env.example`，容器和 Kubernetes 部署步骤见 `deploy/README.md`。数据库迁移位于 `apps/server/migrations`，部署时必须先于 API 发布执行。
