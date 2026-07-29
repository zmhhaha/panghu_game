FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY server/server.js ./server.js
EXPOSE 3001
CMD ["node", "server.js"]
