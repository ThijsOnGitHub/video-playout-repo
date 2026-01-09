# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create data and videos directories
RUN mkdir -p /app/data /videos

# Copy built application (Nitro outputs to .output/)
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json .

# Copy update script and make it executable
COPY update.sh /app/update.sh
RUN chmod +x /app/update.sh

# Set environment variables
ENV NODE_ENV=production
ENV DATA_PATH=/app/data
ENV OBS_WEBSOCKET_URL=ws://host.docker.internal:4455
ENV OBS_WEBSOCKET_PASSWORD=rtvserver
ENV VIDEO_BASE_PATH=/videos
ENV PORT=3000
# Docker self-update configuration (override these when running container)
ENV DOCKER_IMAGE_NAME=ghcr.io/thijsongithub/video-playout-repo/kabelkrant-manager-web
ENV DOCKER_IMAGE_TAG=latest
ENV DOCKER_CONTAINER_NAME=kabelkrant-manager-web
# Admin update endpoint password (CHANGE THIS!)
ENV UPDATE_PASSWORD=changeme

# Expose the port
EXPOSE 3000

# Start the server with Nitro
CMD ["node", ".output/server/index.mjs"]
