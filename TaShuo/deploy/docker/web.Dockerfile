FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG API_INTERNAL_URL=http://tashuo-server:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/content/package.json packages/content/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY packages/core packages/core
RUN pnpm --filter @tashuo/web build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

