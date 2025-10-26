-- AlterTable
ALTER TABLE "public"."Reservation" ADD COLUMN     "guestImageUrl" TEXT,
ADD COLUMN     "idDocumentExpired" BOOLEAN,
ADD COLUMN     "idDocumentUrl" TEXT,
ADD COLUMN     "idExpiryDate" TIMESTAMP(3);
