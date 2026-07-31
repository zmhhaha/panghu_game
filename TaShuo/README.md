# 它说（TaShuo）

多用户隔离的 Multi-Agent 信息调查游戏。每名登录用户在独立案件实例中阅读公开媒体、参与评论区讨论、整理证据并提交事实报告。

## 工程结构

- `apps/web`：Next.js 游戏界面。
- `apps/server`：Express API、独立认证实现、PostgreSQL 仓储与模型编排。
- `packages/core`：确定性世界状态、评论影响和评分规则。
- `packages/content`：两个带版本的案件内容包。

## 开发命令

```powershell
pnpm install
pnpm test
pnpm typecheck
pnpm dev
```

模型服务不提供 fallback。生产环境必须配置一个受支持的 Provider；模型失败时对应游戏实例保持原状态并等待重试。

开发模式未设置 `DATABASE_URL` 时使用进程内存存档，并以固定开发用户运行。生产模式必须配置 PostgreSQL、可信 oauth2-proxy 身份头、`COMMENT_CONFIRMATION_SECRET` 和一个模型 Provider；缺少任何必要配置时服务会拒绝启动。

环境变量模板见 `.env.example`，容器和 Kubernetes 部署步骤见 `deploy/README.md`。数据库迁移位于 `apps/server/migrations`，部署时必须先于 API 发布执行。
