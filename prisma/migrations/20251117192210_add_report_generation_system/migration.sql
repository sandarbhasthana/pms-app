-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('FINANCIAL', 'OPERATIONAL', 'HOUSEKEEPING', 'PERFORMANCE', 'GUEST_MARKETING', 'AUDIT_COMPLIANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('REVENUE_SUMMARY', 'PAYMENT_REPORT', 'REFUND_REPORT', 'TAX_REPORT', 'ACCOUNTS_RECEIVABLE', 'PROFIT_LOSS', 'INVOICE_REGISTER', 'DAILY_FLASH', 'NIGHT_AUDIT', 'OCCUPANCY', 'ARRIVALS', 'DEPARTURES', 'IN_HOUSE', 'NO_SHOW', 'CANCELLATION', 'ROOM_STATUS', 'HOUSEKEEPING_ASSIGNMENT', 'MAINTENANCE', 'TURNOVER', 'ADR_REPORT', 'REVPAR_REPORT', 'BOOKING_SOURCE', 'LENGTH_OF_STAY', 'RATE_ANALYSIS', 'FORECAST', 'PACE_REPORT', 'GUEST_DEMOGRAPHICS', 'REPEAT_GUEST', 'GUEST_SATISFACTION', 'MARKET_SEGMENT', 'BOOKING_LEAD_TIME', 'AUDIT_TRAIL', 'USER_ACTIVITY', 'COMPLIANCE', 'CREDIT_CARD', 'DISCREPANCY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ReportCategory" NOT NULL,
    "type" "ReportType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "templateId" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "format" "ExportFormat"[],
    "recipients" TEXT[],
    "subject" TEXT,
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "templateId" TEXT,
    "scheduleId" TEXT,
    "name" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "type" "ReportType" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "s3Key" TEXT,
    "status" "ReportStatus" NOT NULL,
    "error" TEXT,
    "generationTime" INTEGER,
    "recordCount" INTEGER,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ReportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportTemplate_organizationId_idx" ON "ReportTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ReportTemplate_propertyId_idx" ON "ReportTemplate"("propertyId");

-- CreateIndex
CREATE INDEX "ReportTemplate_category_idx" ON "ReportTemplate"("category");

-- CreateIndex
CREATE INDEX "ReportTemplate_type_idx" ON "ReportTemplate"("type");

-- CreateIndex
CREATE INDEX "ReportTemplate_isActive_idx" ON "ReportTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ReportSchedule_organizationId_idx" ON "ReportSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "ReportSchedule_propertyId_idx" ON "ReportSchedule"("propertyId");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRunAt_idx" ON "ReportSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "ReportSchedule_isActive_idx" ON "ReportSchedule"("isActive");

-- CreateIndex
CREATE INDEX "ReportHistory_organizationId_idx" ON "ReportHistory"("organizationId");

-- CreateIndex
CREATE INDEX "ReportHistory_propertyId_idx" ON "ReportHistory"("propertyId");

-- CreateIndex
CREATE INDEX "ReportHistory_generatedAt_idx" ON "ReportHistory"("generatedAt");

-- CreateIndex
CREATE INDEX "ReportHistory_status_idx" ON "ReportHistory"("status");

-- CreateIndex
CREATE INDEX "ReportHistory_expiresAt_idx" ON "ReportHistory"("expiresAt");

-- CreateIndex
CREATE INDEX "ReportHistory_type_idx" ON "ReportHistory"("type");

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
