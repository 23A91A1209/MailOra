# ─── Server ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS server

WORKDIR /app/server

# Install dependencies first (cache layer)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
