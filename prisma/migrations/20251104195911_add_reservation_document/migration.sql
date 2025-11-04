-- CreateEnum
CREATE TYPE "public"."DocumentTag" AS ENUM ('ID_DOCUMENT', 'ID_SCAN', 'INVOICE', 'CONTRACT', 'RECEIPT', 'AGREEMENT', 'PHOTO', 'OTHER');

-- CreateTable
CREATE TABLE "public"."ReservationDocument" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tag" "public"."DocumentTag" NOT NULL DEFAULT 'OTHER',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationDocument_reservationId_idx" ON "public"."ReservationDocument"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationDocument_propertyId_idx" ON "public"."ReservationDocument"("propertyId");

-- CreateIndex
CREATE INDEX "ReservationDocument_uploadedBy_idx" ON "public"."ReservationDocument"("uploadedBy");

-- CreateIndex
CREATE INDEX "ReservationDocument_tag_idx" ON "public"."ReservationDocument"("tag");

-- CreateIndex
CREATE INDEX "ReservationDocument_createdAt_idx" ON "public"."ReservationDocument"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ReservationDocument" ADD CONSTRAINT "ReservationDocument_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationDocument" ADD CONSTRAINT "ReservationDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationDocument" ADD CONSTRAINT "ReservationDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
