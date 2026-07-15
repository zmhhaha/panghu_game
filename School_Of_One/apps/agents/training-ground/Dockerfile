# ============================================================
#  Training Ground — API 服务镜像
# ============================================================
ARG REGISTRY=arm-cluster-master:5000
FROM ${REGISTRY}/training-ground-base:latest

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8005

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8005/api/training/health || exit 1

CMD ["python", "-m", "uvicorn", "training_ground:app", "--host", "0.0.0.0", "--port", "8005"]
