# ─── SerpAPI Job Search Service ──────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5001

# This service exposes its health status at "/" (there is no /health route).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:5001/ || exit 1

CMD ["node", "server.js"]
