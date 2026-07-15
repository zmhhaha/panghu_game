# 招式连招可行性判定 Agent (Combo Judge Agent)
# 基于 FastAPI 的单Agent服务

## 功能

输入两段武术动作描述（前一个动作 → 后一个动作），判定从前一个动作衔接到后一个动作的可行性。

## 多Agent流水线

```
POST /api/combo/judge
  │
  ▼
连招判定官 (Combo Arbiter)
  ├─ 分析前一个动作的结束态势（重心/发力/收势）
  ├─ 分析后一个动作的起手要求（起手/发力/时机）
  ├─ 评估衔接可行性（身体力学/动量/节奏/难度）
  └─ 输出可行性评分 + 解释
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/combo/judge | 提交连招可行性判定 |
| GET | /api/combo/health | 健康检查 |

## 用法

```bash
cd combo-judge
pip install -r requirements.txt

# 本地运行
python combo_judge.py

# 或 uvicorn
uvicorn combo_judge:app --reload --port 8004
```

## 部署

```bash
bash scripts/deploy.sh
```
