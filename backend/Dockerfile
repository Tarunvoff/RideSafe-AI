# =============================================================================
# Aegis NestJS API Gateway — multi-stage build
# Port: 3001
# Responsibilities: auth, telemetry, insurance, payments, KYC, fraud, payout,
#                   ingestion, state, trigger, notifications.
#
# Stage 1 (deps)    — install ALL node_modules (including devDependencies for build)
# Stage 2 (builder) — compile TypeScript → /dist, generate Prisma client
# Stage 3 (runtime) — copy only the production artefacts; ~3× smaller image
# =============================================================================

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install native build tools for bcrypt
RUN apk add --no-cache make gcc g++ python3

# Copy manifests only — Docker will cache this layer until they change.
COPY package.json package-lock.json ./

# Install ALL deps (dev + prod) so the TypeScript compiler and NestJS CLI exist.
# We ignore scripts so Prisma doesn't crash (schema not copied yet),
# but we MUST rebuild bcrypt to get the native node module for Alpine.
RUN npm ci --ignore-scripts && npm rebuild bcrypt

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl

# Bring in node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy source, Prisma schema, and compiler config.
COPY . .

# Generate the Prisma client (writes to node_modules/@prisma/client).
# DATABASE_URL is not needed at build time for generate — only for migrations.
RUN npx prisma generate

# Compile TypeScript → dist/  (uses tsconfig.json outDir: ./dist)
RUN npm run build

# ── Stage 3: production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# The Prisma query engine for Alpine requires openssl available dynamically.
RUN apk add --no-cache openssl

# Create non-root user before copying files so ownership can be set in one step.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the compiled output and production node_modules.
COPY --from=builder --chown=appuser:appgroup /app/dist          ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules  ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json  ./package.json

# Copy the Prisma schema — needed by @prisma/client at runtime for query engine resolution.
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser

EXPOSE 3001

# Run the compiled JS directly — no NestJS CLI, no ts-node overhead.
CMD ["node", "dist/main"]
