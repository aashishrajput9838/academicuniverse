FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package files from the backend folder
COPY backend/package*.json ./

# Install dependencies (using --network-timeout to prevent unexpected errors)
RUN npm install --network-timeout=100000

# Copy all files from the backend folder
COPY backend/ .

# Build the TypeScript code
RUN npm run build

# Expose the listening port
ENV PORT=8080
EXPOSE 8080

# Start it from the compiled dist folder
CMD [ "npm", "start" ]
