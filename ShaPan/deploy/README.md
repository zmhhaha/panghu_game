# ShaPan 部署

ShaPan 使用独立应用服务，只复用集群已有的 PostgreSQL、Vault/ESO、Casdoor OAuth、Cloudflare Tunnel 和私有镜像仓库。

## 前置条件

- Kubernetes、私有镜像仓库和 `ceph-rbd` 已可用。
- `ClusterSecretStore/vault-backend` 状态为 `Ready`。
- PostgreSQL 公共服务已经运行。
- Casdoor 中已创建 ShaPan OIDC 应用，回调地址为 `https://shapan.panghuer.top/oauth2/callback`。
- Vault 中存在 `secret/postgres/app` 的 `POSTGRES_PASSWORD`。

首次部署前，把模型配置写入 Vault。没有模型时可以只创建空的 `secret/shapan/agent`，Worker 会保持 fallback 模式：

```bash
kubectl exec -n vault vault-0 -- vault kv put secret/shapan/agent \
  PROVIDER=fallback
```

写入命令使用不带 `data/` 的 KV v2 路径；ExternalSecret 中的 `remoteRef.key` 才使用 `secret/data/...`。

## 发布顺序

```bash
cd panghu_game/ShaPan
REGISTRY=arm-cluster-master:5000 IMAGE_TAG=$(git rev-parse --short HEAD) ./deploy/build-images.sh
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/integrations/vault-externalsecret.yaml
kubectl apply -f deploy/integrations/oauth2-proxy.yaml
kubectl apply -f deploy/integrations/cloudflare-tunnelroute.yaml
IMAGE_TAG=$(git rev-parse --short HEAD) ./deploy/deploy.sh
```

`deploy.sh` 会先等待 `shapan-database`，运行 SQL migration，再滚动更新 API、Web、模拟器和 Agent Worker。实际部署时需要将 `deploy/k8s/*.yaml` 和 `migration-job.yaml` 中的镜像 tag 一起替换为同一个发布版本，避免迁移和应用版本不一致。

## 本地验证

没有 PostgreSQL 时可以启动开发内存模式：

```powershell
$env:NODE_ENV = "development"
npm install
npm run api
```

另一个终端可访问 `http://127.0.0.1:3001/api/health`。开发模式的用户为 `dev-user`，不能作为生产认证方案。

有 PostgreSQL 时设置 `DATABASE_URL`，先执行 `psql "$env:DATABASE_URL" -f server/migrations/001_initial.sql`，再启动 API 和 `npm run sim`。生产环境不允许内存模式。

## 当前边界

当前 Worker 已具备独立进程、数据库连接和健康推进骨架；Agent 任务解析和真实战斗结算仍在后续垂直切片中实现。静态前端尚未读取服务器状态，因此本阶段部署首先验证服务链路、登录、数据库隔离、命令 API、事件流和战局时间推进。
