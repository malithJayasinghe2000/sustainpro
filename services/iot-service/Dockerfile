FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-utils/package*.json ./packages/shared-utils/
COPY packages/shared-middleware/package*.json ./packages/shared-middleware/
COPY services/iot-service/package*.json ./services/iot-service/

# Install dependencies
RUN npm install

# Copy source files
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/shared-middleware ./packages/shared-middleware
COPY services/iot-service ./services/iot-service
COPY tsconfig.base.json ./

# Build all packages
RUN npm run build --workspace=@sustainpro/shared-types
RUN npm run build --workspace=@sustainpro/shared-utils
RUN npm run build --workspace=@sustainpro/shared-middleware
RUN npm run build --workspace=@sustainpro/iot-service

# Expose port
EXPOSE 5002

# Start service
CMD ["node", "services/iot-service/dist/server.js"]
