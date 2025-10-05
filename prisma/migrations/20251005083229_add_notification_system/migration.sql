-- CreateEnum
CREATE TYPE "public"."NotificationEventType" AS ENUM ('ROOM_SERVICE_REQUEST', 'ROOM_CHANGE_REQUEST', 'SPECIAL_ACCOMMODATION_REQUEST', 'ROOM_MAINTENANCE_REQUEST', 'RESERVATION_STATUS_CHANGE', 'BOOKING_MODIFICATION', 'RESERVATION_CANCELLATION', 'NO_SHOW_DETECTED', 'CHECKIN_TIME_CHANGE', 'CHECKOUT_TIME_CHANGE', 'PAYMENT_FAILURE', 'CREDIT_CARD_DECLINED', 'REFUND_PROCESSING_ISSUE', 'CHARGEBACK_NOTIFICATION', 'CLEANING_REQUEST', 'HOUSEKEEPING_STATUS_UPDATE', 'SUPPLY_REQUEST', 'LOST_FOUND_ITEM', 'EQUIPMENT_FAILURE', 'REPAIR_REQUEST', 'SAFETY_ISSUE', 'PREVENTIVE_MAINTENANCE_DUE', 'DAILY_REVENUE_SUMMARY', 'BOOKING_PERFORMANCE_SUMMARY', 'GUEST_SATISFACTION_SUMMARY', 'STAFF_PERFORMANCE_SUMMARY', 'ROOM_OCCUPANCY_SUMMARY');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('IMMEDIATE', 'DAILY_SUMMARY');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "public"."EmployeeRole" AS ENUM ('FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "public"."notification_rules" (
    "id" TEXT NOT NULL,
    "eventType" "public"."NotificationEventType" NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'IMMEDIATE',
    "targetRoles" JSONB NOT NULL,
    "channels" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "template" JSONB NOT NULL,
    "throttling" JSONB,
    "propertyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_logs" (
    "id" TEXT NOT NULL,
    "eventType" "public"."NotificationEventType" NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientRole" "public"."EmployeeRole" NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "propertyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "eventSubscriptions" JSONB NOT NULL,
    "quietHours" JSONB,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_userId_key" ON "public"."user_notification_preferences"("userId");

-- AddForeignKey
ALTER TABLE "public"."notification_rules" ADD CONSTRAINT "notification_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_rules" ADD CONSTRAINT "notification_rules_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_rules" ADD CONSTRAINT "notification_rules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_rules" ADD CONSTRAINT "notification_rules_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_logs" ADD CONSTRAINT "notification_logs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_logs" ADD CONSTRAINT "notification_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_logs" ADD CONSTRAINT "notification_logs_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
