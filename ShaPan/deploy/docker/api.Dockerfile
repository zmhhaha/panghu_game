ARG NODE_IMAGE=arm-cluster-master:5000/node:20-bookworm-slim
FROM ${NODE_IMAGE}
ARG APT_MIRROR=https://mirrors.ustc.edu.cn
ARG NPM_REGISTRY=https://registry.npmmirror.com
WORKDIR /app
ENV NODE_ENV=production
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
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm config set registry "${NPM_REGISTRY}" \
  && npm config set fetch-retries 5 \
  && npm config set fetch-timeout 120000 \
  && npm install --omit=dev --ignore-scripts \
  && npm cache clean --force
COPY server ./server
EXPOSE 3001
CMD ["node", "server/src/index.mjs"]
