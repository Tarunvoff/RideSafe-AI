-- CreateTable
CREATE TABLE "zone_telemetry_logs" (
    "id" TEXT NOT NULL,
    "h3_cell" TEXT NOT NULL,
    "lf_score" DOUBLE PRECISION NOT NULL,
    "weather" TEXT,
    "aqi" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_telemetry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_idempotency_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "h3_cell" TEXT NOT NULL,
    "event_timestamp" INTEGER NOT NULL,
    "payout_state" TEXT NOT NULL DEFAULT 'PENDING',
    "payout_id" TEXT,
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kafka_dlq" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "event_key" TEXT,
    "payload" TEXT NOT NULL,
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kafka_dlq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zone_telemetry_logs_timestamp_idx" ON "zone_telemetry_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "payout_idempotency_keys_userId_idx" ON "payout_idempotency_keys"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payout_idempotency_keys_userId_h3_cell_event_timestamp_key" ON "payout_idempotency_keys"("userId", "h3_cell", "event_timestamp");

-- CreateIndex
CREATE INDEX "kafka_dlq_topic_status_idx" ON "kafka_dlq"("topic", "status");

-- CreateIndex
CREATE INDEX "kafka_dlq_createdAt_idx" ON "kafka_dlq"("createdAt");
