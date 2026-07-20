# ============================================================
#  数据库初始化脚本
#  在 PostgreSQL 中创建 Phase 2 所需的四张表
#  用法:
#    bash setup-db.sh                    # 仅打印 SQL
#    bash setup-db.sh --apply            # 执行建表
# ============================================================
set -euo pipefail

DB_HOST="${DB_HOST:-postgres.data.svc.cluster.local}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-appuser}"
DB_PASS="${DB_PASS:-1593572486}"
DB_NAME="${DB_NAME:-school_of_one}"
K8S_NS="${K8S_NS:-data}"

SQL="
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL DEFAULT '默认卡组',
  starter_card_id TEXT NOT NULL,
  card_ids JSONB NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  faction_id TEXT,
  master_name TEXT,
  rounds INTEGER DEFAULT 0,
  matched_card_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  opponent TEXT NOT NULL DEFAULT 'AI',
  winner TEXT NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 0,
  player_hearts INTEGER NOT NULL DEFAULT 10,
  ai_hearts INTEGER NOT NULL DEFAULT 10,
  history JSONB DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL
);
"

case "${1:-}" in
    --apply|-a)
        echo "=== 执行建表 ==="
        kubectl exec -n "${K8S_NS}" postgres-0 -- psql \
            -U "${DB_USER}" -d "${DB_NAME}" -c "${SQL}"
        echo "=== 建表完成 ==="
        # 验证
        kubectl exec -n "${K8S_NS}" postgres-0 -- psql \
            -U "${DB_USER}" -d "${DB_NAME}" -c '\dt'
        ;;
    --help|-h)
        echo "用法: bash setup-db.sh [--apply]"
        echo "  --apply   实际执行建表"
        echo "  (无参数)  仅打印建表 SQL 到终端"
        exit 0
        ;;
    *)
        echo "=== 以下 SQL 将被执行 ==="
        echo ""
        echo "${SQL}"
        echo ""
        echo "=== 使用 --apply 参数实际执行 ==="
        ;;
esac
