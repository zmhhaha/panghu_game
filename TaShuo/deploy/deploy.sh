#!/usr/bin/env bash
set -euo pipefail

namespace=tashuo

kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/agent-configmap.yaml

# 模型调用统一走集群内 llm-service：这是本服务唯一的模型凭据入口。
# 缺令牌不会让进程降级，而是让它拒绝启动 —— 所以先同步再滚动。
kubectl apply -f ../../vault/inventory/tashuo-llm-token-externalsecret.yaml
kubectl wait --for=condition=Ready externalsecret/llm-token -n "$namespace" --timeout=120s

for secret in tashuo-database tashuo-agent llm-token; do
  if ! kubectl get secret "$secret" -n "$namespace" >/dev/null 2>&1; then
    echo "missing secret ${secret} in namespace ${namespace}" >&2
    exit 1
  fi
done

kubectl delete job tashuo-db-migration -n "$namespace" --ignore-not-found
kubectl apply -f deploy/k8s/migration-job.yaml
kubectl wait --for=condition=complete job/tashuo-db-migration -n "$namespace" --timeout=180s
kubectl apply -f deploy/k8s/server.yaml -f deploy/k8s/web.yaml
kubectl rollout restart deployment/tashuo-server deployment/tashuo-web -n "$namespace"
kubectl rollout status deployment/tashuo-server -n "$namespace" --timeout=240s
kubectl rollout status deployment/tashuo-web -n "$namespace" --timeout=180s

