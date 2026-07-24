#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"

docker build --pull -f deploy/docker/server.Dockerfile -t "${registry}/qianfu-server:${tag}" .
docker build \
  --pull \
  --build-arg API_INTERNAL_URL=http://qianfu-server:3001 \
  -f deploy/docker/web.Dockerfile \
  -t "${registry}/qianfu-web:${tag}" .
docker push "${registry}/qianfu-server:${tag}"
docker push "${registry}/qianfu-web:${tag}"

echo "published ${registry}/qianfu-server:${tag}"
echo "published ${registry}/qianfu-web:${tag}"
