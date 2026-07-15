# ============================================================
#  Duel Judge — API 服务镜像
#  用法: docker build -f Dockerfile -t duel-judge:latest .
# ============================================================
ARG REGISTRY=arm-cluster-master:5000
FROM ${REGISTRY}/duel-judge-base:latest

# 复制代码（duel_judge.py 在 ConfigMap 中覆盖）
COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8003/api/duel/health || exit 1

CMD ["python", "-m", "uvicorn", "duel_judge:app", "--host", "0.0.0.0", "--port", "8003"]
