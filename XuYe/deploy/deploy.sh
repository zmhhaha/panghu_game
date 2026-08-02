#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
kubectl apply -f "$root_dir/deploy/k8s/namespace.yaml"
kubectl apply -f "$root_dir/../../vault/inventory/xuye-agent-externalsecret.yaml"
kubectl apply -f "$root_dir/../../vault/inventory/xuye-externalsecret.yaml"
kubectl apply -f "$root_dir/deploy/k8s/agent-configmap.yaml"
kubectl apply -f "$root_dir/deploy/k8s/server.yaml"
sed "s/__TARGET_NAME__/xuye/g" "$root_dir/../../oauth/k8s/game-proxy-configmap.yaml" | kubectl apply -f -
sed "s/__TARGET_NAME__/xuye/g" "$root_dir/../../oauth/k8s/game-proxy-deployment.yaml" | kubectl apply -f -
kubectl apply -f "$root_dir/../../cloudflare-tunnel/operator/tunnel-routes.yaml"
kubectl rollout status deployment/xuye-server -n xuye --timeout=180s
kubectl rollout status deployment/oauth2-proxy-xuye -n oauth --timeout=180s
