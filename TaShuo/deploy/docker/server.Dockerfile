FROM node:20-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/content/package.json packages/content/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS check
COPY apps/server apps/server
COPY packages/core packages/core
COPY packages/content packages/content
RUN pnpm --filter @tashuo/server typecheck

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable \
  && corepack prepare pnpm@9.15.0 --activate \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --from=check /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/tsconfig.base.json ./
COPY --from=check /app/apps/server ./apps/server
COPY --from=check /app/packages/core ./packages/core
COPY --from=check /app/packages/content ./packages/content
COPY --from=check /app/node_modules ./node_modules
COPY --from=check /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=check /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=check /app/packages/content/node_modules ./packages/content/node_modules
EXPOSE 3001
CMD ["pnpm", "--filter", "@tashuo/server", "start"]

