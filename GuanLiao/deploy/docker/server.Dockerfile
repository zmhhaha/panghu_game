FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources; fi \
  && if [ -f /etc/apt/sources.list ]; then sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list; fi \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY index.html styles.css agent-client.js game.js ./
COPY assets ./assets
COPY migrations ./migrations
# The node user in node:20-bookworm-slim is UID/GID 1000. Keep this numeric
# so Kubernetes can verify runAsNonRoot before starting the container.
USER 1000:1000
EXPOSE 4173
CMD ["node", "dist/index.js"]
