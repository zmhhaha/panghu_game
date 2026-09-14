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
| 模型令牌 Secret | `guanliao/llm-token` |

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

模型调用统一走集群内 `llm-service`，**GuanLiao 不持有任何 provider 凭据**：密钥、别名路由、重试与提示词劫持防护都由它负责。接入规范见 `llm-service/INTEGRATION.md`，这里只记 GuanLiao 自己的接线。GuanLiao 需要的是 `secret/llm-service/callers` 里属于自己那一个键：

```bash
kubectl exec -n vault vault-0 -- vault kv patch secret/llm-service/callers \
  LLM_TOKEN_GUANLIAO='<token>'
```

⚠️ 用 `kv patch` 而不是 `kv put` —— 这个路径下放着所有调用方的令牌，`put` 会把别人覆盖掉。

`vault/inventory/guanliao-llm-token-externalsecret.yaml` 用 `data` + `property` 只取这一个键，渲染成 `guanliao/llm-token` Secret 的 `LLM_SERVICE_TOKEN` —— Pod 拿不到别的调用方的令牌。llm-service 由变量名反推身份（`LLM_TOKEN_GUANLIAO` → `guanliao`），所以请求里不需要 `X-Caller`。

`deploy/k8s/agent-configmap.yaml` 只放非敏感的接线：走哪个入口（`LLM_BASE_URL`）、用哪个别名（`LLM_MODEL`）、超时（`LLM_TIMEOUT_MS`）。别名是 llm-service 注册的**别名**而不是上游模型名，改回 `deepseek-v4-flash` 之类会被 400 拒掉。玩家原批是自由文本，所以走 `deepseek-guarded` 档：禁 `tools` / `response_format`，但服务端会分隔不可信内容并检测 canary 泄漏。

⚠️ **`LLM_TIMEOUT_MS` 是 120000，别改小。** 批量路径（`propagate-batch`）一次要出 5 个字段 × 全部官员，实测整日批量 **35 秒以上**。原来设 20000 会在 llm-service 还在生成时就 abort —— 而 llm-service 那边仍然记 `200 OK`（它不知道客户端已经走了），所以只看服务端日志会误判成「一切正常」，实际玩家拿到的是主控的确定性兜底文本。两个日志要对着看：**拿 llm-service 的 `latency_ms` 和这里的超时值比。**

⚠️ **ConfigMap 里故意不设 `LLM_MAX_TOKENS`。** 上游是推理模型，输出分 `reasoning_content`（思考）和 `content`（正文）两路，预算不够时思考会把它吃光、正文为空。这里原来是 1000，实测每次 `completion_tokens` 都正好顶到 1000 —— 也就是每次都被截断，叙事 JSON 解析失败后静默退回主控给的确定性文本，**看起来能用，其实不是模型写的**。现在默认把预算交给上游；确实要设上限时把那个键加回来，注意 `guarded` 档上限是 2048。

Pod 模板带 `llm-client: "true"` 标签 —— llm-service 的 NetworkPolicy 只放行带此标签的 Pod，**缺了表现为超时而不是 401**，这是本迁移最容易踩的坑。

`LLM_BASE_URL` / `LLM_SERVICE_TOKEN` 缺失时应用进程不报错，只退回主控给出的确定性文本；标准 `deploy.sh` 会先等待并校验 `llm-token` Secret，避免声明启用模型却以 fallback 状态上线。

客户端会在玩家完成当天全部批示并退堂时，统一调用 `/api/agents/propagate-batch`。该接口把当天待处理的官员步骤放在一次编排请求中，服务端 Agent 对整批内容生成叙事；单条 `/api/agents/propagate` 仍保留用于兼容和调试。批量输出格式异常或模型超时时，整批自动回退为浏览器内置的确定性文本，不会阻塞推进日期。

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
