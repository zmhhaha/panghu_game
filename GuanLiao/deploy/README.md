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

退堂下行批次和每条办结链各自共用 60 秒服务端预算（包含排队、生成和最多一次修复）。`LLM_TIMEOUT_MS=120000` 只是单次调用上限，实际同时受剩余总预算限制。浏览器超时 75 秒并覆盖响应体读取；部署脚本为 GuanLiao 的 oauth2-proxy 上游明确设置 `timeout: 80s` 并重启代理。Cloudflare 的线上超时仍需部署后核对，不能只看 llm-service 的 200 状态判断玩家是否收到模型结果。

⚠️ **ConfigMap 里故意不设 `LLM_MAX_TOKENS`。** 上游是推理模型，输出分 `reasoning_content`（思考）和 `content`（正文）两路，预算不够时思考会把它吃光、正文为空。这里原来是 1000，实测每次 `completion_tokens` 都正好顶到 1000 —— 也就是每次都被截断，叙事 JSON 解析失败后静默退回主控给的确定性文本，**看起来能用，其实不是模型写的**。现在默认把预算交给上游；确实要设上限时把那个键加回来，注意 `guarded` 档上限是 2048。

Pod 模板带 `llm-client: "true"` 标签 —— llm-service 的 NetworkPolicy 只放行带此标签的 Pod，**缺了表现为超时而不是 401**，这是本迁移最容易踩的坑。

`LLM_BASE_URL` / `LLM_SERVICE_TOKEN` 缺失时应用进程不报错，只退回主控给出的确定性文本；标准 `deploy.sh` 会先等待并校验 `llm-token` Secret，避免声明启用模型却以 fallback 状态上线。

客户端在当天全部批示完成后退堂，调用一次 `/api/agents/propagate-batch`（protocolVersion 2）。服务端按依赖选择就绪步骤，每块最多两条不同政令；同一政令后级等待前级最终 forwardedText，包含前级失败时的兜底文书。模型结果按 stepId 校验、重排，并返回逐步骤 model/fallback 来源。某块失败只回退该块，截止时保留已完成结果。旧版请求仍走兼容整批路径，无法修复其缺失的依赖信息，因此发布后应确认浏览器加载新版静态资源。

所有下行、办结和修复请求共用进程调度器；配置如下：

| 参数 | 默认值 | 范围 |
| --- | --- | --- |
| LLM_PROPAGATION_CHUNK_SIZE | 2 | 1..4 |
| LLM_CONCURRENCY | 2 | 1..3 |
| LLM_QUEUE_MAX | 32 | 1..128 |
| LLM_QUEUE_WAIT_MS | 10000 | 1000..30000 |
| LLM_BATCH_DEADLINE_MS | 60000 | 10000..65000 |

总截止时间上限 65 秒，为固定 75 秒浏览器超时保留余量。非整数/空值回默认，整数越界取边界。当前两副本稳态最多 4 个模型请求；maxSurge=1 发布期间最多 6 个，不是集群全局硬配额。队列按批次轮转，有等待与长度限制。429、网络错误直接降级，不自动重试整个批次；JSON/schema 修复最多一次且重新排队，避免多层重试放大调用量。llm-service 的调用方 RPM 配额依然有效。

办结链内部从末级向上串行，多条链可并发。浏览器先固定顺序决定权威结果，等待叙事后按同样顺序提交数值和结局。下行与办结是两个阶段，完整退堂可能超过单个 60 秒预算。

查看日志中的 batch、phase、queue_ms、call_ms、elapsed_ms、fallback_count 和 repair；浏览器控制台记录 end_day_ms。模型 token 成本与 429/5xx 从 llm-service 对照读取。评估必须同时比较完整退堂 p50/p95、模型成功比例和成本，不能把快速兜底作为加速证据。

部署后在服务器运行 `npm test`，并验证：同批相邻官员的 receivedText 等于前级最终 forwardedText；多客户端与办结同时执行仍遵守上限；截止保留成功步骤；连续退堂没有单条批示触发 LLM；不同网络完成顺序不改变结局。测试用例已准备，本地仅作类型与语法检查。

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
