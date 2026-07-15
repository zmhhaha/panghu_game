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

# 3. 部署三个 AI Agent
kubectl apply -n school-of-one -f deploy/k8s/duel-judge.yaml
kubectl apply -n school-of-one -f deploy/k8s/combo-judge.yaml
kubectl apply -n school-of-one -f deploy/k8s/training-ground.yaml

# 查看状态
kubectl get pods -n school-of-one -w

# ===== (可选) Ingress =====
# 如果你用 K8s Ingress，改域名后执行:
# kubectl apply -n school-of-one -f deploy/k8s/ingress.yaml

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
