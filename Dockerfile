# ==============================================================================
# YouTube Channel Manager - Multi-Stage Production Dockerfile
# Image: ibraransaridocker/yt-manager-app
# Node.js 20 Alpine High Performance Container
# ==============================================================================

FROM node:20-alpine AS base

# Install curl for container health check
RUN apk add --no-cache curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code and public web client
COPY src/ ./src/
COPY public/ ./public/
COPY database/ ./database/
COPY sql11-10-2026_data.sql ./

# Create non-root node user for enhanced cyber security
USER node

# Expose customizable application server port
EXPOSE 3000

# Container Healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start High-Performance Express Node.js Server
CMD ["node", "src/server.js"]
