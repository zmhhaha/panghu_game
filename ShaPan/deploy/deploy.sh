#!/usr/bin/env bash
set -euo pipefail

namespace=shapan
registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"
api_image="${registry}/shapan-api:${tag}"
web_image="${registry}/shapan-web:${tag}"

kubectl apply -f deploy/k8s/namespace.yaml

if ! kubectl get secret shapan-database -n "$namespace" >/dev/null 2>&1; then
  echo "missing secret shapan-database in namespace ${namespace}" >&2
  echo "apply the Vault ExternalSecret before deploying ShaPan" >&2
  exit 1
fi

kubectl delete job shapan-db-migration -n "$namespace" --ignore-not-found
sed "s#arm-cluster-master:5000/shapan-api:latest#${api_image}#g" deploy/k8s/migration-job.yaml | kubectl apply -f -
kubectl wait --for=condition=complete job/shapan-db-migration -n "$namespace" --timeout=180s
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/api.yaml -f deploy/k8s/web.yaml -f deploy/k8s/workers.yaml
kubectl set image deployment/shapan-api api="$api_image" -n "$namespace"
kubectl set image deployment/shapan-web web="$web_image" -n "$namespace"
kubectl set image deployment/shapan-sim-worker sim="$api_image" -n "$namespace"
kubectl set image deployment/shapan-agent-worker agent="$api_image" -n "$namespace"
if [[ "$tag" == "latest" ]]; then
  kubectl rollout restart deployment/shapan-api deployment/shapan-web deployment/shapan-sim-worker deployment/shapan-agent-worker -n "$namespace"
fi
kubectl rollout status deployment/shapan-api -n "$namespace" --timeout=180s
kubectl rollout status deployment/shapan-web -n "$namespace" --timeout=180s
kubectl rollout status deployment/shapan-sim-worker -n "$namespace" --timeout=180s
kubectl rollout status deployment/shapan-agent-worker -n "$namespace" --timeout=180s
