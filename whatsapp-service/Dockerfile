# ─── WhatsApp Service (whatsapp-web.js + Puppeteer/Chromium) ──────────────────
# whatsapp-web.js drives a headless Chromium through Puppeteer, so this image
# ships the system Chromium instead of Puppeteer's bundled build. Debian-slim is
# used (rather than alpine) because Puppeteer/Chromium is far more reliable on
# glibc. The WhatsApp session is persisted under /app/.wwebjs_auth — mount a
# volume there so the QR only has to be scanned once.
FROM node:20-slim

# System Chromium + the shared libs / fonts Puppeteer needs to render pages.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      fonts-freefont-ttf \
      wget \
    && rm -rf /var/lib/apt/lists/*

# Use the system Chromium and skip Puppeteer's own (~150MB) download at install.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Persist the LocalAuth session across restarts (mount a named volume here).
VOLUME ["/app/.wwebjs_auth"]

EXPOSE 5002

# NOTE: the HTTP server (and therefore /health) only starts AFTER the WhatsApp
# client is authenticated — i.e. after the QR is scanned on the first run — so
# allow a long start period before the healthcheck is enforced.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s \
  CMD wget -q --spider http://localhost:5002/health || exit 1

CMD ["node", "server.js"]
