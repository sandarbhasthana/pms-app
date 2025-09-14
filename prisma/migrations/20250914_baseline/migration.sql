-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."PropertyRole" AS ENUM ('PROPERTY_MGR', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'SECURITY', 'GUEST_SERVICES', 'ACCOUNTANT', 'IT_SUPPORT');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'PROPERTY_MGR', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT', 'OWNER', 'IT_SUPPORT', 'SECURITY');

-- CreateEnum
CREATE TYPE "public"."ReservationSource" AS ENUM ('WEBSITE', 'PHONE', 'WALK_IN', 'CHANNEL');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."ChannelType" AS ENUM ('BOOKING_COM', 'EXPEDIA', 'AIRBNB', 'VRBO', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'FLEXIBLE');

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeAccountId" TEXT,
    "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserOrg" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "role" "public"."PropertyRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shift" "public"."ShiftType",

    CONSTRAINT "UserProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvitationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "propertyId" TEXT,
    "propertyRole" "public"."PropertyRole",
    "shift" "public"."ShiftType",
    "phone" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "InvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomType" (
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
    "availability" INTEGER,
    "basePrice" DOUBLE PRECISION,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "maxLOS" INTEGER,
    "minLOS" INTEGER,
    "weekdayPrice" DOUBLE PRECISION,
    "weekendPrice" DOUBLE PRECISION,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "pricingId" TEXT,
    "sizeSqFt" INTEGER,
    "description" TEXT,
    "doorlockId" TEXT,
    "roomTypeId" TEXT,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomImage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sort" INTEGER,

    CONSTRAINT "RoomImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "source" "public"."ReservationSource" NOT NULL,
    "channelId" TEXT,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "email" TEXT,
    "idNumber" TEXT,
    "idType" TEXT,
    "issuingCountry" TEXT,
    "phone" TEXT,
    "propertyId" TEXT NOT NULL,
    "amountCaptured" INTEGER,
    "amountHeld" INTEGER,
    "depositAmount" INTEGER,
    "depositDueDate" TIMESTAMP(3),
    "finalPaymentDue" TIMESTAMP(3),
    "paymentStatus" TEXT,
    "paymentTerms" TEXT,
    "stripeCustomerId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAmount" DOUBLE PRECISION,
    "refundedAmount" DOUBLE PRECISION,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PropertySettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "propertyType" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
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
    "isManuallyPositioned" BOOLEAN NOT NULL DEFAULT false,
    "photos" JSONB,
    "printHeader" TEXT,
    "printHeaderImage" TEXT,
    "description" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT,

    CONSTRAINT "PropertySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Channel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ChannelType" NOT NULL,
    "credentials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "gatewayTxId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "paymentMethodId" TEXT,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMethod" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Refund" (
    "id" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentTransaction" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeRefundId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "failureReason" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomPricing" (
    "id" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "weekdayPrice" DOUBLE PRECISION,
    "weekendPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "availability" INTEGER,
    "minLOS" INTEGER,
    "maxLOS" INTEGER,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "RoomPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyRate" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "availability" INTEGER,
    "minLOS" INTEGER,
    "maxLOS" INTEGER,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "restrictions" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pricingId" TEXT,

    CONSTRAINT "DailyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeasonalRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roomTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pricingId" TEXT,

    CONSTRAINT "SeasonalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RateChangeLog" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE,
    "oldPrice" DOUBLE PRECISION,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "changeType" TEXT NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_RoomAmenities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoomAmenities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "public"."Organization"("domain");

-- CreateIndex
CREATE INDEX "Organization_domain_idx" ON "public"."Organization"("domain");

-- CreateIndex
CREATE INDEX "Organization_stripeAccountId_idx" ON "public"."Organization"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Property_organizationId_idx" ON "public"."Property"("organizationId");

-- CreateIndex
CREATE INDEX "Property_organizationId_isDefault_idx" ON "public"."Property"("organizationId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Property_organizationId_name_key" ON "public"."Property"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "UserOrg_userId_idx" ON "public"."UserOrg"("userId");

-- CreateIndex
CREATE INDEX "UserOrg_organizationId_idx" ON "public"."UserOrg"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrg_userId_organizationId_key" ON "public"."UserOrg"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "UserProperty_userId_idx" ON "public"."UserProperty"("userId");

-- CreateIndex
CREATE INDEX "UserProperty_propertyId_idx" ON "public"."UserProperty"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProperty_userId_propertyId_key" ON "public"."UserProperty"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationToken_token_key" ON "public"."InvitationToken"("token");

-- CreateIndex
CREATE INDEX "InvitationToken_token_idx" ON "public"."InvitationToken"("token");

-- CreateIndex
CREATE INDEX "InvitationToken_email_idx" ON "public"."InvitationToken"("email");

-- CreateIndex
CREATE INDEX "InvitationToken_organizationId_idx" ON "public"."InvitationToken"("organizationId");

-- CreateIndex
CREATE INDEX "InvitationToken_propertyId_idx" ON "public"."InvitationToken"("propertyId");

-- CreateIndex
CREATE INDEX "RoomType_organizationId_idx" ON "public"."RoomType"("organizationId");

-- CreateIndex
CREATE INDEX "RoomType_propertyId_idx" ON "public"."RoomType"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_organizationId_name_key" ON "public"."RoomType"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Room_organizationId_idx" ON "public"."Room"("organizationId");

-- CreateIndex
CREATE INDEX "Room_propertyId_idx" ON "public"."Room"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "public"."Amenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_stripePaymentIntentId_key" ON "public"."Reservation"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_idx" ON "public"."Reservation"("organizationId");

-- CreateIndex
CREATE INDEX "Reservation_propertyId_idx" ON "public"."Reservation"("propertyId");

-- CreateIndex
CREATE INDEX "Reservation_roomId_idx" ON "public"."Reservation"("roomId");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "public"."Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_channelId_idx" ON "public"."Reservation"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySettings_orgId_key" ON "public"."PropertySettings"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySettings_propertyId_key" ON "public"."PropertySettings"("propertyId");

-- CreateIndex
CREATE INDEX "PropertySettings_orgId_idx" ON "public"."PropertySettings"("orgId");

-- CreateIndex
CREATE INDEX "PropertySettings_propertyId_idx" ON "public"."PropertySettings"("propertyId");

-- CreateIndex
CREATE INDEX "Channel_organizationId_idx" ON "public"."Channel"("organizationId");

-- CreateIndex
CREATE INDEX "Favorite_roomId_idx" ON "public"."Favorite"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_roomId_key" ON "public"."Favorite"("userId", "roomId");

-- CreateIndex
CREATE INDEX "Payment_reservationId_idx" ON "public"."Payment"("reservationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "public"."Payment"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "public"."PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_customerId_idx" ON "public"."PaymentMethod"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "public"."Refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "Refund_reservationId_idx" ON "public"."Refund"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "public"."WebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "public"."WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "public"."WebhookEvent"("processedAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_reservationId_idx" ON "public"."PaymentTransaction"("reservationId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_stripePaymentIntentId_idx" ON "public"."PaymentTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_type_idx" ON "public"."PaymentTransaction"("type");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "public"."PaymentTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_reservationId_stripePaymentIntentId_key" ON "public"."PaymentTransaction"("reservationId", "stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomPricing_roomId_key" ON "public"."RoomPricing"("roomId");

-- CreateIndex
CREATE INDEX "DailyRate_date_idx" ON "public"."DailyRate"("date");

-- CreateIndex
CREATE INDEX "DailyRate_roomTypeId_idx" ON "public"."DailyRate"("roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRate_roomTypeId_date_key" ON "public"."DailyRate"("roomTypeId", "date");

-- CreateIndex
CREATE INDEX "SeasonalRate_startDate_endDate_idx" ON "public"."SeasonalRate"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SeasonalRate_roomTypeId_idx" ON "public"."SeasonalRate"("roomTypeId");

-- CreateIndex
CREATE INDEX "RateChangeLog_roomTypeId_idx" ON "public"."RateChangeLog"("roomTypeId");

-- CreateIndex
CREATE INDEX "RateChangeLog_date_idx" ON "public"."RateChangeLog"("date");

-- CreateIndex
CREATE INDEX "RateChangeLog_createdAt_idx" ON "public"."RateChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "_RoomAmenities_B_index" ON "public"."_RoomAmenities"("B");

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserOrg" ADD CONSTRAINT "UserOrg_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserOrg" ADD CONSTRAINT "UserOrg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProperty" ADD CONSTRAINT "UserProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProperty" ADD CONSTRAINT "UserProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvitationToken" ADD CONSTRAINT "InvitationToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvitationToken" ADD CONSTRAINT "InvitationToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvitationToken" ADD CONSTRAINT "InvitationToken_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomType" ADD CONSTRAINT "RoomType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomType" ADD CONSTRAINT "RoomType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "public"."RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomImage" ADD CONSTRAINT "RoomImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertySettings" ADD CONSTRAINT "PropertySettings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Channel" ADD CONSTRAINT "Channel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Refund" ADD CONSTRAINT "Refund_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomPricing" ADD CONSTRAINT "RoomPricing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyRate" ADD CONSTRAINT "DailyRate_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "public"."RoomPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyRate" ADD CONSTRAINT "DailyRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "public"."RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeasonalRate" ADD CONSTRAINT "SeasonalRate_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "public"."RoomPricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeasonalRate" ADD CONSTRAINT "SeasonalRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "public"."RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RateChangeLog" ADD CONSTRAINT "RateChangeLog_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "public"."RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RateChangeLog" ADD CONSTRAINT "RateChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RoomAmenities" ADD CONSTRAINT "_RoomAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RoomAmenities" ADD CONSTRAINT "_RoomAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
