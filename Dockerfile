# Multi-stage build for MCP-Safeguard with Semgrep
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Semgrep
RUN pip3 install --no-cache-dir semgrep==1.87.0

# Verify Semgrep installation
RUN semgrep --version

# Build stage
FROM base AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
# Copy every workspace package's manifest — pnpm --frozen-lockfile validates the
# lockfile against ALL workspace members declared in pnpm-workspace.yaml, so a
# missing manifest makes the install fail.
COPY packages/core/package.json ./packages/core/
COPY packages/cli/package.json ./packages/cli/
COPY packages/runtime/package.json ./packages/runtime/
COPY packages/semgrep-installer/package.json ./packages/semgrep-installer/
COPY packages/config-minimal/package.json ./packages/config-minimal/
COPY packages/config-recommended/package.json ./packages/config-recommended/
COPY packages/config-strict/package.json ./packages/config-strict/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY tsconfig.json ./

# Build all packages
RUN pnpm build

# Production stage
FROM base AS production

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files and built artifacts from builder.
# The lockfile is required for `--frozen-lockfile` to succeed.
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml* ./
COPY --from=builder /app/packages ./packages

# Install only production dependencies (built dist/ output is already copied above)
RUN pnpm install --prod --frozen-lockfile

# Create non-root user
RUN useradd -m -u 1000 mcpsafeguard && \
    chown -R mcpsafeguard:mcpsafeguard /app

USER mcpsafeguard

# Set environment variables
ENV NODE_ENV=production
ENV PATH="/app/packages/cli/dist:${PATH}"

# Create mount point for scanning
VOLUME ["/scan"]

# Set default working directory for scans
WORKDIR /scan

# Default entrypoint
ENTRYPOINT ["node", "/app/packages/cli/dist/index.js"]

# Default command (can be overridden)
CMD ["scan", "/scan"]
