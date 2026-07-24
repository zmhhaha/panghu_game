# 潜线（QianFu）

潜伏题材的单人、多 Agent 叙事游戏。当前实现是 `GAME_PLAN.md` 的 Phase 1 规则原型：规则引擎拥有权威状态，Agent 只在后续阶段提供意图和叙事。

## 工程结构

- `apps/web`：Next.js 前端，Tailwind CSS 与 shadcn/ui 风格基础组件。
- `apps/server`：Express API、OAuth2 代理身份接入和战役存储。
- `packages/core`：确定性的时间、行动、事件、结局与评分规则。
- `packages/content`：带版本的战役内容与引用校验。

## 本地开发

需要 Node.js 20+ 和 pnpm 9。仓库内的 `.runtime` 是可选的 Windows 便携运行时，已被 Git 忽略，不是部署依赖。

```powershell
pnpm install
pnpm dev
```

访问 `http://localhost:3000`，API 健康检查为 `http://localhost:3001/api/health`。非生产模式且没有代理身份头时，服务使用固定开发用户。未设置 `DATABASE_URL` 时使用内存存储，服务重启会清空战役。

常用检查：

```powershell
pnpm test
pnpm typecheck
pnpm build
```

## PostgreSQL

正式环境必须设置 `DATABASE_URL`。QianFu 不复用其他项目的数据表，在共享的 `appdb` 中使用独立的 `qianfu` schema。先在目标数据库执行迁移：

```powershell
psql $env:DATABASE_URL -f apps/server/migrations/001_initial.sql
```

API 连接池会自动设置 `search_path=qianfu,public`。迁移脚本可重复执行，不会修改其他 schema。

每次行动在一个数据库事务内完成：锁定战役、校验幂等键、运行规则引擎、追加事件、更新权威状态并保存快照。这样多个 API Pod 不会同时推进同一局时间。

## Kubernetes 约束

镜像构建和 Kubernetes 清单位于 `deploy/`：`deploy/docker/` 包含 Web/API 镜像，`deploy/k8s/` 包含迁移 Job、Deployment、Service，`deploy/build-images.sh` 与 `deploy/deploy.sh` 提供构建发布流程。Secret 由根目录的 `vault/inventory/` 管理，OAuth 和 Cloudflare 清单分别由 `oauth/`、`cloudflare-tunnel/` 管理。

生产流量路径为：

```text
Browser -> oauth2-proxy / Casdoor OIDC -> Next.js -> /api -> QianFu API -> PostgreSQL
```

- Web 与 API Pod 都应保持无状态，可独立扩容。
- API 必须设置 `NODE_ENV=production`、`DATABASE_URL` 和 `TRUST_PROXY_AUTH_HEADERS=true`。
- API Service 不应暴露公网；入口只能经 oauth2-proxy，代理必须清除客户端伪造的身份头。
- 数据库迁移应由单独 Job 或发布流水线执行，不能由每个 API Pod 启动时抢跑。
- PostgreSQL 连接串和 OAuth2 配置放在 Kubernetes Secret，不写入镜像或清单。
- `/api/health` 可作为存活探针；加入数据库就绪检查后再用于就绪探针。

当前 K8s 的服务名、命名空间、域名和镜像仓库尚未绑定，部署清单会在确认现有集群约定后补入。
