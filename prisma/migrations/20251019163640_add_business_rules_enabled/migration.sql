-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "businessRulesConfig" JSONB DEFAULT '{}',
ADD COLUMN     "businessRulesEnabled" BOOLEAN NOT NULL DEFAULT false;
