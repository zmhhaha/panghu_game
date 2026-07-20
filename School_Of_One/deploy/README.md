# ──────────────────────────────────────────
# 你需要手动创建的 2 个 Secret + 1 个通用配置
# ──────────────────────────────────────────

# ===== 0. 先建命名空间 =====
kubectl create namespace school-of-one

# ===== 1. 数据库凭据 =====
# 确保你的 PostgreSQL 中已创建数据库 school_of_one:
#   psql -h 你的PG服务 -U 你的用户 -c "CREATE DATABASE school_of_one;"
#
kubectl create secret generic db-secret -n school-of-one \
  --from-literal=url=postgresql://你的用户:你的密码@你的PostgreSQL服务名:5432/school_of_one

# ===== 2. JWT 签名密钥 =====
kubectl create secret generic jwt-secret -n school-of-one \
  --from-literal=secret=your-random-jwt-secret-change-this

# ===== 3. LLM API 密钥（三个 AI Agent 共用） =====
# 三个 Python Agent 通过环境变量 DEEPSEEK_API_KEY 使用 DeepSeek
kubectl create secret generic llm-secret -n school-of-one \
  --from-literal=deepseek-api-key=sk-your-deepseek-api-key-here

# 如果你还想用 OpenAI 作为备选:
# kubectl create secret generic llm-secret -n school-of-one \
#   --from-literal=deepseek-api-key=sk-xxx \
#   --from-literal=openai-api-key=sk-xxx

# ===== 4. (可选) Redis 连接地址（习武场需要） =====
# 如果你有通用 Redis 服务，习武场用它做 session 存储
kubectl create secret generic redis-secret -n school-of-one \
  --from-literal=url=redis://你的Redis服务名:6379/0

# ──────────────────────────────────────────
# 系统架构
# ──────────────────────────────────────────
#
# 前端 → server-service:3001 → 后端 API（Express）
#                             → duel-judge:8003（对决判定·Python）
#                             → combo-judge:8004（连招判定·Python）
#                             → training-ground:8005（习武场·Python+Redis）
#
# 三个 AI Agent 都是独立的 Python FastAPI 服务，独立部署扩缩容。

# ──────────────────────────────────────────
# 部署所有服务（需要先构建好镜像）
# ──────────────────────────────────────────

# 1. 先部署共享配置
kubectl apply -n school-of-one -f deploy/k8s/ai-service.yaml

# 2. 部署核心服务
kubectl apply -n school-of-one -f deploy/k8s/frontend.yaml
kubectl apply -n school-of-one -f deploy/k8s/server.yaml

# 3. 部署三个 AI Agent 配置
# Agent Deployment 在 apps/agents/*/k8s/ 下，按需部署

# 查看状态
kubectl get pods -n school-of-one -w

# ===== (可选) Ingress =====
# 如果你用 K8s Ingress，改域名后执行:
# kubectl apply -n school-of-one -f deploy/k8s/ingress.yaml

# ──────────────────────────────────────────
# 构建 Docker 镜像
# ──────────────────────────────────────────

# Server（Express 后端）
docker build -f deploy/docker/server.Dockerfile \
  -t arm-cluster-master:5000/school-server:latest .
docker push arm-cluster-master:5000/school-server:latest

# Frontend（React SPA）
docker build -f deploy/docker/frontend.Dockerfile \
  -t arm-cluster-master:5000/school-frontend:latest .
docker push arm-cluster-master:5000/school-frontend:latest

# 重启部署
kubectl rollout restart deploy/server -n school-of-one
kubectl rollout restart deploy/frontend -n school-of-one

# ──────────────────────────────────────────
# Docker 构建注意事项
# ──────────────────────────────────────────
#
# 1. tsx 路径问题
#    pnpm 的 node_modules 是嵌套结构（.pnpm store），构建后
#    /app/node_modules/.bin/tsx 不存在。tsx 实际在子包目录下：
#      apps/server/node_modules/.bin/tsx
#    server.Dockerfile 的 CMD 已写为绝对路径:
#      CMD ["apps/server/node_modules/.bin/tsx", "apps/server/src/index.ts"]
#
# 2. pnpm-lock.yaml 缺失
#    项目无 lockfile（因为是多开发者协作，.gitignore 排除），
#    COPY pnpm-lock.yaml 会导致构建失败。改为 COPY package.json，
#    使用 pnpm install --no-frozen-lockfile。
#
# 3. better-sqlite3 原生编译
#    better-sqlite3 需要 node-gyp + python3 + make + g++，
#    构建阶段 FROM node:20-alpine 后必须安装:
#      RUN apk add pnpm python3 make g++ && npm install -g node-gyp
#
#    Frontend 不需要这些依赖，只用 RUN apk add pnpm 即可。
#
# 4. 镜像体积（可选优化）
#    Server: ~300MB（含 tsx + node_modules）
#    Frontend: ~20MB（Nginx + 静态文件，不含 node_modules）
#    Server 如果后续改用 tsc 编译 + node 直接运行，可降至 ~150MB。

# ──────────────────────────────────────────
# 前端调用 AI Agent 的方式
# ──────────────────────────────────────────
#
# 开发环境（直接走 vite proxy → server:3001）:
#   /api/ai/duel/judge       → localhost:8003/api/duel/judge
#   /api/ai/combo/judge      → localhost:8004/api/combo/judge
#   /api/ai/training/start   → localhost:8005/api/training/start
#
# 生产环境（K8s Ingress 统一暴露）:
#   /api/ai/duel/judge       → duel-judge:8003
#   /api/ai/combo/judge      → combo-judge:8004
#   /api/ai/training/start   → training-ground:8005

# ──────────────────────────────────────────
# Express 反向代理已知问题（2026-07-16）
# ──────────────────────────────────────────
#
# AI Agent 反向代理通过 http-proxy-middleware v3 转发。
# Express 注册中间件 app.use("/api/ai/training", ...) 时，会自动
# 剥离匹配的前缀，转发给 target 的剩余路径是 "/factions" 而不是
# "/api/training/factions"。因此 pathRewrite 必须用 "^/": "/api/training/"
# 而非 "^/api/ai/training": "/api/training"。
#
# 当前配置（apps/server/src/index.ts）:
#   app.use("/api/ai/training", createProxyMiddleware({
#     target: TRAINING_GROUND_URL,     # http://training-ground:8005
#     changeOrigin: true,
#     pathRewrite: { "^/": "/api/training/" },   # 重写整个路径
#   }));
#
# 同理 duel / combo:
#   pathRewrite: { "^/": "/api/duel/" },
#   pathRewrite: { "^/": "/api/combo/" },
#
# 注意: 这个改动尚未验证是否生效，部署后需要测试:
#   curl http://server-service:3001/api/ai/training/factions
#   期望返回 JSON 数组（门派列表），而非 {"detail":"Not Found"}
