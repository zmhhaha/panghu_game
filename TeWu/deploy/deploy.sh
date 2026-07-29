#!/usr/bin/env bash
set -euo pipefail

namespace=tewu
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/agent-configmap.yaml
kubectl apply -f ../../vault/inventory/tewu-agent-externalsecret.yaml
kubectl apply -f deploy/k8s/server.yaml
kubectl apply -f deploy/k8s/web.yaml
kubectl rollout restart deployment/tewu-server -n "${namespace}"
kubectl rollout restart deployment/tewu-web -n "${namespace}"
kubectl rollout status deployment/tewu-server -n "${namespace}" --timeout=180s
kubectl rollout status deployment/tewu-web -n "${namespace}" --timeout=180s
kubectl get pods,svc -n "${namespace}"
