FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the listening port
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD [ "npm", "start" ]
