# ============================================================
#  Combo Judge — API 服务镜像
# ============================================================
ARG REGISTRY=arm-cluster-master:5000
FROM ${REGISTRY}/combo-judge-base:latest

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8004/api/combo/health || exit 1

CMD ["python", "-m", "uvicorn", "combo_judge:app", "--host", "0.0.0.0", "--port", "8004"]
