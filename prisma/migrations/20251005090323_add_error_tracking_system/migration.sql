/*
  Warnings:

  - You are about to drop the column `errorMessage` on the `error_logs` table. All the data in the column will be lost.
  - You are about to drop the column `errorType` on the `error_logs` table. All the data in the column will be lost.
  - You are about to drop the column `isResolved` on the `error_logs` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `error_logs` table. All the data in the column will be lost.
  - You are about to drop the column `requestBody` on the `error_logs` table. All the data in the column will be lost.
  - Added the required column `message` to the `error_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `error_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `error_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ErrorSeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "public"."ErrorCategory" AS ENUM ('system', 'database', 'payment', 'queue', 'api', 'validation', 'authentication', 'authorization', 'business_logic', 'integration', 'notification', 'reservation', 'user_action');

-- CreateEnum
CREATE TYPE "public"."ErrorStatus" AS ENUM ('open', 'in_progress', 'resolved', 'ignored', 'duplicate');

-- DropIndex
DROP INDEX "public"."error_logs_createdAt_idx";

-- DropIndex
DROP INDEX "public"."error_logs_errorType_idx";

-- DropIndex
DROP INDEX "public"."error_logs_isResolved_idx";

-- AlterTable
ALTER TABLE "public"."error_logs" DROP COLUMN "errorMessage",
DROP COLUMN "errorType",
DROP COLUMN "isResolved",
DROP COLUMN "method",
DROP COLUMN "requestBody",
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "category" "public"."ErrorCategory" NOT NULL DEFAULT 'system',
ADD COLUMN     "context" JSONB,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "propertyId" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "service" TEXT,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "severity" "public"."ErrorSeverity" NOT NULL DEFAULT 'medium',
ADD COLUMN     "status" "public"."ErrorStatus" NOT NULL DEFAULT 'open',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."error_occurrences" (
    "id" TEXT NOT NULL,
    "errorLogId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,
    "userId" TEXT,
    "requestId" TEXT,

    CONSTRAINT "error_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."error_alerts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "severity" "public"."ErrorSeverity"[],
    "category" "public"."ErrorCategory"[],
    "services" TEXT[],
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "timeWindow" INTEGER NOT NULL DEFAULT 300,
    "cooldown" INTEGER NOT NULL DEFAULT 3600,
    "channels" JSONB NOT NULL,
    "recipients" JSONB NOT NULL,
    "propertyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTriggered" TIMESTAMP(3),

    CONSTRAINT "error_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_occurrences_errorLogId_occurredAt_idx" ON "public"."error_occurrences"("errorLogId", "occurredAt");

-- CreateIndex
CREATE INDEX "error_logs_severity_createdAt_idx" ON "public"."error_logs"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_category_createdAt_idx" ON "public"."error_logs"("category", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_organizationId_createdAt_idx" ON "public"."error_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_propertyId_createdAt_idx" ON "public"."error_logs"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_status_idx" ON "public"."error_logs"("status");

-- AddForeignKey
ALTER TABLE "public"."error_logs" ADD CONSTRAINT "error_logs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_logs" ADD CONSTRAINT "error_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_logs" ADD CONSTRAINT "error_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_logs" ADD CONSTRAINT "error_logs_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_logs" ADD CONSTRAINT "error_logs_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_occurrences" ADD CONSTRAINT "error_occurrences_errorLogId_fkey" FOREIGN KEY ("errorLogId") REFERENCES "public"."error_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_occurrences" ADD CONSTRAINT "error_occurrences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_alerts" ADD CONSTRAINT "error_alerts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_alerts" ADD CONSTRAINT "error_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."error_alerts" ADD CONSTRAINT "error_alerts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
