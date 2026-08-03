FROM node:20-bookworm-slim AS build
WORKDIR /app/web
ARG API_INTERNAL_URL=http://shapan-api.shapan.svc.cluster.local:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
COPY web/package.json web/package-lock.json ./
RUN npm ci --ignore-scripts
COPY web ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
