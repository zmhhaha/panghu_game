FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir \
    --index-url https://mirrors.aliyun.com/pypi/simple/ \
    --trusted-host mirrors.aliyun.com \
    --default-timeout=180 \
    --retries=8 \
    -r requirements.txt
COPY . ./

ENV HOST=0.0.0.0
ENV PORT=4173
EXPOSE 4173
CMD ["python", "server.py"]
