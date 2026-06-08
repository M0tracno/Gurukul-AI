# ============================================
# Backend Dockerfile — Multi-stage build
# Final image target: < 400 MB
# ============================================

# Stage 1: Build — Compile TypeScript to JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY config/ ./config/

# Compile TypeScript
RUN npm run build

# ============================================
# Stage 2: Production — Minimal runtime image
FROM node:20-alpine AS production

# Set non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy config directory (legacy JS configs still needed at runtime)
COPY config/ ./config/

# Create logs directory
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/src/server.js"]
