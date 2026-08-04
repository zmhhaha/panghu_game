#!/usr/bin/env bash
set -euo pipefail

namespace=guanliao
registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"
image="${registry}/guanliao-server:${tag}"
game_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
infrastructure_root="$(cd "${game_repo_root}/.." && pwd)"
project_root="${game_repo_root}/GuanLiao"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

kubectl apply -f "${project_root}/deploy/k8s/namespace.yaml"
kubectl apply -f "${infrastructure_root}/vault/inventory/guanliao-externalsecret.yaml"
kubectl apply -f "${infrastructure_root}/vault/inventory/guanliao-agent-externalsecret.yaml"
kubectl apply -f "${infrastructure_root}/vault/inventory/oauth-externalsecret.yaml"

kubectl wait --for=condition=Ready externalsecret/guanliao-database -n "$namespace" --timeout=120s
kubectl wait --for=condition=Ready externalsecret/guanliao-agent -n "$namespace" --timeout=120s
kubectl wait --for=condition=Ready externalsecret/oauth2-proxy-secret -n oauth --timeout=120s

if ! kubectl get secret guanliao-database -n "$namespace" >/dev/null 2>&1; then
  echo "missing ExternalSecret output guanliao-database in namespace ${namespace}" >&2
  exit 1
fi
if ! kubectl get secret guanliao-agent -n "$namespace" >/dev/null 2>&1; then
  echo "missing ExternalSecret output guanliao-agent in namespace ${namespace}" >&2
  exit 1
fi
if ! kubectl get secret oauth2-proxy-secret -n oauth >/dev/null 2>&1; then
  echo "missing shared oauth2-proxy-secret in namespace oauth" >&2
  exit 1
fi

sed 's/__TARGET_NAME__/guanliao/g' "${infrastructure_root}/oauth/k8s/game-proxy-configmap.yaml" > "${tmp_dir}/oauth-config.yaml"
sed 's/__TARGET_NAME__/guanliao/g' "${infrastructure_root}/oauth/k8s/game-proxy-deployment.yaml" > "${tmp_dir}/oauth-deployment.yaml"
kubectl apply -f "${tmp_dir}/oauth-config.yaml" -f "${tmp_dir}/oauth-deployment.yaml"
kubectl apply -f "${infrastructure_root}/cloudflare-tunnel/operator/tunnel-routes.yaml"

kubectl delete job guanliao-db-migration -n "$namespace" --ignore-not-found
sed "s#arm-cluster-master:5000/guanliao-server:latest#${image}#g" "${project_root}/deploy/k8s/migration-job.yaml" > "${tmp_dir}/migration-job.yaml"
kubectl apply -f "${tmp_dir}/migration-job.yaml"
kubectl wait --for=condition=complete job/guanliao-db-migration -n "$namespace" --timeout=180s

sed "s#arm-cluster-master:5000/guanliao-server:latest#${image}#g" "${project_root}/deploy/k8s/server.yaml" > "${tmp_dir}/server.yaml"
kubectl apply -f "${project_root}/deploy/k8s/agent-configmap.yaml" -f "${tmp_dir}/server.yaml"
kubectl rollout status deployment/guanliao-server -n "$namespace" --timeout=180s
kubectl rollout status deployment/oauth2-proxy-guanliao -n oauth --timeout=180s

echo "GuanLiao is deployed at https://guanliao.panghuer.top"
