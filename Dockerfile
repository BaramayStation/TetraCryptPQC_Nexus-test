# Build Stage
FROM node:20-alpine AS builder

# Set environment variables for security and performance
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -h /app -s /bin/false

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./

# Install production dependencies with security checks (no caching issues)
RUN npm ci --omit=dev --no-cache --audit --fund && \
    rm -rf ~/.npm /tmp/* /var/cache/apk/*

# Copy application code after dependencies (optimizes caching)
COPY --chown=appuser:appgroup . .

# Run build process if needed
RUN npm run build

# Runtime Stage (Smaller Final Image)
FROM node:20-alpine

# Set environment variables for security
ENV NODE_ENV=production

# Create non-root user in runtime container
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -h /app -s /bin/false

# Set working directory
WORKDIR /app

# Copy built application and dependencies from build stage
COPY --from=builder /app .

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD npm run test:healthcheck || exit 1

# Expose default port (if applicable)
EXPOSE 3000

# Default startup command with automatic failover
CMD ["sh", "-c", "npm start || npm run test:fallback"]
