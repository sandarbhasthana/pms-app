/*
  Warnings:

  - You are about to drop the column `channexPropertyId` on the `ChannexRatePlanMapping` table. All the data in the column will be lost.
  - You are about to drop the column `channexRoomTypeId` on the `ChannexRatePlanMapping` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roomTypeMappingId,channexRatePlanId]` on the table `ChannexRatePlanMapping` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roomTypeMappingId` to the `ChannexRatePlanMapping` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChannexRatePlanMapping" DROP CONSTRAINT "ChannexRatePlanMapping_channexPropertyId_fkey";

-- DropIndex
DROP INDEX "ChannexRatePlanMapping_channexPropertyId_channexRatePlanId_key";

-- DropIndex
DROP INDEX "ChannexRatePlanMapping_channexPropertyId_idx";

-- AlterTable
ALTER TABLE "ChannexRatePlanMapping" DROP COLUMN "channexPropertyId",
DROP COLUMN "channexRoomTypeId",
ADD COLUMN     "roomTypeMappingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ChannexRoomTypeMapping" ALTER COLUMN "channexRoomTypeId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ChannexRatePlanMapping_roomTypeMappingId_idx" ON "ChannexRatePlanMapping"("roomTypeMappingId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexRatePlanMapping_roomTypeMappingId_channexRatePlanId_key" ON "ChannexRatePlanMapping"("roomTypeMappingId", "channexRatePlanId");

-- AddForeignKey
ALTER TABLE "ChannexRatePlanMapping" ADD CONSTRAINT "ChannexRatePlanMapping_roomTypeMappingId_fkey" FOREIGN KEY ("roomTypeMappingId") REFERENCES "ChannexRoomTypeMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
