# School Of One — 问题排查记录

> **最后更新**：2026-07-22

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

---

## Phase 3 综合问题

### 问题 1：Python / TypeScript 卡牌数据不同步

**现象**：习武场 AI Agent 返回的 `finalCardId`（如 `lan_que_wei`）在前端 `getAllPresetCards()` 中找不到，`matchedCard` 为 null，导致卡牌不展示且不执行 unlock。

**根本原因**：`apps/agents/training-ground/judge/data.py` 是硬编码的**独立副本**，与 `packages/core/src/data/` 下的 TypeScript 卡牌数据长期不同步。Python 多了 21 张已在 TS 中删除的卡牌，且卡牌命名/ID 不一致。

**解决**（方案 B — HTTP 同步）：
- `data.py` 改为启动时从 Server 的 `GET /api/v1/factions` 和 `GET /api/v1/cards/preset` 拉取数据
- 使用 Python 内置 `urllib` 替代 `requests`，不额外增加依赖
- 所有原有 API（`get_factions()`、`get_cards_by_substyle()` 等）签名不变
- FastAPI `startup` event 中调用 `data.reload()` 预加载

```python
SERVER_URL = os.getenv("SERVER_URL", "http://server-service:3001")

def _load():
    factions_data = _http_get(f"{SERVER_URL}/api/v1/factions")
    FACTIONS = factions_data["factions"]
    card_data = _http_get(f"{SERVER_URL}/api/v1/cards/preset")
    PRESET_CARDS = card_data["cards"]
```

**教训**：AI Agent 和 Server 之间的共享数据必须有一个唯一数据源，Python 侧不应维护硬编码副本。

---

### 问题 2：LLM 瞎编不存在的卡牌 ID

**现象**：即使数据同步了，LLM 返回的 `finalCardId` 仍是 `lan_que_wei` 等不存在的 ID。

**根本原因**：两个地方缺少卡牌 ID 信息：
1. **每轮匹配 prompt**（`_build_substyle_info`）：只传了卡牌名称（`罗汉连环掌`），没有传 ID
2. **最终匹配 prompt**（`TASK_FINAL_MATCH`）：完全没有卡牌目录，LLM 只能自己编造

**解决**：
- `_build_substyle_info()`：名称改为 `罗汉连环掌(id=luohan-1)` 的格式
- `finalize_match()` 新增 `_build_card_catalog()`：传完整的子分支→卡牌列表（含真实 ID）
- `TASK_FINAL_MATCH` 添加 `{card_catalog}` 占位符，明确要求 LLM 必须使用列表中的真实 ID

---

### 问题 3：combo-cache 在 express.json() 之前注册导致 Server 崩溃

**现象**：浏览器 5 个 `combo/judge` 全部返回 502，combo-judge 日志只有 health check 没有任何 POST 请求。Nginx 日志报 `upstream prematurely closed connection` / `Connection reset by peer`。

**根本原因**：Server 中间件顺序：
```javascript
app.use("/api/ai/combo", ...);   // combo-cache 在这里，访问 req.body
app.use(express.json());         // body 解析在后面
```

`comboCacheRouter` 的 `handler` 里 `const { moveA, moveB } = req.body` 在 `req.body` 为 `undefined` 时引发 `TypeError` → Server 进程崩溃。

**解决**：在 `index.ts` 中给 combo-cache 路由单独加 `express.json()`：
```javascript
if (req.method === "POST" && req.path === "/judge") {
  return express.json()(req, res, () => comboCacheRouter(req, res, next));
}
```

**教训**：所有访问 `req.body` 的中间件都需要确保 `express.json()` 在前面。AI Agent 代理（forward-only）不需要 body 解析，所以放在前面是 OK 的，但 combo-cache 是个特例。

---

### 问题 4：combo/judge 请求被 oauth2-proxy 拦截返回登录页

**现象**：Network 标签页看到 combo/judge 请求响应是 oauth2-proxy 的登录 HTML 页面。

**根本原因**：`api-client` 的 `request()` 函数中 `fetch()` 默认不带 cookie（`credentials: "same-origin"`）。当请求并发发送时，某些请求的 cookie 可能未正确携带，导致 oauth2-proxy 认为是未认证请求。

**解决**：`api-client/src/index.ts` 中的 `fetch()` 调用添加 `credentials: "include"`：
```typescript
const res = await fetch(url, {
  method,
  headers: config.headers,
  body: body ? JSON.stringify(body) : undefined,
  credentials: "include",  // ← 添加
  signal: opts?.signal,
});
```

---

### 问题 5：最终匹配不达标（confidence < 0.7）也给卡牌

**现象**：5 轮对话都没有超过 70% 匹配度，点"查看匹配结果"仍然获得了卡牌和解锁。

**根本原因**：`finalize_match()` 无条件接受 LLM 返回的任何卡牌，无 confidence 门槛。

**解决**：
- `finalize_match()` 在 `final_confidence < 0.7` 时清空 `final_card_id`/`final_card_name`，设置 `matched: False`
- `MatchResponse` 新增 `matched: bool` 字段
- Server `complete` 端点根据 `match.matched` 决定是否写入 `userCards`
- 前端 `TrainingGroundPage` 根据 `result.matched` 显示"少侠请重新修炼再来！"

**匹配逻辑**：
```
每轮 confidence > 0.7 → 自动标记 completed（原有逻辑，不变）
满 5 轮点击查看结果 → LLM 重新分析全部对话
  → confidence >= 0.7 → 给卡牌，写入 DB，解锁
  → confidence < 0.7 → 不给卡牌，只记录习武历史
```

---

### 问题 6：生产环境 Ingress 直接路由 AI Agent 绕过 Server

**现象**：`deploy/k8s/ingress.yaml` 配置了多个 path 分别路由到不同后端：
```yaml
/api/ai/combo   → combo-judge:8004
/api/ai/duel    → duel-judge:8003
/api/ai/training → training-ground:8005
```

而 Ingress 有 `rewrite-target: /` 注解，会把所有路径前缀吞掉。`POST /api/ai/combo/judge` → Ingress rewrite → `POST /` → combo-judge 收到路径不匹配 → 502。

**当前状态**：生产流量实际走的是 `Cloudflare Tunnel → oauth2-proxy → Nginx → server-service`，完全**不经过 Ingress**，因此该问题未在生产环境出现。Ingress 文件仅作为参考。如需将来启用 Ingress，需将所有 `/api/` 路由统一指向 `server-service`。

---

## 以武会友房间（服端内存存储）跨 Pod 问题（2026-07-22 修复）

### 问题描述

点击「以武会友」→「创建房间」创建成功后，朋友输入房间码加入时却提示「房间不存在或已结束」。直接在浏览器 Network 中可以看到 `/room/lookup` 返回 404。

### 架构链路

```
创建房间请求 → nginx → server pod A → rooms.set(id, room)  ✅
查询房间请求 → nginx → server pod B → rooms.get(id) → undefined ❌
```

`deploy/k8s/server.yaml` 配置了 `replicas: 2`，两个 server pod 共享 nginx 轮询。

### 根因

`duels.ts` 中的房间存储使用**进程内存**：

```typescript
const rooms = new Map<string, DuelRoom>();
```

Pod A 创建的房间，Pod B 看不到。两个 pod 各有各的 `rooms` Map。

### 修复

临时方案：缩容到 1 个 pod，保证所有请求落到同一进程。

```bash
kubectl scale -n school-of-one deployment/server --replicas=1
```

长期方案：把房间存储搬到 Redis（复用已有的 `redis-secret`），与习武场 session 持久化走同一套基础设施。

### 教训

1. **进程内存状态在多副本下不共享**：任何用 `new Map()` / 内存变量存的状态，多副本部署时都会出问题
2. **Server replica 数与状态存储方式要匹配**：有状态的服务要么 1 副本，要么用外部存储（Redis/DB）
3. **日志排查方法**：`kubectl logs -n school-of-one deploy/server` 会随机选一个 pod，看不出是哪个 pod 处理的请求；需要用 `kubectl logs -n school-of-one -l app=server --tail=20 --prefix=true` 同时看两个 pod

---

## 以武会友：加入房间流程设计（2026-07-22）

### 场景：有分享链接

```
玩家 A 创建房间 → 获得房间码 + 分享链接
分享链接格式：/duel/room/:roomId

玩家 B 点链接进入 → URL 携带 roomId → 自动识别
  → 显示加入房间界面（只需要输入 4 位房间码验证）
```

### 场景：无分享链接（直接在比武场点击加入房间）

```
玩家 B 在比武场点击「以武会友」→「加入房间」
  → 输入房间码
  → 前端调用 POST /api/v1/duels/room/lookup { code }
  → 后端遍历 rooms Map，按 code 找到 roomId
  → 返回 roomId
  → 前端拿到 roomId 后再调 POST /api/v1/duels/room/:id/join 加入
```

### 关键设计决策

| 问题 | 选择 | 理由 |
|---|---|---|
| 前端如何输入房间码 | 4 字符输入框，字母大写+数字 | 容易口述/打字分享 |
| 查找房间支持无分享链接场景 | 新增 `/room/lookup` 接口 | 用户可能直接从朋友圈看到房间码就来加入，没有分享链接 |
| 房间码重复 | `generateCode()` 生成随机 4 位，理论上可能重复 | 房间是临时的（进程内存），同时存在几千个房间才可能撞，当前场景不会 |
| 加入后提示创建房间者 | 通过轮询 | 保持简单，无需 WebSocket |

---

## 习武场 complete 请求 502 Bad Gateway（2026-07-21 修复）

### 问题描述

习武场多轮对话正常进行（选择门派、描述招式、获得反馈），但点击"查看匹配结果"按钮后，浏览器直接跳到 Cloudflare 502 Bad Gateway 页面，Network 标签显示 `POST /api/v1/training/complete` 返回 502。

### 架构链路：complete 请求走的是内部 fetch，不是反向代理

```
浏览器 → Cloudflare → oauth2-proxy → Nginx → server-service:3001
  POST /api/v1/training/complete
    ↓
  server 内部 fetch("http://training-ground:8005/api/training/match")
    ↓
  training-ground agent → get_session(sessionId) → 找不到 → 404
    ↓
  server 收到非 200 → 直接返回 502
    ↓
  Cloudflare 展示 502 Bad Gateway 页面
```

**关键区分**：训练轮次中（`/api/ai/training/round`）是浏览器 → **反向代理**直达 training-ground；而 complete 是 server **内部 fetch**到 training-ground。前者不受 pod 重启影响，后者每次都要查 session。

### 根因：Agent session 存在进程内存中，pod 重启即丢失

`apps/agents/training-ground/judge/orchestrator.py` 默认用进程内 dict 存 session：

```python
_fallback_store: dict[str, TrainingSession] = {}
```

training-ground pod 重启后（滚动更新、OOM、liveness 探测失败等），所有 session 丢失。`/api/training/match` 查询不到 session → 返回 404 → server 包装为 502。

**另外发现的 Bug**：`apps/server/src/routes/training.ts` 在计算世外高人自定义卡牌序号时，条件写成了列自比较：

```typescript
// 恒为 true，没有实际过滤效果
.where(and(eq(userCards.userId, req.user.id), eq(userCards.cardId, userCards.cardId)));
```

### 修复内容

#### 1. Session 持久化 — 引入 Redis

- `apps/agents/training-ground/k8s/deployment.yaml`：从已有的 `redis-secret` 注入 `REDIS_URL`

```yaml
env:
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: redis-secret
      key: url
```

- `judge/redis_client.py` 已实现：`REDIS_URL` 存在时自动使用 Redis，不存在时回退内存存储
- `deploy/k8s/redis.yaml`：可选的新建 Redis standalone 部署（已有公用 Redis 时无需部署，已删除）
3. Agent session 存储必须持久化：任何 AI Agent 的会话状态都应存在 Redis/DB，而非进程内存

#### 2. 增强 /complete 容错

`apps/server/src/routes/training.ts` 区分 Agent 错误类型，返回前端可读的错误：

| Agent 返回 | 现在返回前端 |
|---|---|
| 404（session 过期） | `400 { error: "习武会话已过期（AI 服务重启导致），请重新开始习武", code: "SESSION_EXPIRED" }` |
| 500+（LLM 异常） | `502 { error: "AI 训练服务暂时不可用，请稍后再试", code: "AI_SERVICE_ERROR" }` |

#### 3. 修复列自比较 Bug

合并两次无用的查询为一次正确查询：

```typescript
// 修复前：两条查询 + 列自比较
const existingCustom = await db.select().from(userCards)
  .where(and(eq(userCards.userId, req.user.id), eq(userCards.cardId, userCards.cardId)));
const existingCards = await db.select().from(userCards)
  .where(and(eq(userCards.userId, req.user.id), eq(userCards.cardId, userCards.cardId)));

// 修复后：一次查询，正确条件
const existingCards = await db.select().from(userCards)
  .where(eq(userCards.userId, req.user.id));
```

### 修改的文件

| 文件 | 改动 |
|---|---|
| `apps/server/src/routes/training.ts` | 错误区分 + 修复列自比较 Bug |
| `apps/agents/training-ground/k8s/deployment.yaml` | 注入 `REDIS_URL` 从 `redis-secret` |

### 验证方法

部署后新开始一次完整的习武流程（从选择门派 → 多轮描述 → 查看匹配结果），完成后任意重启 training-ground pod：

```bash
kubectl rollout restart -n school-of-one deployment/training-ground
```

再新开始一次习武 flow，点"查看匹配结果"不应再出现 502。同时检查 server 日志确认 Agent session 存储在 Redis 中：

```bash
kubectl logs -n school-of-one deploy/server --tail=50 | grep -i "session\|redis\|match"
```

### 教训

1. **训练轮次和 complete 走了两条不同的路径**：轮次走 proxy（浏览器 → nginx → agent），complete 走 server 内部 fetch（`TRAINING_GROUND_URL`）——调试时要分别对待
2. **Agent session 存储必须持久化**：任何 AI Agent 的会话状态都应存在 Redis/DB，而非进程内存
3. **列自比较是隐式 Bug**：`eq(col, col)` 生成 SQL 恒为 true，TypeScript 编译器不会报错，单元测试才能发现
