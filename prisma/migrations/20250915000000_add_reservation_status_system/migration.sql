-- Migration: Add Reservation Status System
-- This migration adds the enhanced reservation status system with audit trail

-- Add new columns to Reservation table
ALTER TABLE "public"."Reservation" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "public"."Reservation" ADD COLUMN IF NOT EXISTS "checkedOutAt" TIMESTAMP(3);
ALTER TABLE "public"."Reservation" ADD COLUMN IF NOT EXISTS "statusUpdatedBy" TEXT;
ALTER TABLE "public"."Reservation" ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."Reservation" ADD COLUMN IF NOT EXISTS "statusChangeReason" TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS "Reservation_status_idx" ON "public"."Reservation"("status");
CREATE INDEX IF NOT EXISTS "Reservation_statusUpdatedAt_idx" ON "public"."Reservation"("statusUpdatedAt");

-- Create ReservationStatusHistory table for audit trail
CREATE TABLE IF NOT EXISTS "public"."ReservationStatusHistory" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "previousStatus" "public"."ReservationStatus",
    "newStatus" "public"."ReservationStatus" NOT NULL,
    "changedBy" TEXT,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReservationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- Add indexes for ReservationStatusHistory
CREATE INDEX IF NOT EXISTS "ReservationStatusHistory_reservationId_idx" ON "public"."ReservationStatusHistory"("reservationId");
CREATE INDEX IF NOT EXISTS "ReservationStatusHistory_changedAt_idx" ON "public"."ReservationStatusHistory"("changedAt");
CREATE INDEX IF NOT EXISTS "ReservationStatusHistory_newStatus_idx" ON "public"."ReservationStatusHistory"("newStatus");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ReservationStatusHistory_reservationId_fkey'
    ) THEN
        ALTER TABLE "public"."ReservationStatusHistory"
        ADD CONSTRAINT "ReservationStatusHistory_reservationId_fkey"
        FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


