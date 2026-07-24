FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG API_INTERNAL_URL=http://qianfu-server:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_STANDALONE=true
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY packages/core packages/core
RUN pnpm --filter @qianfu/web build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
