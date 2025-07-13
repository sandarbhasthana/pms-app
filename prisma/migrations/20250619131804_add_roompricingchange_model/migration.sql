/*
  Warnings:

  - Added the required column `roomId` to the `RoomPricing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomPricing" ADD COLUMN     "roomId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "RoomPricing" ADD CONSTRAINT "RoomPricing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
