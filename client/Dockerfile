# ─── Client (Vite + React) ───────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci

# Copy source and build.
# NOTE: Vite inlines VITE_* at build time. Those values come from client/.env,
# which is included in the build context (see .dockerignore — .env is kept),
# so the built SPA points at https://server.mail-or-a.dev as configured there.
COPY . .
RUN npm run build

# ─── Production Stage — serve with Nginx ──────────────────────────────────────
FROM nginx:alpine AS production

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
