# DevOps and Infrastructure Audit Report

An infrastructure and DevOps audit of the `ridesafe-ai` codebase reveals critical architectural gaps that break the "clone-and-run" expectation. Despite containerizing the applications individually, there is no orchestration combining the data layer with the backend and ML services.

## 1. Dockerfile Issues Table

| File | Issue | Severity |
| :--- | :--- | :--- |
| `backend/Dockerfile` | **Production image bloat**: Stage 1 installs `devDependencies` and the builder stage passes the unmodified `node_modules` to Stage 3 without running `npm prune --production` or `npm ci --omit=dev`. | Medium |
| `backend/Dockerfile` | **Prisma Native Binaries**: Missing explicit architecture/platform flags for Prisma engines (can fail if built on Mac M1/M2 but run on Linux x86). | Medium |
| `ml-services/*/Dockerfile` | **No Multi-stage builds**: Uses single stages (e.g. `FROM python:3.11-slim`), carrying build dependencies (`gcc`, `build-essential`) over to the final runtime. | Medium |
| All Dockerfiles | **Root user by default (ML)**: Python services do not define a non-root `USER` and run as root, unlike the Node backend which correctly implements `appuser`. | High |
| All Dockerfiles | **Base Images**: Images are correctly pinned (e.g., `node:20-alpine`, `python:3.11-slim`), which provides good reproducible build foundations. | Info |

## 2. Docker-Compose Issues Table

| Service | Issue | Severity |
| :--- | :--- | :--- |
| **All App Services** | **MISSING ENTIRELY**: The `backend`, `frontend`, and all `ml-services` are **not included** in the compose file. | **CRITICAL** |
| `timescaledb` | Hardcoded `POSTGRES_PASSWORD: 12345678` without an `.env` variable mapping. | High 🔒 |
| `kafka` | Maps host Docker socket `volumes: - /var/run/docker.sock` explicitly. Fails on MacOS/Windows default configurations or systems with strict permission controls. | High |
| `kafka` / `zookeeper` | Hardcoded PLAINTEXT listener configurations for `0.0.0.0:9092` with advertised listener set exactly to `localhost:9092`, preventing inter-container networking resolving via bridge network aliases. | High |
| *Network* | No explicit `networks` defined; missing `network_mode` means app containers (if added) will struggle to address via DNS properly. | Low |
| *Healthchecks* | No `healthcheck` clauses explicitly mapped to `depends_on: condition: service_healthy` for order-dependent startup schemas. | Medium |

## 3. Missing / Undefined Environment Variables

Because the Compose file exclusively scaffolds infrastructure and apps are missing from it, there is no centralized `.env` ingestion. Code points indicate the apps expect the following undocumented/unmapped variables to not crash:
- `DATABASE_URL`: Expected by Prisma in the backend.
- `KAFKA_BROKERS`: For Kafka ingestion connectivity (usually `localhost:9092`).
- `REDIS_URL`: For `redis:alpine` connection mapping.
- ML service specific ports/hosts (`FRAUD_SERVICE_URL`, `GRID_SERVICE_URL`, etc).

## 4. "Clone to Running Demo" Failure Points

If a judge simulates a demo run exactly using `docker-compose up --build`, they will encounter these failures in chronological order:

1. **Build Flag Ignored:** `docker-compose up --build` builds nothing because there are no `build:` directives in the `docker-compose.yml` file.
2. **Missing Applications:** The terminal outputs DB/Kafka logs, but navigating to `localhost:3001` or `localhost:8002` returns `ERR_CONNECTION_REFUSED` because the NestJS API and Python FastAPI services never launched.
3. **Kafka Socket Error:** Users on Windows/macOS running Docker Desktop without mapped socket permissions or running under rootless Docker will suffer a `kafka` container volume mount crash.
4. **Database Migration Failure:** The schema (`backend/prisma/schema.prisma`) is never automatically pushed to `timescaledb`. If the Apps were running, they would crash due to the missing Postgres `Aegis_DB` tables.
5. **Setup Scripts Obfuscation:** If the user attempts to run `/scripts/unix/start_all.sh` to bypass compose issues, they will discover the script content is commented out or misconfigured for complex tmux environments.
6. **No Pre-seeded Demo Data:** There's no Prisma seed initialization orchestrated on boot, making a zero-touch "trigger weather event" demo state impossible immediately after clone.

## 5. Security Issues

- **Hardcoded secrets committed to source:** `docker-compose.yml` holds `POSTGRES_PASSWORD: 12345678` explicitly.
- **Port Exposure:** Redis (`6379`), TimescaleDB (`5433`), Zookeeper (`2181`), and Kafka (`9092`) are bound directly to the host machine unauthenticated instead of being isolated to strict internal networks.
- **Docker Socket Mounted to Kafka Container:** An attacker compromising the `kafka` container gets `root` code-execution over the host Docker daemon.

## 6. Final Verdict

**CAN A JUDGE RUNTHIS IN 5 MINUTES?**
❌ **NO.** The project lacks a unified startup architecture.

**TO FIX:**
1. Move the API (`backend/Dockerfile`), ML services (`ml-services/*/Dockerfile`) into `docker-compose.yml` as `build: context: ...` services.
2. Add a `migration` dummy service that executes `npm run prisma:db:push && npm run prisma:db:seed` attached to `depends_on` the `timescaledb` service.
3. Aggregate all App-layer configurations into a `.env.example`.
4. Replace local `localhost` Kafka broker references with Docker internal DNS names inside the applications.
5. Update `README.md` to precisely give a single command: `cp .env.example .env && docker-compose up --build`, followed by the exact endpoints mapping the app stack.