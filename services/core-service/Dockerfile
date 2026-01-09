# ==========================================
# SustainPro Core Service Dockerfile
# Multi-stage build for optimized production image
# ==========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration files first (for layer caching)
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy shared packages
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/shared-middleware ./packages/shared-middleware
COPY packages/shared-database ./packages/shared-database
COPY packages/shared-swagger ./packages/shared-swagger

# Copy core service
COPY services/core-service ./services/core-service

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Build using turbo (handles dependency order automatically)
RUN npx turbo build --filter=@sustainpro/core-service

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sustainpro -u 1001

# Copy workspace files
COPY package.json package-lock.json ./

# Copy built shared packages
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist

COPY --from=builder /app/packages/shared-utils/package.json ./packages/shared-utils/
COPY --from=builder /app/packages/shared-utils/dist ./packages/shared-utils/dist

COPY --from=builder /app/packages/shared-middleware/package.json ./packages/shared-middleware/
COPY --from=builder /app/packages/shared-middleware/dist ./packages/shared-middleware/dist

COPY --from=builder /app/packages/shared-database/package.json ./packages/shared-database/
COPY --from=builder /app/packages/shared-database/dist ./packages/shared-database/dist

COPY --from=builder /app/packages/shared-swagger/package.json ./packages/shared-swagger/
COPY --from=builder /app/packages/shared-swagger/dist ./packages/shared-swagger/dist

# Copy built core service
COPY --from=builder /app/services/core-service/package.json ./services/core-service/
COPY --from=builder /app/services/core-service/dist ./services/core-service/dist

# Install production dependencies only
RUN npm ci --omit=dev

# Create uploads directory
RUN mkdir -p /app/services/core-service/uploads/public

# Set ownership
RUN chown -R sustainpro:nodejs /app

# Switch to non-root user
USER sustainpro

# Set working directory to service
WORKDIR /app/services/core-service

# Expose port
EXPOSE 5001

# Environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start the service
CMD ["node", "dist/server.js"]
