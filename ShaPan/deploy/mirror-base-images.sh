#!/usr/bin/env bash
set -euo pipefail

registry="${BASE_REGISTRY:-${REGISTRY:-arm-cluster-master:5000}}"
source_image="${NODE_SOURCE_IMAGE:-node:20-bookworm-slim}"
target_image="${NODE_IMAGE:-${registry}/node:20-bookworm-slim}"

echo "pulling ${source_image}"
docker pull "${source_image}"
docker tag "${source_image}" "${target_image}"
docker push "${target_image}"
echo "published ${target_image}"
