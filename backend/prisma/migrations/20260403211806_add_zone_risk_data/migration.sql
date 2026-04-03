-- CreateTable
CREATE TABLE "zone_risk_data" (
    "id" TEXT NOT NULL,
    "h3_cell" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "rainfall" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "aqi" INTEGER NOT NULL,
    "floodChance" TEXT NOT NULL,
    "disruptionScore" DOUBLE PRECISION NOT NULL,
    "trafficStatus" TEXT NOT NULL,
    "activeRiders" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_risk_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zone_risk_data_h3_cell_key" ON "zone_risk_data"("h3_cell");

-- CreateIndex
CREATE INDEX "zone_risk_data_h3_cell_idx" ON "zone_risk_data"("h3_cell");
