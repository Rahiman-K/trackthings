FROM node:18-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install and build client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy server
COPY server/ ./server/
COPY data/.gitkeep ./data/

# Create data directory
RUN mkdir -p /app/data

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
