# ============================================================
#  Frontend + Server 构建 + 部署脚本
#  用法:
#    bash deploy-frontend-server.sh                # 构建 frontend + server
#    bash deploy-frontend-server.sh --push         # 构建 + 推送 + 重启 K8s
#    bash deploy-frontend-server.sh --restart      # 仅重启 K8s 部署
#    bash deploy-frontend-server.sh --push --frontend-only  # 仅 frontend
#    bash deploy-frontend-server.sh --push --server-only    # 仅 server
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"

REGISTRY="${REGISTRY:-arm-cluster-master:5000}"
K8S_NS="${K8S_NS:-school-of-one}"
BUILD_FRONTEND=true
BUILD_SERVER=true

# ── 解析参数 ────────────────────────────────────────────────
PUSH_MODE=false
RESTART_MODE=false

for arg in "$@"; do
  case "$arg" in
    --push)      PUSH_MODE=true ;;
    --restart)   RESTART_MODE=true ;;
    --frontend-only) BUILD_SERVER=false ;;
    --server-only)   BUILD_FRONTEND=false ;;
    --help|-h)
      echo "用法: $0 [--push] [--restart] [--frontend-only|--server-only]"
      exit 0
      ;;
  esac
done

# ── 构建函数 ────────────────────────────────────────────────
build_target() {
    local name="$1" dockerfile="$2" image_tag="$3"
    echo ""
    echo "=== ${name} (${image_tag}:latest) ==="
    echo "  Dockerfile: ${dockerfile}"
    echo "  Tag:        ${REGISTRY}/${image_tag}:latest"

    if [ "$RESTART_MODE" = true ]; then
        echo "  (跳过构建，仅重启)"
        return
    fi

    echo "  Building..."
    docker build -t "${REGISTRY}/${image_tag}:latest" -f "${dockerfile}" .

    if [ "$PUSH_MODE" = true ]; then
        echo "  Pushing..."
        docker push "${REGISTRY}/${image_tag}:latest"
    fi

    if [ "$PUSH_MODE" = true ] || [ "$RESTART_MODE" = true ]; then
        echo "  Restarting K8s deployment..."
        kubectl rollout restart "deploy/${name}" -n "${K8S_NS}" 2>/dev/null || true
        kubectl rollout status "deploy/${name}" -n "${K8S_NS}" --timeout=60s 2>/dev/null || true
    fi
}

# ── 执行 ────────────────────────────────────────────────────

if [ "$RESTART_MODE" = true ]; then
    echo "=== 重启 Frontend / Server 部署 ==="
else
    echo "=== 构建 Frontend / Server ==="
fi

$BUILD_FRONTEND && build_target "frontend" "deploy/docker/frontend.Dockerfile" "school-frontend"
$BUILD_SERVER   && build_target "server"   "deploy/docker/server.Dockerfile"   "school-server"

echo ""
echo "=== 全部完成 ==="
if [ "$RESTART_MODE" = false ] && [ "$PUSH_MODE" = false ]; then
    echo "  使用 --push 或 --restart 可推送并重启 K8s 部署"
fi

# 显示当前 pod 状态
echo ""
kubectl get pods -n "${K8S_NS}" -l 'app in (frontend,server)'
