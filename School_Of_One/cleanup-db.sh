# ============================================================
#  缓存清理脚本
#  清空 combo_cache 和 duel_cache 两张缓存表
#  用法:
#    bash cleanup-db.sh                    # 仅打印 SQL
#    bash cleanup-db.sh --apply            # 执行清理
# ============================================================
set -euo pipefail

DB_USER="${DB_USER:-appuser}"
DB_PASS="${DB_PASS:-1593572486}"
DB_NAME="${DB_NAME:-school_of_one}"
K8S_NS="${K8S_NS:-data}"

SQL="TRUNCATE combo_cache, duel_cache;"

case "${1:-}" in
    --apply|-a)
        echo "=== 执行清理 ==="
        kubectl exec -n "${K8S_NS}" postgres-0 -- psql \
            -U "${DB_USER}" -d "${DB_NAME}" -c "${SQL}"
        echo "=== 清理完成 ==="
        # 验证
        kubectl exec -n "${K8S_NS}" postgres-0 -- psql \
            -U "${DB_USER}" -d "${DB_NAME}" -c \
            "SELECT 'combo_cache' AS tbl, count(*) FROM combo_cache UNION ALL SELECT 'duel_cache', count(*) FROM duel_cache;"
        ;;
    --help|-h)
        echo "用法: bash cleanup-db.sh [--apply]"
        echo "  --apply   执行 TRUNCATE combo_cache, duel_cache"
        echo "  (无参数)  仅打印 SQL 到终端"
        exit 0
        ;;
    *)
        echo "=== 以下 SQL 将被执行 ==="
        echo ""
        echo "${SQL}"
        echo ""
        echo "=== 使用 --apply 参数实际执行 ==="
        echo ""
        echo "注意: 只清缓存表，不影响用户数据和自定义卡牌"
        ;;
esac
