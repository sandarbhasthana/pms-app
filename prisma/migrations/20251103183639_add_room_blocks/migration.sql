-- CreateEnum
CREATE TYPE "public"."BlockType" AS ENUM ('MAINTENANCE', 'ISSUE', 'RENOVATION', 'CLEANING', 'OTHER');

-- CreateTable
CREATE TABLE "public"."RoomBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "blockType" "public"."BlockType" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomBlock_organizationId_idx" ON "public"."RoomBlock"("organizationId");

-- CreateIndex
CREATE INDEX "RoomBlock_propertyId_idx" ON "public"."RoomBlock"("propertyId");

-- CreateIndex
CREATE INDEX "RoomBlock_roomId_idx" ON "public"."RoomBlock"("roomId");

-- CreateIndex
CREATE INDEX "RoomBlock_startDate_idx" ON "public"."RoomBlock"("startDate");

-- CreateIndex
CREATE INDEX "RoomBlock_endDate_idx" ON "public"."RoomBlock"("endDate");

-- CreateIndex
CREATE INDEX "RoomBlock_createdBy_idx" ON "public"."RoomBlock"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."RoomBlock" ADD CONSTRAINT "RoomBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomBlock" ADD CONSTRAINT "RoomBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomBlock" ADD CONSTRAINT "RoomBlock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomBlock" ADD CONSTRAINT "RoomBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
