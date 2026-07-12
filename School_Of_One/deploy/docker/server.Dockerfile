# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/server ./apps/server
RUN apk add --no-cache python3 make g++ pnpm
RUN pnpm install --filter @school-of-one/server
RUN pnpm --filter @school-of-one/server build

# ---- Run stage ----
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/package.json .
RUN npm install --production
EXPOSE 3001
CMD ["node", "dist/index.js"]
