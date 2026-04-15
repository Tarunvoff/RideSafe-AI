-- CreateTable
CREATE TABLE "claim_fingerprints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "h3_cell" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "claim_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_bucket" INTEGER NOT NULL,
    "time_bucket" INTEGER NOT NULL,
    "fingerprint_hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claim_fingerprints_fingerprint_hash_createdAt_idx" ON "claim_fingerprints"("fingerprint_hash", "createdAt");

-- CreateIndex
CREATE INDEX "claim_fingerprints_userId_createdAt_idx" ON "claim_fingerprints"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "claim_fingerprints_userId_fingerprint_hash_time_bucket_key" ON "claim_fingerprints"("userId", "fingerprint_hash", "time_bucket");

-- AddForeignKey
ALTER TABLE "claim_fingerprints" ADD CONSTRAINT "claim_fingerprints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
