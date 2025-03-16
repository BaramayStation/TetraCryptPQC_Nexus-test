# Use Node.js 20 Alpine base image
FROM node:20-alpine

# Create non-root user with restricted permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -h /app -s /bin/false

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with security checks
RUN npm ci --only=dev --audit --fund

# Switch to non-root user
USER appuser

# Copy application code
COPY --chown=appuser:appgroup . .

# Health check for container
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD npm run test:healthcheck || exit 1

# Set default command with failover
CMD ["sh", "-c", "npm test || npm run test:fallback"]
