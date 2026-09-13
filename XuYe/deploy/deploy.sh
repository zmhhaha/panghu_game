#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
docker build --no-cache \
  -t arm-cluster-master:5000/xuye-server:latest .
docker push arm-cluster-master:5000/xuye-server:latest
kubectl apply -f "$root_dir/deploy/k8s/namespace.yaml"
kubectl apply -f "$root_dir/../../vault/inventory/xuye-llm-token-externalsecret.yaml"
kubectl apply -f "$root_dir/../../vault/inventory/xuye-externalsecret.yaml"
kubectl apply -f "$root_dir/deploy/k8s/agent-configmap.yaml"
# 模型调用统一走集群内 llm-service：这是本服务唯一的模型凭据入口。
if ! kubectl wait --for=condition=Ready externalsecret/llm-token -n xuye --timeout=120s; then
  echo "missing ExternalSecret output llm-token in namespace xuye" >&2
  exit 1
fi
kubectl create configmap xuye-works -n xuye \
  --from-file=works.json="$root_dir/content/works.json" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f "$root_dir/deploy/k8s/server.yaml"
sed "s/__TARGET_NAME__/xuye/g" "$root_dir/../../oauth/k8s/game-proxy-configmap.yaml" | kubectl apply -f -
sed "s/__TARGET_NAME__/xuye/g" "$root_dir/../../oauth/k8s/game-proxy-deployment.yaml" | kubectl apply -f -
kubectl apply -f "$root_dir/../../cloudflare-tunnel/operator/tunnel-routes.yaml"
# xuye-server always deploys the reusable :latest tag.
kubectl rollout restart deployment/xuye-server -n xuye
kubectl rollout status deployment/xuye-server -n xuye --timeout=180s
kubectl rollout status deployment/oauth2-proxy-xuye -n oauth --timeout=180s
