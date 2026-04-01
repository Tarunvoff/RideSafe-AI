-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "weeklyPlanId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "driverName" TEXT;

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "maxPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 7,
    "eligibleDisruptionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disruption_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "expectedLoss" DOUBLE PRECISION,
    "expectedPayout" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disruption_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "disruptionEventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "estimatedLoss" DOUBLE PRECISION DEFAULT 0,
    "approvedPayout" DOUBLE PRECISION DEFAULT 0,
    "transactionId" TEXT,
    "paymentMethod" TEXT,
    "processingTime" TEXT,
    "timeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "razorpay_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razorpay_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plans_key_key" ON "weekly_plans"("key");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_policyId_disruptionEventId_key" ON "payouts"("policyId", "disruptionEventId");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_orders_razorpayOrderId_key" ON "razorpay_orders"("razorpayOrderId");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_disruptionEventId_fkey" FOREIGN KEY ("disruptionEventId") REFERENCES "disruption_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
