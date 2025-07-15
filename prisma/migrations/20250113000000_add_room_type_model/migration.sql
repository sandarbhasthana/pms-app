-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "privateOrDorm" TEXT NOT NULL DEFAULT 'private',
    "physicalOrVirtual" TEXT NOT NULL DEFAULT 'physical',
    "maxOccupancy" INTEGER NOT NULL DEFAULT 1,
    "maxAdults" INTEGER NOT NULL DEFAULT 1,
    "maxChildren" INTEGER NOT NULL DEFAULT 0,
    "adultsIncluded" INTEGER NOT NULL DEFAULT 1,
    "childrenIncluded" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "amenities" TEXT[],
    "customAmenities" TEXT[],
    "featuredImageUrl" TEXT,
    "additionalImageUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomType_organizationId_idx" ON "RoomType"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_organizationId_name_key" ON "RoomType"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add roomTypeId to Room table to link rooms to their type
ALTER TABLE "Room" ADD COLUMN "roomTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
