FROM node:18-alpine

# Install build dependencies (sometimes needed for npm installs)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies with flags to save memory
RUN npm install --no-audit --no-fund

# Copy source
COPY backend/ .

# Build
RUN npm run build

# Final cleanup of dev dependencies to save space
RUN npm prune --production

ENV PORT=8080
EXPOSE 8080

CMD [ "npm", "start" ]
