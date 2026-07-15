# 武林对决裁决 Agent (Duel Judge Agent)
# 基于 FastAPI 的多Agent协作对决判定服务

## 目录结构

```
duel-judge/
├── judge/
│   ├── __init__.py
│   ├── llm.py              # LLM 客户端配置
│   ├── agents.py           # Agent 定义（role/goal/backstory）
│   ├── tasks.py            # Task 定义 + prompt
│   └── orchestrator.py     # 编排器（3 Agent 顺序流水线）
├── duel_judge.py           # FastAPI 入口 + CLI
├── requirements.txt        # 依赖
├── .env.example            # 配置模板
├── .dockerignore           # Docker 构建忽略
├── Dockerfile              # 服务镜像
├── Dockerfile.base         # 基础镜像（依赖层）
├── k8s/
│   ├── namespace.yaml      # 命名空间
│   ├── configmap.yaml      # Provider 配置
│   ├── secret.yaml         # API Key
│   └── deployment.yaml     # Deployment + Service
└── scripts/
    └── deploy.sh           # 部署脚本
```

## 多Agent流水线

```
POST /api/duel/judge
  │
  ▼
招式分析师 (Move Analyst)
  ├─ 解析动作描述 → 招式类型/攻击意图/范围/速度/力度
  └─ 匹配已有卡牌 keywords
  │
  ▼
对决仲裁官 (Combat Arbiter)
  ├─ 基于分析+距离判定：feasibility / succeeded / damage
  └─ 计算位移距离变化
  │
  ▼
战况叙述师 (Combat Narrator)
  └─ 将裁决写成武侠小说风格的中文战况
  │
  ▼
JSON 响应（符合 DuelRound 接口）
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/duel/judge | 提交对决判定请求 |
| GET | /api/duel/health | 健康检查 |

## 用法

```bash
cd duel-judge
cp .env.example .env
# 编辑 .env 填入 API Key

# 安装依赖
pip install -r requirements.txt

# 启动服务
python duel_judge.py

# 或 uvicorn
uvicorn duel_judge:app --reload --port 8003
```
