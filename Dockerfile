FROM node:20-slim

# Install essential build tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --no-audit --no-fund

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
