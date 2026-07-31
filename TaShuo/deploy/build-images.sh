#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"

docker build --pull -f deploy/docker/server.Dockerfile -t "${registry}/tashuo-server:${tag}" .
docker build --pull --build-arg API_INTERNAL_URL=http://tashuo-server:3001 -f deploy/docker/web.Dockerfile -t "${registry}/tashuo-web:${tag}" .
docker push "${registry}/tashuo-server:${tag}"
docker push "${registry}/tashuo-web:${tag}"

echo "published ${registry}/tashuo-server:${tag}"
echo "published ${registry}/tashuo-web:${tag}"

