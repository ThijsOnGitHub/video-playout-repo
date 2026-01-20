# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Copy source code
COPY . .

# Build argument for Sentry source map uploads
ARG SENTRY_AUTH_TOKEN

# Build the application (NODE_ENV=production enables Sentry plugin)
RUN NODE_ENV=production npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create data and videos directories
RUN mkdir -p /app/data /videos

# Copy built application (Nitro outputs to .output/)
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json .

# Set environment variables
ENV NODE_ENV=production
ENV DATA_PATH=/app/data
ENV OBS_WEBSOCKET_URL=ws://host.docker.internal:4455
ENV OBS_WEBSOCKET_PASSWORD=rtvserver
ENV VIDEO_BASE_PATH=/videos
ENV PORT=80

# Expose the port
EXPOSE 80

# Start the server with Nitro
CMD ["node", ".output/server/index.mjs"]
