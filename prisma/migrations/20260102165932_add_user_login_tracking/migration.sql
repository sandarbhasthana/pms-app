-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
