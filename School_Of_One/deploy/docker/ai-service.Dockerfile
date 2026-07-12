# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/ai-service ./apps/ai-service
RUN apk add --no-cache pnpm
RUN pnpm install --filter @school-of-one/ai-service
RUN pnpm --filter @school-of-one/ai-service build

# ---- Run stage ----
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/apps/ai-service/dist ./dist
COPY --from=build /app/apps/ai-service/package.json .
RUN npm install --production
EXPOSE 3002
CMD ["node", "dist/index.js"]
