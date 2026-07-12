# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY packages/ui-core ./packages/ui-core
COPY packages/api-client ./packages/api-client
COPY apps/martial-hegemony ./apps/martial-hegemony
RUN apk add --no-cache pnpm
RUN pnpm install --filter martial-hegemony
RUN pnpm --filter martial-hegemony build

# ---- Run stage ----
FROM nginx:alpine
COPY --from=build /app/apps/martial-hegemony/dist /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
