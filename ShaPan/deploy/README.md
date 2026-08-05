# ShaPan 部署

ShaPan 使用独立应用服务，只复用集群已有的 PostgreSQL、Vault/ESO、Casdoor OAuth、Cloudflare Tunnel 和私有镜像仓库。

## 前置条件

- Kubernetes、私有镜像仓库和 `ceph-rbd` 已可用。
- `ClusterSecretStore/vault-backend` 状态为 `Ready`。
- PostgreSQL 公共服务已经运行。
- Casdoor 现有游戏 OIDC 应用已加入回调地址 `https://shapan.panghuer.top/oauth2/callback`。
- Vault 中存在 `secret/postgres/app` 的 `POSTGRES_PASSWORD`。

ShaPan 不需要单独创建 PostgreSQL 数据库或用户：它复用 `appdb` / `appuser`，只在其中创建自己的 `shapan` schema。连接地址在集群内固定为 `postgres.data.svc.cluster.local:5432`。

密码建议使用 URL 安全字符（字母、数字、`-`、`_`）。当前 ExternalSecret 会把密码渲染进 PostgreSQL URL；如果密码含有 `@`、`:`、`/`、`#` 等字符，需要先 URL 编码，或者换成 URL 安全密码，否则 `pg` 无法解析连接串。

## 内网软件源

Dockerfile 默认使用以下来源：

- Node 基础镜像：`arm-cluster-master:5000/node:20-bookworm-slim`。
- Debian APT：`http://mirrors.ustc.edu.cn`，使用 Debian 仓库签名校验完成 CA 证书引导。
- npm：`https://registry.npmmirror.com`。

私有仓库首次还没有 Node 镜像时，在一台能够访问外部镜像源的机器上执行一次：

```bash
cd panghu_game/ShaPan
BASE_REGISTRY=arm-cluster-master:5000 ./deploy/mirror-base-images.sh
```

完全隔离的内网应将外部基础镜像离线导入私有仓库，并把软件源覆盖为局域网代理：

```bash
BASE_REGISTRY=arm-cluster-master:5000 \
APT_MIRROR=http://apt-mirror.infra.lan \
NPM_REGISTRY=http://npm.infra.lan \
IMAGE_TAG=$(git rev-parse --short HEAD) \
./deploy/build-images.sh
```

`APT_MIRROR` 应提供 `/debian` 与 `/debian-security` 路径。`NPM_REGISTRY` 应为 npm 兼容 registry。当前仓库没有记录你局域网内这两个服务的实际域名，因此不能在 Dockerfile 中臆造地址。

API 镜像会在第一次 `apt-get` 中显式安装 `ca-certificates`。不要通过 `Acquire::https::Verify-Peer=false` 绕过 TLS 校验；如果内网代理使用自签根证书，应将根证书加入基础镜像或通过受控构建上下文安装。

需要启用模型时，把供应商凭据写入 Vault，例如：

```bash
kubectl exec -n vault vault-0 -- vault kv put secret/shapan/agent \
  OPENAI_API_KEY="..." OPENAI_BASE_URL="https://api.openai.com/v1" OPENAI_MODEL="..."
```

写入命令使用不带 `data/` 的 KV v2 路径；ExternalSecret 中的 `remoteRef.key` 才使用 `secret/data/...`。未配置模型时无需创建该 Vault 路径，`shapan-config.PROVIDER=fallback` 会保留确定性降级模式。

## 发布顺序

```bash
cd panghu_game/ShaPan
REGISTRY=arm-cluster-master:5000 BASE_REGISTRY=arm-cluster-master:5000 IMAGE_TAG=$(git rev-parse --short HEAD) ./deploy/build-images.sh
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f ../../vault/inventory/shapan-externalsecret.yaml
kubectl apply -f ../../vault/inventory/shapan-agent-externalsecret.yaml
kubectl apply -f ../../vault/inventory/oauth-externalsecret.yaml
sed "s/__TARGET_NAME__/shapan/g" ../../oauth/k8s/game-proxy-configmap.yaml | kubectl apply -f -
sed "s/__TARGET_NAME__/shapan/g" ../../oauth/k8s/game-proxy-deployment.yaml | kubectl apply -f -
kubectl apply -f ../../cloudflare-tunnel/operator/tunnel-routes.yaml
IMAGE_TAG=$(git rev-parse --short HEAD) ./deploy/deploy.sh
```

`deploy.sh` 会先等待 `shapan-database`，用 `IMAGE_TAG` 对应的 API 镜像运行 SQL migration，再把同一版本设置到 API、Web、模拟器和 Agent Worker。不要对同一次发布分别使用不同 tag。

公共服务清单不属于 ShaPan 应用目录：Vault ExternalSecret 位于 `vault/inventory/`，OAuth2 Proxy 使用 `oauth/k8s/game-proxy-configmap.yaml` 与 `game-proxy-deployment.yaml` 公共模板，Cloudflare TunnelRoute 统一维护在 `cloudflare-tunnel/operator/tunnel-routes.yaml`。

## 本地验证

没有 PostgreSQL 时可以启动开发内存模式。先启动 API：

```powershell
$env:NODE_ENV = "development"
npm install
npm run api
```

再启动 Next Web：

```powershell
cd web
npm install
$env:API_INTERNAL_URL = "http://127.0.0.1:3188"
npm run dev
```

浏览器打开 `http://127.0.0.1:4190`，API 健康检查位于 `http://127.0.0.1:3188/api/health`。开发模式的用户为 `dev-user`，不能作为生产认证方案。

有 PostgreSQL 时设置 `DATABASE_URL`，先执行 `psql "$env:DATABASE_URL" -f server/migrations/001_initial.sql`，再启动 API 和 `npm run sim`。生产环境不允许内存模式。

## 当前运行模型

模拟 Worker 负责推进服务器战钟、释放按历史时间计划的战场报告、送达通信队列并创建 Agent 任务。Agent Worker 会优先调用 `deepseek` 或 `openai` 的 OpenAI-compatible Chat Completions 接口；没有对应密钥时自动使用确定性的 `fallback` 决策，不会阻塞战局。

军令送达、部队 Agent 回报、敌军 Agent 活动、目标进度和到期胜负均写入 `world_snapshots` / `world_events`。前端从 `/api/v1/games` 读取已有实例，使用 `/state` 恢复通信、军令和单位状态，并通过 SSE 接收后续事件。

模型 Agent 的输出只负责行动表达和局部状态建议，目标进度与胜负由服务端规则计算，避免模型直接决定战役结果。
