ARG NODE_IMAGE=arm-cluster-master:5000/node:20-bookworm-slim
FROM ${NODE_IMAGE} AS build
ARG APT_MIRROR=http://mirrors.ustc.edu.cn
ARG NPM_REGISTRY=https://registry.npmmirror.com
WORKDIR /app/web
ARG API_INTERNAL_URL=http://shapan-api.shapan.svc.cluster.local:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i \
        -e "s#http://deb.debian.org#${APT_MIRROR}#g" \
        -e "s#https://deb.debian.org#${APT_MIRROR}#g" \
        -e "s#http://security.debian.org#${APT_MIRROR}#g" \
        -e "s#https://security.debian.org#${APT_MIRROR}#g" \
        /etc/apt/sources.list.d/debian.sources; \
    fi \
  && if [ -f /etc/apt/sources.list ]; then \
      sed -i \
        -e "s#http://deb.debian.org#${APT_MIRROR}#g" \
        -e "s#https://deb.debian.org#${APT_MIRROR}#g" \
        -e "s#http://security.debian.org#${APT_MIRROR}#g" \
        -e "s#https://security.debian.org#${APT_MIRROR}#g" \
        /etc/apt/sources.list; \
    fi \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY web/package.json web/package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" \
  && npm config set fetch-retries 5 \
  && npm config set fetch-timeout 120000 \
  && npm ci --ignore-scripts \
  && npm cache clean --force
COPY web ./
RUN npm run build

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
