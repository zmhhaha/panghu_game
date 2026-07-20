# ============================================================
#  Agent 构建 + 部署脚本
#  用法:
#    bash deploy-agents.sh                # 构建全部三个 agent
#    bash deploy-agents.sh --push         # 构建 + 推送 + 重启
#    bash deploy-agents.sh --restart      # 仅重启 K8s 部署
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/apps/agents"

REGISTRY="${REGISTRY:-arm-cluster-master:5000}"
K8S_NS="${K8S_NS:-school-of-one}"

build_and_push() {
    local name="$1" port="$2"
    echo ""
    echo "=== ${name} (port ${port}) ==="
    echo "  Building..."
    docker build -t "${REGISTRY}/${name}:latest" "./${name}"
    echo "  Pushing..."
    docker push "${REGISTRY}/${name}:latest"
}

deploy_k8s() {
    local name="$1"
    echo "  Restarting ${name}..."
    kubectl rollout restart "deploy/${name}" -n "${K8S_NS}" 2>/dev/null || true
}

case "${1:-}" in
    --restart)
        echo "=== 重启 Agent 部署 ==="
        deploy_k8s "duel-judge"
        deploy_k8s "combo-judge"
        deploy_k8s "training-ground"
        echo "=== 全部重启完成 ==="
        kubectl get pods -n "${K8S_NS}" -l 'app in (duel-judge,combo-judge,training-ground)'
        ;;
    --push)
        build_and_push "duel-judge" 8003
        build_and_push "combo-judge" 8004
        build_and_push "training-ground" 8005
        echo ""
        echo "=== 推送完成，重启 K8s ==="
        deploy_k8s "duel-judge"
        deploy_k8s "combo-judge"
        deploy_k8s "training-ground"
        echo "=== 全部完成 ==="
        ;;
    *)
        build_and_push "duel-judge" 8003
        build_and_push "combo-judge" 8004
        build_and_push "training-ground" 8005
        echo ""
        echo "=== 构建完成 ==="
        echo "  使用 --push 可推送并重启 K8s 部署"
        ;;
esac
