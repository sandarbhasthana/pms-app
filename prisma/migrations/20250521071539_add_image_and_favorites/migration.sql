-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_roomId_idx" ON "Favorite"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_roomId_key" ON "Favorite"("userId", "roomId");

-- CreateIndex
CREATE INDEX "Channel_organizationId_idx" ON "Channel"("organizationId");

-- CreateIndex
CREATE INDEX "Organization_domain_idx" ON "Organization"("domain");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_idx" ON "Reservation"("organizationId");

-- CreateIndex
CREATE INDEX "Reservation_roomId_idx" ON "Reservation"("roomId");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_channelId_idx" ON "Reservation"("channelId");

-- CreateIndex
CREATE INDEX "Room_organizationId_idx" ON "Room"("organizationId");

-- CreateIndex
CREATE INDEX "UserOrg_userId_idx" ON "UserOrg"("userId");

-- CreateIndex
CREATE INDEX "UserOrg_organizationId_idx" ON "UserOrg"("organizationId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
