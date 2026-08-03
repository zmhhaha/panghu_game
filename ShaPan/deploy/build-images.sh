#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:-arm-cluster-master:5000}"
base_registry="${BASE_REGISTRY:-$registry}"
tag="${IMAGE_TAG:-latest}"
node_image="${NODE_IMAGE:-${base_registry}/node:20-bookworm-slim}"
apt_mirror="${APT_MIRROR:-https://mirrors.ustc.edu.cn}"
npm_registry="${NPM_REGISTRY:-https://registry.npmmirror.com}"

docker build \
  --pull \
  --build-arg NODE_IMAGE="${node_image}" \
  --build-arg APT_MIRROR="${apt_mirror}" \
  --build-arg NPM_REGISTRY="${npm_registry}" \
  -f deploy/docker/api.Dockerfile \
  -t "${registry}/shapan-api:${tag}" .
docker build \
  --pull \
  --build-arg NODE_IMAGE="${node_image}" \
  --build-arg NPM_REGISTRY="${npm_registry}" \
  --build-arg API_INTERNAL_URL=http://shapan-api.shapan.svc.cluster.local:3001 \
  -f deploy/docker/web.Dockerfile \
  -t "${registry}/shapan-web:${tag}" .
docker push "${registry}/shapan-api:${tag}"
docker push "${registry}/shapan-web:${tag}"

echo "published ${registry}/shapan-api:${tag}"
echo "published ${registry}/shapan-web:${tag}"
echo "base image ${node_image}"
echo "apt mirror ${apt_mirror}"
echo "npm registry ${npm_registry}"
