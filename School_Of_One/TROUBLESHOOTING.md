# School Of One — 问题排查记录

> **最后更新**：2026-07-20

## Express 反向代理问题

### 问题描述

前端的习武场、比武场、连招等页面，通过 `/api/ai/training/*`、`/api/ai/duel/*`、`/api/ai/combo/*` 等路径调用后端的 Express 反向代理时，POST 请求无法正常工作。浏览器返回：

```
Unexpected token '<', "<html> <h"... is not valid JSON
```

或

```
500 Internal Server Error — POST 请求超时/卡死
```

---

### 架构链路

```
浏览器
  → school-of-one.panghuer.top (Cloudflare Tunnel)
    → oauth2-proxy-school-of-one:4180 (SSO 认证)
      → ui-school-of-one:80 (Nginx)
        → proxy_pass /api/ → server-service:3001 (Express)
          → app.use("/api/ai/training") → createProxyMiddleware()
            → training-ground:8005 (Python FastAPI)
```

关键路径是 `Nginx → Express → createProxyMiddleware → Python Agent`。

---

### 排查过程

#### 阶段 1：Nginx 缺少 /api/ 代理

**现象**：浏览器返回 HTML 而非 JSON

**原因**：`frontend.Dockerfile` 构建的 Nginx 容器里 `default.conf` 只有 `try_files $uri /index.html`，没有 `location /api/ { proxy_pass ... }`。所有 `/api/` 请求被当作 SPA 路由返回 `index.html`。

**解决**：恢复 `deploy/docker/nginx.conf`，添加 `/api/` 代理。

#### 阶段 2：pathRewrite 路径不匹配

**现象**：`GET /api/ai/training/factions` → 404

**原因**：`http-proxy-middleware` v3 配合 `app.use("/api/ai/training", ...)` 时，Express 自动剥离匹配的前缀 `/api/ai/training`，转发到 target 的剩余路径是 `/factions`。而 `pathRewrite: { "^/api/ai/training": "/api/training" }` 在 `/factions` 上找不到匹配，所以没有 rewrite，最终请求 `training-ground:8005/factions` — 训练场 agent 返回 404。

**解决**：`pathRewrite` 改为匹配剩余路径：
- `{ "^/api/ai/training": "/api/training" }` → `(path) => "/api/training" + path`
- 或用对象写法 `{ "^/": "/api/training/" }`

#### 阶段 3：POST 请求 body 被 express.json() 消耗

**现象**：GET 请求正常返回，POST 请求卡死/超时，`training-ground` 日志显示请求被正确接收并处理（200 OK），但 response 没有返回给客户端。服务器日志出现 `[Error] request aborted`。

**根本原因**：Express 中间件注册顺序：

```javascript
app.use(express.json());                           // 第 18 行 ← 先注册
app.use("/api/ai/training", createProxyMiddleware({...}));  // 第 41 行 ← 后注册
```

`express.json()` 先消费了 POST 请求的 body 流。当 `http-proxy-middleware` 尝试转发时，body 流已空，代理等待 body 数据永远不会到达，导致连接挂起。

**解决**：把三个 proxy 中间件移到 `express.json()` 之前：

```javascript
app.use(cors());

// AI Agent 反向代理（必须在 express.json() 之前）
app.use("/api/ai/duel", createProxyMiddleware({...}));
app.use("/api/ai/combo", createProxyMiddleware({...}));
app.use("/api/ai/training", createProxyMiddleware({...}));

app.use(express.json());   // 后注册，不干扰代理
```

---

### 最终方案

最终 `apps/server/src/index.ts` 的中间件顺序为：

```
1. cors()
2. /api/ai/duel 代理
3. /api/ai/combo 代理
4. /api/ai/training 代理
5. express.json()
6. /api/health 路由
7. /api/v1/auth 路由
8. /api/v1/factions 路由
9. /api/v1/cards 路由
10. errorHandler
```

---

### 验证方法

部署后通过以下命令测试三个代理的 POST：

```bash
# 在 frontend pod 中执行
kubectl exec -n school-of-one deploy/frontend -- sh -c \
  'curl -s -m 15 -X POST http://server-service:3001/api/ai/training/start \
    -H "Content-Type: application/json" \
    -d "{\"factionId\":\"shaolin-temple\"}"'

# 期望返回: {"sessionId":"xxx","factionName":"少林寺","masterName":"达摩祖师","maxRounds":5}
```

---

## Python Agent ConfigMap 挂载问题

### 问题描述

training-ground Agent 的 Python 代码更新后，重启 Pod 但新代码未生效，ConfigMap 内容已更新但 Pod 内仍是旧文件。

### 现象

- `kubectl get configmap training-code -n school-of-one` 显示有新内容（含 MatchRequest）
- `kubectl exec` 进 Pod 查看 `/app/training_ground.py` 仍是旧版本（不含 MatchRequest，仍用 RoundRequest）
- ConfigMap 有 224 行，Pod 内只有 219 行

### 原因

training-ground 的 Deployment 使用 `subPath` 挂载 ConfigMap：

```yaml
volumeMounts:
- name: code
  mountPath: /app/training_ground.py
  subPath: training_ground.py
```

但 `judge/` 目录下的文件（`tasks.py`、`orchestrator.py` 等）**没有通过 ConfigMap 挂载进去**，Pod 使用的是 Docker 构建时打包进镜像的旧版本 Python 文件。

另外，ConfigMap key 不支持 `/` 字符，必须用 `.` 替代：
```
judge/__init__.py   → ❌ 错误
judge.__init__.py   → ✅ 正确
```

### 解决

修改 `k8s/deployment.yaml`，为每个 `judge/` 文件添加一个 volumeMount，使用独立的 `subPath`：

```yaml
volumeMounts:
- name: code
  mountPath: /app/training_ground.py
  subPath: training_ground.py
- name: judge-code
  mountPath: /app/judge/__init__.py
  subPath: judge.__init__.py
- name: judge-code
  mountPath: /app/judge/agents.py
  subPath: judge.agents.py
- name: judge-code
  mountPath: /app/judge/data.py
  subPath: judge.data.py
- name: judge-code
  mountPath: /app/judge/llm.py
  subPath: judge.llm.py
- name: judge-code
  mountPath: /app/judge/orchestrator.py
  subPath: judge.orchestrator.py
- name: judge-code
  mountPath: /app/judge/redis_client.py
  subPath: judge.redis_client.py
- name: judge-code
  mountPath: /app/judge/tasks.py
  subPath: judge.tasks.py
volumes:
- name: code
  configMap:
    name: training-code
    defaultMode: 0644
- name: judge-code
  configMap:
    name: training-code
    defaultMode: 0644
```

更新 ConfigMap 时用点号替代斜杠：
```bash
kubectl create configmap training-code -n school-of-one \
  --from-file=training_ground.py=./training_ground.py \
  --from-file=judge.__init__.py=./judge/__init__.py \
  --from-file=judge.agents.py=./judge/agents.py \
  --from-file=judge.data.py=./judge/data.py \
  --from-file=judge.llm.py=./judge/llm.py \
  --from-file=judge.orchestrator.py=./judge/orchestrator.py \
  --from-file=judge.redis_client.py=./judge/redis_client.py \
  --from-file=judge.tasks.py=./judge/tasks.py \
  -o yaml --dry-run=client | kubectl apply -f -
```

### 教训

1. **ConfigMap subPath 不会自动更新**：subPath 挂载的 Pod 需要彻底删除重建（`kubectl delete pod`）才能看到新内容，滚动重启有时不够
2. **ConfigMap key 命名限制**：只能包含字母、数字、`-`、`_`、`.`，不支持 `/`
3. **检查 Pod 内文件 vs ConfigMap**：`kubectl exec` 进 Pod 查看实际文件，不要只看 ConfigMap 内容

---

## 习武场后端 Bug

### 问题 1：KeyError: 'master_name'

**现象**：习武场多轮对话中，第一轮提交后报 `KeyError: 'master_name'`

**原因**：`judge/tasks.py` 中的 `TASK_FEEDBACK` prompt 模板包含 `{master_name}` 占位符，但 `build_feedback_user()` 函数的 `TASK_FEEDBACK.format()` 没有传入 `master_name` 参数。只有 `build_feedback_system()` 传入了 `master_name`。

**解决**：
1. 在 `TASK_FEEDBACK` 中将 `以 {master_name} 的身份` 改为 `以师父的身份`（不再需要 master_name）
2. 在 `build_feedback_user()` 函数签名中添加可选参数 `master_name: str = ""`
3. 在 `orchestrator.py` 中调用 `build_feedback_user()` 时传入 `master_name=session.master_name`

---

### 问题 2：POST /api/training/match 返回 422 (description required)

**现象**：点击"查看匹配结果"时，前端报 `[object Object]`

**原因**：`match` 端点复用了 `RoundRequest` schema（要求 `description` 字段），但前端只传了 `sessionId`，没有传 `description`。FastAPI 返回 422 校验错误，前端 catch 到 `[object Object]` 是因为错误消息被 `JSON.stringify` 了。

**解决**：
1. 新增 `MatchRequest` schema，`description` 设为可选（`Field("", min_length=0)`）
2. `match_result` 改用 `MatchRequest` 而非 `RoundRequest`
3. 前端 `finalMatch()` 的 catch 增加 `res.text()` 回退，避免 JSON 解析失败时显示 `[object Object]`

---

### 问题 3：所有大师都自称"老衲"

**现象**：无论选择少林、武当、北拳还是南拳，大师都用"老衲"自称

**原因**：`tasks.py` 中的 prompt 没有根据门派身份区分自称：达摩祖师（和尚）该用"老衲/贫僧"，张三丰（道士）该用"贫道/老道"，北拳南拳宗师（民间武师）该用"老夫/我"。

**解决**：在 `SYSTEM_FEEDBACK_TEMPLATE` 和 `TASK_FEEDBACK` 中添加身份对应的自称说明：
- 少林 → 老衲/贫僧
- 武当 → 贫道/老道
- 北拳/南拳 → 老夫/我

---

## key learn

1. **Express 中间件顺序决定行为**：`express.json()` 会消费请求 body，必须在代理中间件之后注册
2. **http-proxy-middleware v3 + app.use()**：Express 自动剥离匹配的前缀，`pathRewrite` 需要匹配**剥离后的路径**而非原始路径
3. **pathRewrite 可用函数**：用 `(path) => "/api/training" + path` 比正则对象更直观
4. **pnpm 嵌套 node_modules**：`node_modules/.bin/tsx` 不存在，tsx 在 `apps/server/node_modules/.bin/tsx` 下
5. **`app.use(express.json())` stream 消耗不可逆**：一旦 body 被解析，就无法再被其他中间件读取
6. **ConfigMap subPath 不会自动更新**：改 ConfigMap 后需要删 Pod 重建
7. **ConfigMap key 不支持 `/`**：用 `.` 替代
8. **FastAPI 校验错误处理**：前端 catch 时用 `res.text()` 而非 `res.json()` 做回退

---

## Phase 2 数据库接入问题

### 问题：Docker 镜像缺少依赖 / 路径不匹配

**现象**：部署新版 server 后 pod 反复 CrashLoopBackOff，日志报：
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'drizzle-orm'
```
或
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './pg' is not defined
```

**原因链**：
1. **`pnpm install` 未加 `--shamefully-hoist`**：pnpm 默认用嵌套 `.pnpm store`，导致 server 容器的 `node_modules` 下找不到 `drizzle-orm`（它被 hoist 到了根目录 `.pnpm` 里）
2. **`drizzle-orm/pg` 导出路径老版不兼容**：drizzle-orm 低版本（`^0.30`）没有 `drizzle-orm/pg` 这个导出路径，需要 `drizzle-orm/` 或 `drizzle-orm/node-postgres`
3. **重复的 `drizzle-kit` 条目**：package.json 的 devDependencies 里 `drizzle-kit` 出现了两次（`^0.30.0` 和 `^0.22.0`），导致安装混乱

**解决**：

1. **server.Dockerfile** 中 `pnpm install` 加 `--shamefully-hoist`：
   ```dockerfile
   RUN pnpm install --no-frozen-lockfile --shamefully-hoist
   ```
   同时去掉不再需要的 `python3 make g++ libuv-dev` 和 `node-gyp`（那是 `better-sqlite3` 原生编译用的，已换 `pg`）

2. **`db/index.ts`** 改用正确的导入路径：
   ```typescript
   import { drizzle } from "drizzle-orm/node-postgres";
   import { Pool } from "pg";
   ```

3. **`package.json`** 清理重复的 `drizzle-kit`，升级 `drizzle-orm` 到 `^0.36.0`、`drizzle-kit` 到 `^0.30.0`

### 验证方法

部署后检查 server pod 日志和 健康端点：
```bash
kubectl logs -n school-of-one deploy/server --tail=20
# 应无报错

kubectl exec -n school-of-one deploy/server -- \
  sh -c "wget -qO- http://localhost:3001/api/health"
# 应返回 {"status":"ok","game":"School of One"}

kubectl exec -n school-of-one deploy/server -- \
  sh -c "wget -qO- http://localhost:3001/api/v1/auth/me"
# 应返回用户信息（SSO 环境）或 {"id":"dev-user",...}
```
