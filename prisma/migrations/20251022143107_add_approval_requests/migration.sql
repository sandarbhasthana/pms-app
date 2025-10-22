-- CreateTable
CREATE TABLE "public"."ApprovalRequest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestReason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNotes" TEXT,
    "metadata" TEXT,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalRequest_reservationId_idx" ON "public"."ApprovalRequest"("reservationId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_propertyId_idx" ON "public"."ApprovalRequest"("propertyId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "public"."ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedAt_idx" ON "public"."ApprovalRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedBy_idx" ON "public"."ApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ApprovalRequest_approvedBy_idx" ON "public"."ApprovalRequest"("approvedBy");

-- AddForeignKey
ALTER TABLE "public"."ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
