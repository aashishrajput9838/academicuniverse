FROM node:20-slim

# Install essential build tools and Playwright dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Set Playwright browser path BEFORE npm install so the postinstall
# script (npx playwright install --with-deps chromium) runs here in the
# build phase — NOT at container startup.
ENV PLAYWRIGHT_BROWSERS_PATH=/app/pw-browsers

# Install dependencies (postinstall runs playwright install here)
RUN npm install --no-audit --no-fund

# Install Playwright browsers explicitly (belt + suspenders)
RUN npx playwright install chromium

# Copy source
COPY backend/ .

# Build TypeScript → dist/
RUN npm run build

# Prune dev dependencies AFTER build
RUN npm prune --omit=dev

# Runtime env
ENV NODE_ENV=production
# PORT is injected by Render at runtime — do NOT hardcode it here
EXPOSE 10000

# Use node directly (avoids npm which re-runs lifecycle scripts on start)
CMD ["node", "dist/src/index.js"]
