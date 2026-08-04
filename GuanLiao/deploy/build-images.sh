#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:-arm-cluster-master:5000}"
tag="${IMAGE_TAG:-latest}"
image="${registry}/guanliao-server:${tag}"

docker build --pull -f deploy/docker/server.Dockerfile -t "$image" .
docker push "$image"

echo "published ${image}"
