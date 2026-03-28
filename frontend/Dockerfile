# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

# Build arguments for Next.js public variables
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy package file
COPY package.json ./

# Install dependencies (generates lock file)
RUN npm install

# Copy source files
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with the API URL baked in
RUN npm run build

# Production stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
