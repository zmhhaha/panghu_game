# ---- Build stage ----
FROM arm-cluster-master:5000/node20-ts-builder:latest AS build
WORKDIR /app

# 1️⃣ 依赖层（不改 package.json 时可命中缓存）
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/ui-core/package.json ./packages/ui-core/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY apps/martial-hegemony/package.json ./apps/martial-hegemony/package.json
RUN pnpm install --no-frozen-lockfile

# 2️⃣ 源码层（经常变）
COPY packages ./packages
COPY apps/martial-hegemony ./apps/martial-hegemony
COPY tsconfig.base.json ./
RUN cd apps/martial-hegemony && npx vite build

# ---- Run stage ----
FROM nginx:alpine
COPY --from=build /app/apps/martial-hegemony/dist /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
