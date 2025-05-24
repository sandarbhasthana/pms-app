/*
  Warnings:

  - A unique constraint covering the columns `[userId,organizationId]` on the table `UserOrg` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserOrg_userId_organizationId_key" ON "UserOrg"("userId", "organizationId");
