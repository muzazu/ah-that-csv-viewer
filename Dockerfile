# Multi-stage Dockerfile for CSV Viewer
# Builder stage: Node 25 with full toolchain for install and build
# Runtime stage: Distroless base for minimal footprint and security

# ============================================================================
# BUILDER STAGE
# ============================================================================
FROM node:25-alpine AS builder

# Install system dependencies needed for build
RUN apk add --no-cache python3 make g++ curl git

WORKDIR /build

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
# Note: vp CLI is installed globally, but we'll use pnpm directly for build
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source and config files
COPY . .

# Build the application
RUN pnpm run build

# ============================================================================
# RUNTIME STAGE 
# ============================================================================
FROM node:25-alpine AS runtime

WORKDIR /app

# Alpine-specific user and group creation
RUN addgroup -S nonroot && adduser -S nonroot -G nonroot && \
  mkdir -p /data && chown nonroot:nonroot /data && chmod 700 /data

# Copy built application from builder
COPY --from=builder --chown=nonroot:nonroot /build/.output /app/.output
COPY --from=builder --chown=nonroot:nonroot /build/node_modules /app/node_modules
COPY --from=builder --chown=nonroot:nonroot /build/package.json /app/package.json
COPY --from=builder --chown=nonroot:nonroot /build/drizzle /app/drizzle
COPY --from=builder --chown=nonroot:nonroot /build/drizzle.config.ts /app/drizzle.config.ts
COPY --chown=nonroot:nonroot docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 3000
USER nonroot

# Health check to ensure server is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
