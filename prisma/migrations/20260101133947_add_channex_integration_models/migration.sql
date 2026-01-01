-- CreateEnum
CREATE TYPE "ChannexSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ChannexSyncType" AS ENUM ('ARI_PUSH', 'ARI_FULL_SYNC', 'BOOKING_PULL', 'PROPERTY_SYNC', 'ROOM_TYPE_SYNC', 'RATE_PLAN_SYNC');

-- CreateEnum
CREATE TYPE "ChannexConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ChannexWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "ChannexOrganization" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channexGroupId" TEXT NOT NULL,
    "channexGroupName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannexOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannexProperty" (
    "id" TEXT NOT NULL,
    "channexOrgId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "channexPropertyId" TEXT NOT NULL,
    "channexPropertyName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "ChannexSyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannexProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannexRoomTypeMapping" (
    "id" TEXT NOT NULL,
    "channexPropertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "channexRoomTypeId" TEXT NOT NULL,
    "channexRoomTypeName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannexRoomTypeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannexRatePlanMapping" (
    "id" TEXT NOT NULL,
    "channexPropertyId" TEXT NOT NULL,
    "channexRoomTypeId" TEXT NOT NULL,
    "channexRatePlanId" TEXT NOT NULL,
    "channexRatePlanName" TEXT,
    "pmsRatePlanReference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannexRatePlanMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannexChannelConnection" (
    "id" TEXT NOT NULL,
    "channexPropertyId" TEXT NOT NULL,
    "channelCode" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "connectionStatus" "ChannexConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "mappingStatus" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannexChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannexSyncLog" (
    "id" TEXT NOT NULL,
    "channexPropertyId" TEXT NOT NULL,
    "syncType" "ChannexSyncType" NOT NULL,
    "status" "ChannexSyncStatus" NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ChannexSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannexWebhookLog" (
    "id" TEXT NOT NULL,
    "channexPropertyId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "ChannexWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "processingError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChannexWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannexOrganization_organizationId_key" ON "ChannexOrganization"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexOrganization_channexGroupId_key" ON "ChannexOrganization"("channexGroupId");

-- CreateIndex
CREATE INDEX "ChannexOrganization_organizationId_idx" ON "ChannexOrganization"("organizationId");

-- CreateIndex
CREATE INDEX "ChannexOrganization_channexGroupId_idx" ON "ChannexOrganization"("channexGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexProperty_propertyId_key" ON "ChannexProperty"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexProperty_channexPropertyId_key" ON "ChannexProperty"("channexPropertyId");

-- CreateIndex
CREATE INDEX "ChannexProperty_channexOrgId_idx" ON "ChannexProperty"("channexOrgId");

-- CreateIndex
CREATE INDEX "ChannexProperty_propertyId_idx" ON "ChannexProperty"("propertyId");

-- CreateIndex
CREATE INDEX "ChannexProperty_channexPropertyId_idx" ON "ChannexProperty"("channexPropertyId");

-- CreateIndex
CREATE INDEX "ChannexRoomTypeMapping_roomTypeId_idx" ON "ChannexRoomTypeMapping"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexRoomTypeMapping_channexPropertyId_roomTypeId_key" ON "ChannexRoomTypeMapping"("channexPropertyId", "roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexRoomTypeMapping_channexPropertyId_channexRoomTypeId_key" ON "ChannexRoomTypeMapping"("channexPropertyId", "channexRoomTypeId");

-- CreateIndex
CREATE INDEX "ChannexRatePlanMapping_channexPropertyId_idx" ON "ChannexRatePlanMapping"("channexPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexRatePlanMapping_channexPropertyId_channexRatePlanId_key" ON "ChannexRatePlanMapping"("channexPropertyId", "channexRatePlanId");

-- CreateIndex
CREATE INDEX "ChannexChannelConnection_channelCode_idx" ON "ChannexChannelConnection"("channelCode");

-- CreateIndex
CREATE INDEX "ChannexChannelConnection_connectionStatus_idx" ON "ChannexChannelConnection"("connectionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ChannexChannelConnection_channexPropertyId_channelCode_key" ON "ChannexChannelConnection"("channexPropertyId", "channelCode");

-- CreateIndex
CREATE INDEX "ChannexSyncLog_channexPropertyId_idx" ON "ChannexSyncLog"("channexPropertyId");

-- CreateIndex
CREATE INDEX "ChannexSyncLog_syncType_idx" ON "ChannexSyncLog"("syncType");

-- CreateIndex
CREATE INDEX "ChannexSyncLog_status_idx" ON "ChannexSyncLog"("status");

-- CreateIndex
CREATE INDEX "ChannexSyncLog_startedAt_idx" ON "ChannexSyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "ChannexWebhookLog_channexPropertyId_idx" ON "ChannexWebhookLog"("channexPropertyId");

-- CreateIndex
CREATE INDEX "ChannexWebhookLog_eventType_idx" ON "ChannexWebhookLog"("eventType");

-- CreateIndex
CREATE INDEX "ChannexWebhookLog_status_idx" ON "ChannexWebhookLog"("status");

-- CreateIndex
CREATE INDEX "ChannexWebhookLog_receivedAt_idx" ON "ChannexWebhookLog"("receivedAt");

-- AddForeignKey
ALTER TABLE "ChannexOrganization" ADD CONSTRAINT "ChannexOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexProperty" ADD CONSTRAINT "ChannexProperty_channexOrgId_fkey" FOREIGN KEY ("channexOrgId") REFERENCES "ChannexOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexProperty" ADD CONSTRAINT "ChannexProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexRoomTypeMapping" ADD CONSTRAINT "ChannexRoomTypeMapping_channexPropertyId_fkey" FOREIGN KEY ("channexPropertyId") REFERENCES "ChannexProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexRoomTypeMapping" ADD CONSTRAINT "ChannexRoomTypeMapping_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexRatePlanMapping" ADD CONSTRAINT "ChannexRatePlanMapping_channexPropertyId_fkey" FOREIGN KEY ("channexPropertyId") REFERENCES "ChannexProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexChannelConnection" ADD CONSTRAINT "ChannexChannelConnection_channexPropertyId_fkey" FOREIGN KEY ("channexPropertyId") REFERENCES "ChannexProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexSyncLog" ADD CONSTRAINT "ChannexSyncLog_channexPropertyId_fkey" FOREIGN KEY ("channexPropertyId") REFERENCES "ChannexProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannexWebhookLog" ADD CONSTRAINT "ChannexWebhookLog_channexPropertyId_fkey" FOREIGN KEY ("channexPropertyId") REFERENCES "ChannexProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
