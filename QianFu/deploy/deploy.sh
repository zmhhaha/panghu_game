#!/usr/bin/env bash
set -euo pipefail

namespace=qianfu

kubectl apply -f deploy/k8s/namespace.yaml
if ! kubectl get secret qianfu-database -n "$namespace" >/dev/null 2>&1; then
  echo "missing secret qianfu-database in namespace ${namespace}" >&2
  echo "create it from the PostgreSQL connection URL before deploying" >&2
  exit 1
fi

kubectl delete job qianfu-db-migration -n "$namespace" --ignore-not-found
kubectl apply -f deploy/k8s/migration-job.yaml
kubectl wait --for=condition=complete job/qianfu-db-migration -n "$namespace" --timeout=180s
kubectl apply -f deploy/k8s/agent-configmap.yaml -f deploy/k8s/server.yaml -f deploy/k8s/web.yaml
kubectl rollout restart deployment/qianfu-server deployment/qianfu-web -n "$namespace"
kubectl rollout status deployment/qianfu-server -n "$namespace" --timeout=180s
kubectl rollout status deployment/qianfu-web -n "$namespace" --timeout=180s
