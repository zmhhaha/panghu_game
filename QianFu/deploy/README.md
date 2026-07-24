# QianFu Kubernetes 部署

目标集群使用 ARM64 节点和内部镜像仓库 `arm-cluster-master:5000`。PostgreSQL 地址为 `postgres.data.svc.cluster.local:5432/appdb`，QianFu 仅使用独立的 `qianfu` schema。

## 构建镜像

在 QianFu 根目录执行：

```bash
chmod +x deploy/*.sh
./deploy/build-images.sh
```

也可通过 `REGISTRY` 和 `IMAGE_TAG` 覆盖仓库与标签。Web 镜像在构建时将 `/api` 代理目标固定为集群内的 `http://qianfu-server:3001`。

## Secret、OAuth 和 Cloudflare

这些资源不放在 QianFu 子项目中：

- `../../vault/inventory/qianfu-externalsecret.yaml`：从 Vault 同步数据库连接串。
- `../../oauth/k8s/game-proxy-configmap.yaml`、`game-proxy-deployment.yaml`：通过 `__TARGET_NAME__` 占位符生成 QianFu oauth2-proxy。
- `../../cloudflare-tunnel/operator/tunnel-routes.yaml`：`qianfu.panghuer.top` TunnelRoute。

QianFu 的 Secret 清单如下：

| 用途 | Vault 路径 | ESO 生成的 Kubernetes Secret | 使用者 |
|:---|:---|:---|:---|
| PostgreSQL 连接串 | `secret/data/postgres/app` | `qianfu/qianfu-database` | QianFu API、迁移 Job |
| Casdoor OAuth2 凭据 | `secret/data/oauth/oauth2-proxy` | `oauth/oauth2-proxy-secret` | 通用 `game-proxy` 模板 |

部署前先应用 QianFu namespace 和 `../../vault/inventory/qianfu-externalsecret.yaml`，等待 `qianfu-database` 生成。OAuth 使用现有 `oauth2-proxy-secret`，其来源由 `../../vault/inventory/oauth-externalsecret.yaml` 管理。QianFu 仓库不保存 Secret 值，也不需要手工执行 `kubectl create secret`。

## 迁移与部署

```bash
./deploy/deploy.sh
```

脚本会先执行可重复的数据库迁移，迁移成功后再发布两个无状态服务。查看状态：

```bash
kubectl get pods,svc,jobs -n qianfu
kubectl logs job/qianfu-db-migration -n qianfu
```

## OAuth2 与公网入口

Web 和 API Service 默认仅集群内可见。生成 QianFu OAuth 清单：

```bash
sed "s/__TARGET_NAME__/qianfu/g" ../../oauth/k8s/game-proxy-configmap.yaml | kubectl apply -f -
sed "s/__TARGET_NAME__/qianfu/g" ../../oauth/k8s/game-proxy-deployment.yaml | kubectl apply -f -
```

模板会将 upstream 指向 `ui.qianfu.svc.cluster.local:80`，该 Service 再转发到 QianFu Web 的 3000 端口。Cloudflare Tunnel 清单由共享目录管理。
