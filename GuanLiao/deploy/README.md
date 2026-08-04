# GuanLiao Kubernetes 部署

此部署沿用同一 `panghu_game` 工程中 QianFu 的基础设施约定：ARM64 集群、内部镜像仓库 `arm-cluster-master:5000`、共享 PostgreSQL、Vault + External Secrets Operator、Casdoor + oauth2-proxy，以及 Cloudflare Tunnel Operator。GuanLiao 位于 `panghu_game/GuanLiao`；共享基础设施清单位于工程上一级的 `../../vault`、`../../oauth` 和 `../../cloudflare-tunnel`。

固定资源名：

| 用途 | 值 |
|:---|:---|
| Namespace | `guanliao` |
| 公网域名 | `guanliao.panghuer.top` |
| 应用 Deployment | `guanliao-server` |
| OAuth 上游 | `ui.guanliao.svc.cluster.local:80` |
| PostgreSQL schema | `guanliao` |
| 数据库 Secret | `guanliao/guanliao-database` |
| Agent Secret | `guanliao/guanliao-agent` |

## 前置条件

确认以下共享组件已经就绪：

```bash
kubectl get clustersecretstore vault-backend
kubectl get pods -n vault
kubectl get pods -n oauth
kubectl get svc postgres -n data
kubectl get tunnel main
```

Casdoor 使用现有 oauth2-proxy OIDC 客户端。该客户端的允许回调地址必须包含：

```text
https://guanliao.panghuer.top/oauth2/callback
```

oauth2-proxy 的共享凭据由 `../../vault/inventory/oauth-externalsecret.yaml` 管理，Vault 路径是 `secret/oauth/oauth2-proxy`。不要为 GuanLiao 复制 Cookie Secret，否则同域登录状态会不一致。

## Vault

数据库密码继续复用已有路径 `secret/postgres/app`。只在该路径尚不存在时写入：

```bash
kubectl exec -n vault vault-0 -- vault kv put secret/postgres/app \
  POSTGRES_PASSWORD='<postgres-password>'
```

Agent 凭据使用独立路径。默认 ConfigMap 选择 DeepSeek：

```bash
kubectl exec -n vault vault-0 -- vault kv put secret/guanliao/agent \
  DEEPSEEK_API_KEY='<api-key>' \
  DEEPSEEK_BASE_URL='https://api.deepseek.com' \
  DEEPSEEK_MODEL='deepseek-chat'
```

也可把 `deploy/k8s/agent-configmap.yaml` 的 `PROVIDER` 改为 `fallback`、`openai`、`anthropic` 或 `custom`，并在同一 Vault 路径写入对应的 `*_API_KEY`、`*_BASE_URL`、`*_MODEL` 字段。应用进程遇到无效 Provider 配置时会自动使用规则回退；标准 `deploy.sh` 则会先等待并校验 `guanliao-agent` Secret，避免声明启用模型却以 fallback 状态上线。

## 构建与发布

在 `GuanLiao` 目录执行：

```bash
chmod +x deploy/*.sh
./deploy/build-images.sh
./deploy/deploy.sh
```

通过环境变量覆盖镜像仓库和标签：

```bash
REGISTRY=arm-cluster-master:5000 IMAGE_TAG=2026-08-04 ./deploy/build-images.sh
REGISTRY=arm-cluster-master:5000 IMAGE_TAG=2026-08-04 ./deploy/deploy.sh
```

`deploy.sh` 会依次创建 namespace、同步 Vault Secret、生成 GuanLiao 专用 oauth2-proxy 清单、应用 Cloudflare 路由、执行幂等数据库迁移，最后滚动发布两个应用副本。迁移成功前不会更新服务。

## 验证

```bash
kubectl get pods,svc,jobs,externalsecret -n guanliao
kubectl logs job/guanliao-db-migration -n guanliao
kubectl logs deployment/guanliao-server -n guanliao --tail=100
kubectl get deployment,svc -n oauth -l app=oauth2-proxy-guanliao
curl -I https://guanliao.panghuer.top
```

未登录时公网请求应由 oauth2-proxy 重定向至 Casdoor；登录后 `/api/ready` 返回 `{"status":"ready"}`。应用 Service 只在集群内暴露，生产环境的身份头只应由 oauth2-proxy 注入，不要给 `guanliao-server` 或 `ui` 增加公网 LoadBalancer/NodePort。
