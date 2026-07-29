#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"

docker build --pull -f Dockerfile -t "${registry}/tewu-web:${tag}" .
docker build --pull -f deploy/docker/server.Dockerfile -t "${registry}/tewu-server:${tag}" .
docker push "${registry}/tewu-web:${tag}"
docker push "${registry}/tewu-server:${tag}"
echo "published ${registry}/tewu-web:${tag}"
echo "published ${registry}/tewu-server:${tag}"
