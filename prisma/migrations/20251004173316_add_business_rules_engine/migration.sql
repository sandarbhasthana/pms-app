-- CreateEnum
CREATE TYPE "public"."BusinessRuleCategory" AS ENUM ('PRICING', 'AVAILABILITY', 'RESTRICTIONS', 'NOTIFICATIONS', 'AUTOMATION', 'REVENUE_OPTIMIZATION');

-- CreateTable
CREATE TABLE "public"."BusinessRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."BusinessRuleCategory" NOT NULL DEFAULT 'PRICING',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "propertyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RuleExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER,

    CONSTRAINT "RuleExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RulePerformance" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "avgExecutionTimeMs" DOUBLE PRECISION,
    "totalRevenueImpact" DOUBLE PRECISION DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB,

    CONSTRAINT "RulePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessRule_organizationId_idx" ON "public"."BusinessRule"("organizationId");

-- CreateIndex
CREATE INDEX "BusinessRule_propertyId_idx" ON "public"."BusinessRule"("propertyId");

-- CreateIndex
CREATE INDEX "BusinessRule_category_idx" ON "public"."BusinessRule"("category");

-- CreateIndex
CREATE INDEX "BusinessRule_isActive_idx" ON "public"."BusinessRule"("isActive");

-- CreateIndex
CREATE INDEX "BusinessRule_priority_idx" ON "public"."BusinessRule"("priority");

-- CreateIndex
CREATE INDEX "BusinessRule_createdAt_idx" ON "public"."BusinessRule"("createdAt");

-- CreateIndex
CREATE INDEX "RuleExecution_ruleId_idx" ON "public"."RuleExecution"("ruleId");

-- CreateIndex
CREATE INDEX "RuleExecution_executedAt_idx" ON "public"."RuleExecution"("executedAt");

-- CreateIndex
CREATE INDEX "RuleExecution_success_idx" ON "public"."RuleExecution"("success");

-- CreateIndex
CREATE UNIQUE INDEX "RulePerformance_ruleId_key" ON "public"."RulePerformance"("ruleId");

-- CreateIndex
CREATE INDEX "RulePerformance_totalExecutions_idx" ON "public"."RulePerformance"("totalExecutions");

-- CreateIndex
CREATE INDEX "RulePerformance_totalRevenueImpact_idx" ON "public"."RulePerformance"("totalRevenueImpact");

-- CreateIndex
CREATE INDEX "RulePerformance_lastExecutedAt_idx" ON "public"."RulePerformance"("lastExecutedAt");

-- AddForeignKey
ALTER TABLE "public"."BusinessRule" ADD CONSTRAINT "BusinessRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessRule" ADD CONSTRAINT "BusinessRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessRule" ADD CONSTRAINT "BusinessRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessRule" ADD CONSTRAINT "BusinessRule_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RuleExecution" ADD CONSTRAINT "RuleExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."BusinessRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RulePerformance" ADD CONSTRAINT "RulePerformance_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."BusinessRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
