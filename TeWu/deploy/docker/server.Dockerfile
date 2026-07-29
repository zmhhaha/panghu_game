FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY package.json ./
RUN npm install --omit=dev
COPY server/server.js ./server.js
EXPOSE 3001
CMD ["node", "server.js"]
