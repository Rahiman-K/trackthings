FROM node:18-alpine

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --only=production

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

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
