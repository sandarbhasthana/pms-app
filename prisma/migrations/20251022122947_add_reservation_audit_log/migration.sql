-- CreateTable
CREATE TABLE "public"."ReservationAuditLog" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "ReservationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationAuditLog_reservationId_idx" ON "public"."ReservationAuditLog"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationAuditLog_propertyId_idx" ON "public"."ReservationAuditLog"("propertyId");

-- CreateIndex
CREATE INDEX "ReservationAuditLog_changedAt_idx" ON "public"."ReservationAuditLog"("changedAt");

-- CreateIndex
CREATE INDEX "ReservationAuditLog_action_idx" ON "public"."ReservationAuditLog"("action");

-- CreateIndex
CREATE INDEX "ReservationAuditLog_changedBy_idx" ON "public"."ReservationAuditLog"("changedBy");

-- AddForeignKey
ALTER TABLE "public"."ReservationAuditLog" ADD CONSTRAINT "ReservationAuditLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationAuditLog" ADD CONSTRAINT "ReservationAuditLog_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationAuditLog" ADD CONSTRAINT "ReservationAuditLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
