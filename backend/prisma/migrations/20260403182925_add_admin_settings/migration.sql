-- CreateTable
CREATE TABLE "admin_settings" (
    "id" TEXT NOT NULL,
    "alertThresholds" JSONB NOT NULL,
    "riskConfig" JSONB NOT NULL,
    "planConfig" JSONB NOT NULL,
    "verificationSettings" JSONB NOT NULL,
    "notifications" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);
