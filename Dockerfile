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

# Install dependencies
RUN npm install --no-audit --no-fund

# Install Playwright browsers (Chromium) in a specific path
ENV PLAYWRIGHT_BROWSERS_PATH=/app/pw-browsers
RUN npx playwright install chromium

# Copy source
COPY backend/ .

# Build
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD [ "npm", "start" ]
