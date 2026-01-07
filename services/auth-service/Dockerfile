FROM node:20-alpine

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services/auth-service ./services/auth-service

# Install dependencies
RUN npm install

# Build shared packages first
RUN npm run build --workspace=@sustainpro/shared-types
RUN npm run build --workspace=@sustainpro/shared-utils
RUN npm run build --workspace=@sustainpro/shared-middleware

# Build auth service
RUN npm run build --workspace=@sustainpro/auth-service

WORKDIR /app/services/auth-service

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the service
CMD ["node", "dist/server.js"]
