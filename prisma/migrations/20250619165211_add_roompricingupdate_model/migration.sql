/*
  Warnings:

  - You are about to drop the column `roomType` on the `RoomPricing` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roomId]` on the table `RoomPricing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "pricingId" TEXT;

-- AlterTable
ALTER TABLE "RoomPricing" DROP COLUMN "roomType",
ALTER COLUMN "mode" SET DEFAULT 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "RoomPricing_roomId_key" ON "RoomPricing"("roomId");
