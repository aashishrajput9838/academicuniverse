FROM node:18

# Create app directory
WORKDIR /app

# Copy package files from the backend folder
COPY backend/package*.json ./

# Install dependencies (use --frozen-lockfile if you had one, but this is safer for now)
RUN npm install

# Copy all files from the backend folder
COPY backend/ .

# Build the TypeScript code
RUN npm run build

# Expose the listening port
ENV PORT=8080
EXPOSE 8080

# Start it
CMD [ "npm", "start" ]
