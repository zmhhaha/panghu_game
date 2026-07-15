# ============================================================
#  Combo Judge — 部署脚本
#  用法: bash scripts/deploy.sh
# ============================================================
set -e

script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir/.."

NAMESPACE="${NAMESPACE:-combo-judge}"
REGISTRY="${REGISTRY:-arm-cluster-master:5000}"
K="${KUBECONFIG:+-kubeconfig=$KUBECONFIG}"

echo "=== Deploying Combo Judge (namespace: ${NAMESPACE}) ==="

# 镜像
docker build -f Dockerfile.base -t ${REGISTRY}/combo-judge-base:latest .
docker push ${REGISTRY}/combo-judge-base:latest
docker build -t ${REGISTRY}/combo-judge:latest .
docker push ${REGISTRY}/combo-judge:latest

# 命名空间
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml $K | kubectl apply $K -f -

# ConfigMap 注入代码
kubectl create configmap combo-judge-code -n ${NAMESPACE} \
    --from-file=combo_judge.py=./combo_judge.py \
    --dry-run=client -o yaml $K | kubectl apply $K -f -

# 部署
sed "s/__NAMESPACE__/${NAMESPACE}/g" k8s/deployment.yaml | kubectl apply $K -f -

# 重启
kubectl rollout restart deploy/combo-judge -n ${NAMESPACE} $K
kubectl rollout status deploy/combo-judge -n ${NAMESPACE} $K --timeout=120s

echo "=== Pods ==="
kubectl get pods -n ${NAMESPACE} $K | grep combo-judge

echo ""
echo "=== Done ==="
echo "健康检查: http://combo-judge.${NAMESPACE}.svc.cluster.local:8004/api/combo/health"
