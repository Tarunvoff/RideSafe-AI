-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "bankReference" TEXT,
ADD COLUMN     "transferredAt" TIMESTAMP(3);
