-- AlterTable
ALTER TABLE "kyc_payout_setup"
ADD COLUMN "financialDataConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "financialDataConsentAt" TIMESTAMP(3),
ADD COLUMN "consentVersion" TEXT;
