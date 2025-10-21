/*
  Warnings:

  - Added the required column `propertyId` to the `ReservationStatusHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ReservationStatusHistory" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "propertyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ReservationStatusHistory_propertyId_idx" ON "public"."ReservationStatusHistory"("propertyId");

-- CreateIndex
CREATE INDEX "ReservationStatusHistory_changedBy_idx" ON "public"."ReservationStatusHistory"("changedBy");

-- AddForeignKey
ALTER TABLE "public"."ReservationStatusHistory" ADD CONSTRAINT "ReservationStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationStatusHistory" ADD CONSTRAINT "ReservationStatusHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
