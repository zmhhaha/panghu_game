# ============================================================
#  Node 20 + pnpm + g++ 基础构建镜像（一键编译 TS 用）
#  这个镜像专门缓存编译工具链，避免每次构建都 apk install
#
#  构建（只在工具链升级时重跑）：
#    docker build -f deploy/docker/builder.Dockerfile \
#      -t arm-cluster-master:5000/node20-ts-builder:latest \
#      -t arm-cluster-master:5000/node20-ts-builder:node20 \
#      .
#    docker push arm-cluster-master:5000/node20-ts-builder:latest
#    docker push arm-cluster-master:5000/node20-ts-builder:node20
#
#  Server/Frontend Dockerfile 在 FROM 中引用这个镜像：
#    FROM arm-cluster-master:5000/node20-ts-builder AS build
# ============================================================
FROM node:20-alpine

# 编译工具链（better-sqlite3 需要 g++）
RUN apk add --no-cache python3 make g++ pnpm curl && \
    npm install -g node-gyp

HEALTHCHECK NONE
CMD ["node"]
