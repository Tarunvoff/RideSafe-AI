-- CreateEnum
CREATE TYPE "BillingMandateStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PremiumInvoiceStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'WAIVED');

-- CreateEnum
CREATE TYPE "ChargeAttemptStatus" AS ENUM ('STARTED', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ClaimCaseStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "TriggerDecision" AS ENUM ('APPROVED', 'HOLD', 'REJECTED');

-- CreateTable
CREATE TABLE "billing_mandates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "providerMandateId" TEXT,
    "status" "BillingMandateStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextChargeAt" TIMESTAMP(3) NOT NULL,
    "lastChargedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_mandates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_invoices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "mandateId" TEXT,
    "billing_cycle_start" TIMESTAMP(3) NOT NULL,
    "billing_cycle_end" TIMESTAMP(3) NOT NULL,
    "amount_due" DOUBLE PRECISION NOT NULL,
    "amount_paid" DOUBLE PRECISION DEFAULT 0,
    "status" "PremiumInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "correlation_id" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premium_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_charge_attempts" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "status" "ChargeAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "gateway_provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "gateway_reference" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "correlation_id" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premium_charge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_ledger_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "correlation_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "premium_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "disruptionEventId" TEXT NOT NULL,
    "payoutId" TEXT,
    "status" "ClaimCaseStatus" NOT NULL DEFAULT 'OPEN',
    "reasonCode" TEXT,
    "fraudScore" DOUBLE PRECISION,
    "decisionNote" TEXT,
    "correlation_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trigger_event_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "policyId" TEXT,
    "disruptionEventId" TEXT,
    "h3_cell" TEXT NOT NULL,
    "decision" "TriggerDecision" NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "riskScore" DOUBLE PRECISION,
    "correlation_id" TEXT,
    "event_timestamp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trigger_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_mandates_userId_status_idx" ON "billing_mandates"("userId", "status");

-- CreateIndex
CREATE INDEX "billing_mandates_policyId_status_idx" ON "billing_mandates"("policyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "premium_invoices_policyId_billing_cycle_start_key" ON "premium_invoices"("policyId", "billing_cycle_start");

-- CreateIndex
CREATE INDEX "premium_invoices_userId_status_due_at_idx" ON "premium_invoices"("userId", "status", "due_at");

-- CreateIndex
CREATE INDEX "premium_invoices_status_due_at_idx" ON "premium_invoices"("status", "due_at");

-- CreateIndex
CREATE INDEX "premium_charge_attempts_invoiceId_attempt_number_idx" ON "premium_charge_attempts"("invoiceId", "attempt_number");

-- CreateIndex
CREATE INDEX "premium_charge_attempts_status_createdAt_idx" ON "premium_charge_attempts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "premium_ledger_entries_userId_createdAt_idx" ON "premium_ledger_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "premium_ledger_entries_policyId_createdAt_idx" ON "premium_ledger_entries"("policyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "claim_cases_payoutId_key" ON "claim_cases"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_cases_policyId_disruptionEventId_key" ON "claim_cases"("policyId", "disruptionEventId");

-- CreateIndex
CREATE INDEX "claim_cases_userId_status_createdAt_idx" ON "claim_cases"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "trigger_event_logs_h3_cell_createdAt_idx" ON "trigger_event_logs"("h3_cell", "createdAt");

-- CreateIndex
CREATE INDEX "trigger_event_logs_decision_createdAt_idx" ON "trigger_event_logs"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "trigger_event_logs_userId_createdAt_idx" ON "trigger_event_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "billing_mandates" ADD CONSTRAINT "billing_mandates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_mandates" ADD CONSTRAINT "billing_mandates_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_invoices" ADD CONSTRAINT "premium_invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_invoices" ADD CONSTRAINT "premium_invoices_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_invoices" ADD CONSTRAINT "premium_invoices_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "billing_mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_charge_attempts" ADD CONSTRAINT "premium_charge_attempts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "premium_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_ledger_entries" ADD CONSTRAINT "premium_ledger_entries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "premium_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_cases" ADD CONSTRAINT "claim_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_cases" ADD CONSTRAINT "claim_cases_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_cases" ADD CONSTRAINT "claim_cases_disruptionEventId_fkey" FOREIGN KEY ("disruptionEventId") REFERENCES "disruption_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_cases" ADD CONSTRAINT "claim_cases_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trigger_event_logs" ADD CONSTRAINT "trigger_event_logs_disruptionEventId_fkey" FOREIGN KEY ("disruptionEventId") REFERENCES "disruption_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
