-- CreateTable for ReservationAddon
CREATE TABLE "public"."ReservationAddon" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationAddon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationAddon_reservationId_idx" ON "public"."ReservationAddon"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationAddon_type_idx" ON "public"."ReservationAddon"("type");

-- AddForeignKey
ALTER TABLE "public"."ReservationAddon" ADD CONSTRAINT "ReservationAddon_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

