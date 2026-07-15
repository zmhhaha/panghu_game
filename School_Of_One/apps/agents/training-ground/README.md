# 习武场 Agent (Training Ground)
# 玩家选择门派，由掌门大师指导，多轮优化招式描述
# 最终从卡牌库中匹配最合适的招式

## 多轮对话流程

```
POST /api/training/start → 开始习武，选择门派
  │
  ▼
第1轮: 玩家描述 → 大师反馈 → 匹配卡牌(confidence)
  │  如果 confidence > 0.7，提前结束
  ▼
第2轮: 玩家描述改进 → 大师反馈 → 匹配卡牌(confidence)
  │
  ▼
  ...最多5轮
  │
  ▼
POST /api/training/match → 返回最匹配的卡牌
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/training/factions | 获取所有门派列表 |
| POST | /api/training/start | 开始习武对话 |
| POST | /api/training/round | 提交一轮描述，获得大师反馈+卡牌匹配 |
| POST | /api/training/match | 强制结束并获取最终匹配结果 |
| GET | /api/training/health | 健康检查 |

## 用法

```bash
cd training-ground
pip install -r requirements.txt
python training_ground.py
# 或 uvicorn training_ground:app --reload --port 8005
```

## 部署

```bash
bash scripts/deploy.sh
```
