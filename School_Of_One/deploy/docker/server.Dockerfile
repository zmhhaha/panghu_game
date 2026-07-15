# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache pnpm python3 make g++ && npm install -g node-gyp

# 1️⃣ 依赖层（不改 package.json 时可命中缓存）
COPY package.json pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/ui-core/package.json ./packages/ui-core/package.json
COPY apps/server/package.json ./apps/server/package.json
RUN pnpm install --no-frozen-lockfile

# 2️⃣ 源码层（经常变）
COPY packages ./packages
COPY apps/server ./apps/server

# ---- Run stage ----
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3001
CMD ["apps/server/node_modules/.bin/tsx", "apps/server/src/index.ts"]
