# 续页

一个纯文本的交互文学播放器。正文在固定阅读窗中逐字出现并连续向上滚动；玩家可以暂停、拖动到已经播放过的位置，或直接点击某个字句，从那里写入新正文。提交后，该位置之后的旧文本会被舍弃，并由大语言模型根据玩家写入的内容重新续写。

首次打开会先选择公共领域作品和改写规模。目前内置《西游记》、`Pride and Prejudice`、`Frankenstein`。改写规模会进入模型上下文：小范围保留主线，中等程度重排一段因果，大范围允许重塑主要命运。播放器的“声”按钮使用浏览器 `SpeechSynthesis` 朗读当前作品语言；没有可用声音时仍可继续逐字播放。

## 本地运行

项目只依赖 Python 3.10+ 标准库。

```powershell
Copy-Item .env.example .env
# 编辑 .env，填入 llm-service 的入口、模型别名和调用方令牌
python server.py
```

浏览器打开 `http://127.0.0.1:4173`。

## 模型配置

模型调用统一走集群内 `llm-service`，本服务不持有任何 provider 凭据。服务端以 SSE 流式调用它的
OpenAI-compatible `/chat/completions`；令牌不会发送到浏览器。接入规范见
[`llm-service/INTEGRATION.md`](../../llm-service/INTEGRATION.md)。

```ini
LLM_BASE_URL=http://llm-service.llm.svc.cluster.local/v1
LLM_MODEL=deepseek-guarded
LLM_SERVICE_TOKEN=your-caller-token
```

`LLM_MODEL` 是 `llm-service` 注册的**别名**，不是上游模型名 —— 填 `deepseek-v4-flash` 之类会被 400 拒掉。
玩家写入的续写文字是自由文本，所以走 `guarded` 档：该档禁 `tools` 与 `response_format`，
但服务端会分隔不可信内容并检测 canary 泄漏。

⚠️ **默认不设 `LLM_MAX_TOKENS`，这是有意的。** 上游是推理模型，输出分成 `reasoning_content`（思考）
和 `content`（正文）两路，预算不够时思考会把它吃光、正文一个字都出不来（`finish_reason: length`，
表现是「模型没有返回正文」）。实测同一条续写请求：

| `max_tokens` | 正文 | 思考 | 结果 |
|---|---|---|---|
| 1400 | **0 字** | 4017 字 | 被思考烧完，正文为空 |
| 不发送 | **1187 字** | 2893 字 | 正常收尾 |
| 2048（guarded 档上限） | 549 字 | 2917 字 | 能出字，但偏短 |

所以预算交给上游默认值。确实要设上限时取消 `.env` / ConfigMap 里的注释 —— 注意 `guarded` 档上限是 2048，
再高会被 400 拒掉。

本地想直连上游调试时，把 `LLM_BASE_URL` 指向任意 OpenAI-compatible 端点、`LLM_SERVICE_TOKEN`
填该端点的 API Key 即可 —— 代码里没有第二套 provider 分支。`LLM_SERVICE_TOKEN` 必须非空
（服务端以它判断「是否已配置」），对不需要密钥的本地端点随便填一个占位串。

## 验证

```powershell
python -m unittest discover -s tests -v
```

## OAuth2 / SSO and player isolation

XuYe supports the same trusted-proxy boundary as QianFu. Put oauth2-proxy in front of the service and pass the verified `X-Auth-Request-Sub` (preferred) or `X-Forwarded-User` header. The server prefixes the stable subject with `casdoor:` and uses it as the save owner. `/api/state` and `/api/continue` are user-scoped; they never accept a client-supplied user ID.

For production set `XUYE_AUTH_REQUIRED=true` and `XUYE_TRUST_PROXY_AUTH_HEADERS=true`. The Kubernetes Service must remain internal so users cannot forge these headers by bypassing oauth2-proxy. Set `DATABASE_URL` from the Kubernetes database Secret; the server uses PostgreSQL through `psycopg` and stores `reader_saves.user_id` as the authenticated owner. SQLite via `XUYE_DB_PATH` remains the local-development fallback.

## Kubernetes LLM configuration

Model calls go exclusively through the in-cluster `llm-service`; XuYe holds no provider credential of its own. `deploy/k8s/agent-configmap.yaml` defines `xuye-agent-config` with the non-secret half — `LLM_BASE_URL` and `LLM_MODEL`, plus an optional `LLM_MAX_TOKENS` (see below). `deploy/k8s/server.yaml` reads that ConfigMap and reads the caller token from the `llm-token` Secret in namespace `xuye`, which `vault/inventory/xuye-llm-token-externalsecret.yaml` renders from `secret/llm-service/callers`.

The Pod template carries the `llm-client: "true"` label because the `llm-service` NetworkPolicy admits only labelled Pods — omitting it surfaces as a timeout, not as a 401.

Build and apply the baseline manifests:

```bash
docker build -t arm-cluster-master:5000/xuye-server:latest .
docker push arm-cluster-master:5000/xuye-server:latest
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/agent-configmap.yaml
kubectl apply -f deploy/k8s/server.yaml
```

The Docker build uses the Aliyun PyPI mirror with retries because the ARM64 `psycopg[binary]` wheel is relatively large. If the mirror is unavailable in your cluster, replace `--index-url` in `Dockerfile` with your internal PyPI mirror.

Create `xuye-database` through the same Vault/ExternalSecret workflow used by QianFu, and let `deploy/deploy.sh` apply `xuye-llm-token-externalsecret.yaml` for the model token. Do not create plaintext LLM or database credentials in repository manifests. Put oauth2-proxy in front of `xuye-server`; do not expose the Service directly.

XuYe reuses the shared `../../oauth/k8s/game-proxy-configmap.yaml` and `game-proxy-deployment.yaml` templates unchanged. Its `ui` Service is an alias on port 80 that forwards to the XuYe server on port 4173, matching the upstream convention used by QianFu and the other game services. Vault ExternalSecrets are `../../vault/inventory/xuye-llm-token-externalsecret.yaml` and `xuye-externalsecret.yaml`. The Cloudflare route is in `../../cloudflare-tunnel/operator/tunnel-routes.yaml` as `xuye.panghuer.top`. Once the Cloudflare operator and External Secrets Operator are ready, run `bash deploy/deploy.sh`.

## Works catalog

The catalog is stored in `content/works.json`, with Chinese translations provided for foreign works. The server reads `/api/works` from the file on every request. Kubernetes mounts it as the `xuye-works` ConfigMap, so adding a work only requires updating that ConfigMap and refreshing the reader; no Pod restart or image rebuild is needed:

`/api/continue` takes only a `workId` and resolves the title, author and language from this same file — the client never supplies them. That keeps catalog values out of the system prompt, which the `llm-service` guard does not delimit (it only wraps the `user` role).

```bash
kubectl create configmap xuye-works -n xuye \
  --from-file=works.json=content/works.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

ConfigMap volume propagation can take about a minute. Reload the browser or reopen the library after it has updated.
