/*
  Warnings:

  - The values [FRONT_DESK,HOUSEKEEPING,MAINTENANCE,MANAGER,ADMIN] on the enum `EmployeeRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [IN_APP,EMAIL,SMS] on the enum `NotificationChannel` will be removed. If these variants are still used in the database, this will fail.
  - The values [ROOM_SERVICE_REQUEST,ROOM_CHANGE_REQUEST,SPECIAL_ACCOMMODATION_REQUEST,ROOM_MAINTENANCE_REQUEST,RESERVATION_STATUS_CHANGE,BOOKING_MODIFICATION,RESERVATION_CANCELLATION,NO_SHOW_DETECTED,CHECKIN_TIME_CHANGE,CHECKOUT_TIME_CHANGE,PAYMENT_FAILURE,CREDIT_CARD_DECLINED,REFUND_PROCESSING_ISSUE,CHARGEBACK_NOTIFICATION,CLEANING_REQUEST,HOUSEKEEPING_STATUS_UPDATE,SUPPLY_REQUEST,LOST_FOUND_ITEM,EQUIPMENT_FAILURE,REPAIR_REQUEST,SAFETY_ISSUE,PREVENTIVE_MAINTENANCE_DUE,DAILY_REVENUE_SUMMARY,BOOKING_PERFORMANCE_SUMMARY,GUEST_SATISFACTION_SUMMARY,STAFF_PERFORMANCE_SUMMARY,ROOM_OCCUPANCY_SUMMARY] on the enum `NotificationEventType` will be removed. If these variants are still used in the database, this will fail.
  - The values [IMMEDIATE,DAILY_SUMMARY] on the enum `NotificationPriority` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING,SENT,DELIVERED,READ,FAILED] on the enum `NotificationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."EmployeeRole_new" AS ENUM ('front_desk', 'housekeeping', 'maintenance', 'manager', 'admin');
ALTER TABLE "public"."notification_logs" ALTER COLUMN "recipientRole" TYPE "public"."EmployeeRole_new" USING ("recipientRole"::text::"public"."EmployeeRole_new");
ALTER TYPE "public"."EmployeeRole" RENAME TO "EmployeeRole_old";
ALTER TYPE "public"."EmployeeRole_new" RENAME TO "EmployeeRole";
DROP TYPE "public"."EmployeeRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationChannel_new" AS ENUM ('in_app', 'email', 'sms');
ALTER TABLE "public"."notification_logs" ALTER COLUMN "channel" TYPE "public"."NotificationChannel_new" USING ("channel"::text::"public"."NotificationChannel_new");
ALTER TYPE "public"."NotificationChannel" RENAME TO "NotificationChannel_old";
ALTER TYPE "public"."NotificationChannel_new" RENAME TO "NotificationChannel";
DROP TYPE "public"."NotificationChannel_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationEventType_new" AS ENUM ('room_service_request', 'room_change_request', 'special_accommodation_request', 'room_maintenance_request', 'reservation_status_change', 'booking_modification', 'reservation_cancellation', 'no_show_detected', 'checkin_time_change', 'checkout_time_change', 'payment_failure', 'credit_card_declined', 'refund_processing_issue', 'chargeback_notification', 'cleaning_request', 'housekeeping_status_update', 'supply_request', 'lost_found_item', 'equipment_failure', 'repair_request', 'safety_issue', 'preventive_maintenance_due', 'daily_revenue_summary', 'booking_performance_summary', 'guest_satisfaction_summary', 'staff_performance_summary', 'room_occupancy_summary');
ALTER TABLE "public"."notification_rules" ALTER COLUMN "eventType" TYPE "public"."NotificationEventType_new" USING ("eventType"::text::"public"."NotificationEventType_new");
ALTER TABLE "public"."notification_logs" ALTER COLUMN "eventType" TYPE "public"."NotificationEventType_new" USING ("eventType"::text::"public"."NotificationEventType_new");
ALTER TYPE "public"."NotificationEventType" RENAME TO "NotificationEventType_old";
ALTER TYPE "public"."NotificationEventType_new" RENAME TO "NotificationEventType";
DROP TYPE "public"."NotificationEventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationPriority_new" AS ENUM ('immediate', 'daily_summary');
ALTER TABLE "public"."notification_rules" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "public"."notification_rules" ALTER COLUMN "priority" TYPE "public"."NotificationPriority_new" USING ("priority"::text::"public"."NotificationPriority_new");
ALTER TABLE "public"."notification_logs" ALTER COLUMN "priority" TYPE "public"."NotificationPriority_new" USING ("priority"::text::"public"."NotificationPriority_new");
ALTER TYPE "public"."NotificationPriority" RENAME TO "NotificationPriority_old";
ALTER TYPE "public"."NotificationPriority_new" RENAME TO "NotificationPriority";
DROP TYPE "public"."NotificationPriority_old";
ALTER TABLE "public"."notification_rules" ALTER COLUMN "priority" SET DEFAULT 'immediate';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationStatus_new" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
ALTER TABLE "public"."notification_logs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."notification_logs" ALTER COLUMN "status" TYPE "public"."NotificationStatus_new" USING ("status"::text::"public"."NotificationStatus_new");
ALTER TYPE "public"."NotificationStatus" RENAME TO "NotificationStatus_old";
ALTER TYPE "public"."NotificationStatus_new" RENAME TO "NotificationStatus";
DROP TYPE "public"."NotificationStatus_old";
ALTER TABLE "public"."notification_logs" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "public"."notification_logs" ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "public"."notification_rules" ALTER COLUMN "priority" SET DEFAULT 'immediate';
