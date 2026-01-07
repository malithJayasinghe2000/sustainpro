FROM node:20-alpine

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/core-service ./services/core-service

# Install dependencies
RUN npm install

# Build shared packages first
RUN npm run build --workspace=@sustainpro/shared-types
RUN npm run build --workspace=@sustainpro/shared-utils
RUN npm run build --workspace=@sustainpro/shared-middleware

# Build core service
RUN npm run build --workspace=@sustainpro/core-service

WORKDIR /app/services/core-service

# Create uploads directory
RUN mkdir -p uploads/public

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start the service
CMD ["node", "dist/server.js"]
