# Multi-stage production Dockerfile for @agenc/runtime
# Base: Node 22 LTS on Alpine Linux (minimal attack surface, non-root user)

FROM node:22-alpine AS builder

WORKDIR /app

# Install build prerequisites for native addons if needed
RUN apk add --no-cache python3 make g++ git

# Copy root workspace manifests
COPY package*.json ./
COPY tsconfig.json ./

# Copy packages needed for build
COPY sdk ./sdk
COPY runtime ./runtime

# Install dependencies and build typescript packages
RUN npm ci --ignore-scripts
RUN npm run build --workspace=@agenc/sdk
RUN npm run build --workspace=@agenc/runtime

# ==============================================================================
# Production Runner
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100

# Install curl for healthcheck
RUN apk add --no-cache curl ca-certificates

# Create non-root agenc user
RUN addgroup -S agenc && adduser -S agenc -G agenc && \
    mkdir -p /home/agenc/.agenc /app/data && \
    chown -R agenc:agenc /home/agenc /app

# Copy built runtime and dependencies from builder
COPY --from=builder --chown=agenc:agenc /app/node_modules ./node_modules
COPY --from=builder --chown=agenc:agenc /app/sdk/dist ./sdk/dist
COPY --from=builder --chown=agenc:agenc /app/sdk/package.json ./sdk/package.json
COPY --from=builder --chown=agenc:agenc /app/runtime/dist ./runtime/dist
COPY --from=builder --chown=agenc:agenc /app/runtime/package.json ./runtime/package.json
COPY --from=builder --chown=agenc:agenc /app/package.json ./package.json

USER agenc

EXPOSE 3100

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3100/healthz || exit 1

ENTRYPOINT ["node", "runtime/dist/bin/agenc-runtime.js"]
CMD ["start", "--foreground"]
