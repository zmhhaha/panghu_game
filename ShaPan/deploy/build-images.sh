#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"

docker build --pull -f deploy/docker/api.Dockerfile -t "${registry}/shapan-api:${tag}" .
docker build \
  --pull \
  --build-arg API_INTERNAL_URL=http://shapan-api.shapan.svc.cluster.local:3001 \
  -f deploy/docker/web.Dockerfile \
  -t "${registry}/shapan-web:${tag}" .
docker push "${registry}/shapan-api:${tag}"
docker push "${registry}/shapan-web:${tag}"

echo "published ${registry}/shapan-api:${tag}"
echo "published ${registry}/shapan-web:${tag}"
