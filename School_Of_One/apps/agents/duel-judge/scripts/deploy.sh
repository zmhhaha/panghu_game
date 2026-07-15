# ============================================================
#  Duel Judge — 部署脚本
#  用法: bash scripts/deploy.sh
# ============================================================
set -e

script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir/.."

NAMESPACE="${NAMESPACE:-duel-judge}"
REGISTRY="${REGISTRY:-arm-cluster-master:5000}"
K="${KUBECONFIG:+-kubeconfig=$KUBECONFIG}"

echo "=== Deploying Duel Judge (namespace: ${NAMESPACE}) ==="

# 1. 构建并推送镜像
echo "=== Building image ==="
docker build -f Dockerfile.base -t ${REGISTRY}/duel-judge-base:latest .
docker push ${REGISTRY}/duel-judge-base:latest

docker build -t ${REGISTRY}/duel-judge:latest .
docker push ${REGISTRY}/duel-judge:latest
echo "Image: ${REGISTRY}/duel-judge:latest"

# 2. 创建命名空间
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml $K | kubectl apply $K -f -

# 3. 注入 duel_judge.py 到 ConfigMap
kubectl create configmap duel-judge-code -n ${NAMESPACE} \
    --from-file=duel_judge.py=./duel_judge.py \
    --dry-run=client -o yaml $K | kubectl apply $K -f -

# 4. 部署
sed "s/__NAMESPACE__/${NAMESPACE}/g" k8s/deployment.yaml | kubectl apply $K -f -

# 5. 重启
kubectl rollout restart deploy/duel-judge -n ${NAMESPACE} $K

# 6. 等待就绪
echo "=== Waiting for deployment to become ready ==="
kubectl rollout status deploy/duel-judge -n ${NAMESPACE} $K --timeout=120s

# 7. 检查 pod 状态
echo "=== Pods ==="
kubectl get pods -n ${NAMESPACE} $K | grep duel-judge

echo ""
echo "=== Done ==="
echo "健康检查: http://duel-judge.${NAMESPACE}.svc.cluster.local:8003/api/duel/health"
