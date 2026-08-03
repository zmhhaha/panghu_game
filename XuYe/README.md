# 续页

一个纯文本的交互文学播放器。正文在固定阅读窗中逐字出现并连续向上滚动；玩家可以暂停、拖动到已经播放过的位置，或直接点击某个字句，从那里写入新正文。提交后，该位置之后的旧文本会被舍弃，并由大语言模型根据玩家写入的内容重新续写。

首次打开会先选择公共领域作品和改写规模。目前内置《西游记》、`Pride and Prejudice`、`Frankenstein`。改写规模会进入模型上下文：小范围保留主线，中等程度重排一段因果，大范围允许重塑主要命运。播放器的“声”按钮使用浏览器 `SpeechSynthesis` 朗读当前作品语言；没有可用声音时仍可继续逐字播放。

## 本地运行

项目只依赖 Python 3.10+ 标准库。

```powershell
Copy-Item .env.example .env
# 编辑 .env，填入模型地址、模型名和 API Key
python server.py
```

浏览器打开 `http://127.0.0.1:4173`。

## 模型配置

服务端调用 OpenAI-compatible `/chat/completions` 流式接口。API Key 不会发送到浏览器。

DeepSeek：

```ini
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=your-key
LLM_MODEL=deepseek-chat
```

OpenAI：

```ini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
```

本地 Ollama：

```ini
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_API_KEY=
LLM_MODEL=qwen3:8b
```

## 验证

```powershell
python -m unittest discover -s tests -v
```

## OAuth2 / SSO and player isolation

XuYe supports the same trusted-proxy boundary as QianFu. Put oauth2-proxy in front of the service and pass the verified `X-Auth-Request-Sub` (preferred) or `X-Forwarded-User` header. The server prefixes the stable subject with `casdoor:` and uses it as the save owner. `/api/state` and `/api/continue` are user-scoped; they never accept a client-supplied user ID.

For production set `XUYE_AUTH_REQUIRED=true` and `XUYE_TRUST_PROXY_AUTH_HEADERS=true`. The Kubernetes Service must remain internal so users cannot forge these headers by bypassing oauth2-proxy. Set `DATABASE_URL` from the Kubernetes database Secret; the server uses PostgreSQL through `psycopg` and stores `reader_saves.user_id` as the authenticated owner. SQLite via `XUYE_DB_PATH` remains the local-development fallback.

## Kubernetes LLM configuration

XuYe follows QianFu's provider selection model but uses its own namespace resources. `deploy/k8s/agent-configmap.yaml` defines `xuye-agent-config` with a `PROVIDER` value of `openai`, `deepseek`, or `custom`. `deploy/k8s/server.yaml` reads that ConfigMap and reads matching credentials from the `xuye-agent` Secret in namespace `xuye`.

Build and apply the baseline manifests:

```bash
docker build -t arm-cluster-master:5000/xuye-server:latest .
docker push arm-cluster-master:5000/xuye-server:latest
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/agent-configmap.yaml
kubectl apply -f deploy/k8s/server.yaml
```

The Docker build uses the Aliyun PyPI mirror with retries because the ARM64 `psycopg[binary]` wheel is relatively large. If the mirror is unavailable in your cluster, replace `--index-url` in `Dockerfile` with your internal PyPI mirror.

Create `xuye-database` and `xuye-agent` through the same Vault/ExternalSecret workflow used by QianFu. Do not create plaintext LLM or database credentials in repository manifests. Put oauth2-proxy in front of `xuye-server`; do not expose the Service directly.

XuYe reuses the shared `../../oauth/k8s/game-proxy-configmap.yaml` and `game-proxy-deployment.yaml` templates unchanged. Its `ui` Service is an alias on port 80 that forwards to the XuYe server on port 4173, matching the upstream convention used by QianFu and the other game services. Vault ExternalSecrets are `../../vault/inventory/xuye-agent-externalsecret.yaml` and `xuye-externalsecret.yaml`. The Cloudflare route is in `../../cloudflare-tunnel/operator/tunnel-routes.yaml` as `xuye.panghuer.top`. Once the Cloudflare operator and External Secrets Operator are ready, run `bash deploy/deploy.sh`.

## Works catalog

The catalog is stored in `content/works.json`, with Chinese translations provided for foreign works. The server reads `/api/works` from the file on every request. Kubernetes mounts it as the `xuye-works` ConfigMap, so adding a work only requires updating that ConfigMap and refreshing the reader; no Pod restart or image rebuild is needed:

```bash
kubectl create configmap xuye-works -n xuye \
  --from-file=works.json=content/works.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

ConfigMap volume propagation can take about a minute. Reload the browser or reopen the library after it has updated.
