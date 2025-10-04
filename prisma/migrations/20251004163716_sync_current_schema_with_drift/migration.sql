/*
  Warnings:

  - The values [PENDING,CHECKED_IN] on the enum `ReservationStatus` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `statusUpdatedAt` on table `Reservation` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."SystemActivityType" AS ENUM ('ORGANIZATION_CREATED', 'ORGANIZATION_DELETED', 'ORGANIZATION_UPDATED', 'USER_CREATED', 'USER_DELETED', 'USER_UPDATED', 'PROPERTY_CREATED', 'PROPERTY_DELETED', 'RESERVATION_CREATED', 'RESERVATION_CANCELLED', 'STRIPE_CONNECTED', 'STRIPE_DISCONNECTED', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELLED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_RESET', 'ONBOARDING_STARTED', 'ONBOARDING_COMPLETED', 'ONBOARDING_ABANDONED', 'SYSTEM_ERROR', 'SYSTEM_MAINTENANCE');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ReservationStatus_new" AS ENUM ('CONFIRMATION_PENDING', 'CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED');
ALTER TABLE "public"."Reservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Reservation" ALTER COLUMN "status" TYPE "public"."ReservationStatus_new" USING ("status"::text::"public"."ReservationStatus_new");
ALTER TABLE "public"."ReservationStatusHistory" ALTER COLUMN "previousStatus" TYPE "public"."ReservationStatus_new" USING ("previousStatus"::text::"public"."ReservationStatus_new");
ALTER TABLE "public"."ReservationStatusHistory" ALTER COLUMN "newStatus" TYPE "public"."ReservationStatus_new" USING ("newStatus"::text::"public"."ReservationStatus_new");
ALTER TYPE "public"."ReservationStatus" RENAME TO "ReservationStatus_old";
ALTER TYPE "public"."ReservationStatus_new" RENAME TO "ReservationStatus";
DROP TYPE "public"."ReservationStatus_old";
ALTER TABLE "public"."Reservation" ALTER COLUMN "status" SET DEFAULT 'CONFIRMATION_PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "contactAddress" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "size" TEXT;

-- AlterTable
ALTER TABLE "public"."PropertySettings" ADD COLUMN     "autoConfirmThreshold" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "checkInTime" TEXT NOT NULL DEFAULT '15:00',
ADD COLUMN     "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
ADD COLUMN     "enableAutoCheckin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableAutoConfirmation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableLateCheckoutDetection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableNoShowDetection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lateCheckoutGraceHours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "noShowGraceHours" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "notifyOnAutomationFailure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnLateCheckout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnNoShow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sameDayPaymentRequired" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "public"."Reservation" ALTER COLUMN "statusUpdatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "public"."UserOrg" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."system_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalOrganizations" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalProperties" INTEGER NOT NULL DEFAULT 0,
    "totalReservations" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalProperties" INTEGER NOT NULL DEFAULT 0,
    "totalReservations" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3),
    "monthlyActiveUsers" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "firstPropertyCreated" BOOLEAN NOT NULL DEFAULT false,
    "firstReservationMade" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_activities" (
    "id" TEXT NOT NULL,
    "activityType" "public"."SystemActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "performedBy" TEXT,
    "organizationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_tracking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "orgDetailsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "orgDetailsCompletedAt" TIMESTAMP(3),
    "adminUserCompleted" BOOLEAN NOT NULL DEFAULT false,
    "adminUserCompletedAt" TIMESTAMP(3),
    "reviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "reviewCompletedAt" TIMESTAMP(3),
    "firstLoginAt" TIMESTAMP(3),
    "firstPropertyCreatedAt" TIMESTAMP(3),
    "firstReservationAt" TIMESTAMP(3),
    "stripeConnectedAt" TIMESTAMP(3),
    "timeToComplete" INTEGER,
    "timeToFirstProperty" INTEGER,
    "timeToFirstReservation" INTEGER,
    "isAbandoned" BOOLEAN NOT NULL DEFAULT false,
    "abandonedAt" TIMESTAMP(3),
    "abandonedStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_health" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avgResponseTime" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "uptime" DOUBLE PRECISION NOT NULL,
    "dbConnections" INTEGER NOT NULL,
    "dbQueryTime" DOUBLE PRECISION NOT NULL,
    "memoryUsage" DOUBLE PRECISION NOT NULL,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "ongoingReservations" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."error_logs" (
    "id" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "requestBody" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_metrics_date_key" ON "public"."system_metrics"("date");

-- CreateIndex
CREATE INDEX "system_metrics_date_idx" ON "public"."system_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "organization_metrics_organizationId_key" ON "public"."organization_metrics"("organizationId");

-- CreateIndex
CREATE INDEX "organization_metrics_organizationId_idx" ON "public"."organization_metrics"("organizationId");

-- CreateIndex
CREATE INDEX "system_activities_activityType_idx" ON "public"."system_activities"("activityType");

-- CreateIndex
CREATE INDEX "system_activities_organizationId_idx" ON "public"."system_activities"("organizationId");

-- CreateIndex
CREATE INDEX "system_activities_performedBy_idx" ON "public"."system_activities"("performedBy");

-- CreateIndex
CREATE INDEX "system_activities_createdAt_idx" ON "public"."system_activities"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_tracking_organizationId_key" ON "public"."onboarding_tracking"("organizationId");

-- CreateIndex
CREATE INDEX "onboarding_tracking_organizationId_idx" ON "public"."onboarding_tracking"("organizationId");

-- CreateIndex
CREATE INDEX "onboarding_tracking_startedAt_idx" ON "public"."onboarding_tracking"("startedAt");

-- CreateIndex
CREATE INDEX "onboarding_tracking_completedAt_idx" ON "public"."onboarding_tracking"("completedAt");

-- CreateIndex
CREATE INDEX "system_health_timestamp_idx" ON "public"."system_health"("timestamp");

-- CreateIndex
CREATE INDEX "error_logs_errorType_idx" ON "public"."error_logs"("errorType");

-- CreateIndex
CREATE INDEX "error_logs_createdAt_idx" ON "public"."error_logs"("createdAt");

-- CreateIndex
CREATE INDEX "error_logs_isResolved_idx" ON "public"."error_logs"("isResolved");

-- AddForeignKey
ALTER TABLE "public"."organization_metrics" ADD CONSTRAINT "organization_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_activities" ADD CONSTRAINT "system_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_activities" ADD CONSTRAINT "system_activities_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onboarding_tracking" ADD CONSTRAINT "onboarding_tracking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
