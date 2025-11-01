-- CreateEnum
CREATE TYPE "public"."LateCheckoutFeeType" AS ENUM ('FLAT_RATE', 'HOURLY', 'PERCENTAGE_OF_ROOM_RATE', 'PERCENTAGE_OF_TOTAL_BILL');

-- AlterEnum
ALTER TYPE "public"."ReservationStatus" ADD VALUE 'CHECKIN_DUE';

-- AlterTable
ALTER TABLE "public"."PropertySettings" ADD COLUMN     "auditLogRetentionDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "confirmationPendingTimeoutHours" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "lateCheckoutFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateCheckoutFeeType" "public"."LateCheckoutFeeType" NOT NULL DEFAULT 'FLAT_RATE',
ADD COLUMN     "lateCheckoutLookbackDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "noShowLookbackDays" INTEGER NOT NULL DEFAULT 3;
