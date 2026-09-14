#!/bin/bash
# ============================================================
#  Training Ground — 部署脚本
#  用法: bash scripts/deploy.sh
# ============================================================
set -e

script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir/.."

NAMESPACE="${NAMESPACE:-school-of-one}"
REGISTRY="${REGISTRY:-arm-cluster-master:5000}"
K="${KUBECONFIG:+-kubeconfig=$KUBECONFIG}"

echo "=== Deploying Training Ground (namespace: ${NAMESPACE}) ==="

docker build -f Dockerfile.base -t ${REGISTRY}/training-ground-base:latest .
docker push ${REGISTRY}/training-ground-base:latest
docker build -t ${REGISTRY}/training-ground:latest .
docker push ${REGISTRY}/training-ground:latest

kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml $K | kubectl apply $K -f -

# 代码由镜像提供，见 Dockerfile 的 COPY
sed "s/__NAMESPACE__/${NAMESPACE}/g" k8s/deployment.yaml | kubectl apply $K -f -

kubectl rollout restart deploy/training-ground -n ${NAMESPACE} $K
kubectl rollout status deploy/training-ground -n ${NAMESPACE} $K --timeout=120s

echo "=== Pods ==="
kubectl get pods -n ${NAMESPACE} $K | grep training-ground
echo "=== Done ==="
