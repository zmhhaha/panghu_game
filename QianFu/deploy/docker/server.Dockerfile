FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/content/package.json packages/content/package.json
RUN pnpm install --frozen-lockfile
COPY apps/server apps/server
COPY packages/core packages/core
COPY packages/content packages/content
RUN pnpm --filter @qianfu/server typecheck

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate \
  && if [ -f /etc/apt/sources.list.d/debian.sources ]; then sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources; fi \
  && if [ -f /etc/apt/sources.list ]; then sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list; fi \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/tsconfig.base.json ./
COPY --from=build /app/apps/server /app/apps/server
COPY --from=build /app/packages/core /app/packages/core
COPY --from=build /app/packages/content /app/packages/content
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=build /app/packages/core/node_modules /app/packages/core/node_modules
COPY --from=build /app/packages/content/node_modules /app/packages/content/node_modules
EXPOSE 3001
CMD ["pnpm", "--filter", "@qianfu/server", "start"]
