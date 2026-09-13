# Multi-stage production Dockerfile for AgenC Web Dashboard SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configs
COPY package*.json ./
COPY tsconfig.json ./

# Copy packages needed for frontend build
COPY sdk ./sdk
COPY web ./web

# Install dependencies and build frontend bundle
RUN npm ci --ignore-scripts
RUN npm run build --workspace=@agenc/sdk
RUN npm run build --workspace=@agenc/web

# ==============================================================================
# Production Static Server (Nginx Alpine)
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA from builder
COPY --from=builder /app/web/dist /usr/share/nginx/html

# Copy custom reverse-proxy nginx configuration
COPY containers/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
