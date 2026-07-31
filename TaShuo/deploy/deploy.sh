#!/usr/bin/env bash
set -euo pipefail

namespace=tashuo

kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/agent-configmap.yaml

for secret in tashuo-database tashuo-agent; do
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

