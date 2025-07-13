-- CreateTable
CREATE TABLE "PropertySettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "phoneCode" TEXT,
    "propertyPhone" TEXT NOT NULL,
    "propertyEmail" TEXT NOT NULL,
    "propertyWebsite" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "suite" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photos" JSONB,
    "printHeader" TEXT,
    "printHeaderImage" TEXT,
    "description" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertySettings_orgId_key" ON "PropertySettings"("orgId");
