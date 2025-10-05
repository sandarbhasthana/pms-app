-- CreateEnum
CREATE TYPE "public"."PerformanceMetricType" AS ENUM ('api_response_time', 'api_throughput', 'db_query_time', 'db_connection_count', 'queue_processing_time', 'queue_wait_time', 'memory_usage', 'cpu_usage', 'disk_usage', 'error_rate', 'cache_hit_rate', 'custom');

-- CreateEnum
CREATE TYPE "public"."QueueJobStatus" AS ENUM ('waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'stuck');

-- CreateTable
CREATE TABLE "public"."performance_metrics" (
    "id" TEXT NOT NULL,
    "metricType" "public"."PerformanceMetricType" NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "tags" JSONB,
    "service" TEXT,
    "endpoint" TEXT,
    "operation" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "organizationId" TEXT,
    "propertyId" TEXT,
    "userId" TEXT,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."queue_metrics" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" "public"."QueueJobStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "waitTime" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "delay" INTEGER,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "data" JSONB,
    "result" JSONB,
    "organizationId" TEXT,
    "propertyId" TEXT,

    CONSTRAINT "queue_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_metrics_metricType_timestamp_idx" ON "public"."performance_metrics"("metricType", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_service_timestamp_idx" ON "public"."performance_metrics"("service", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_organizationId_timestamp_idx" ON "public"."performance_metrics"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_propertyId_timestamp_idx" ON "public"."performance_metrics"("propertyId", "timestamp");

-- CreateIndex
CREATE INDEX "queue_metrics_queueName_status_createdAt_idx" ON "public"."queue_metrics"("queueName", "status", "createdAt");

-- CreateIndex
CREATE INDEX "queue_metrics_status_createdAt_idx" ON "public"."queue_metrics"("status", "createdAt");

-- CreateIndex
CREATE INDEX "queue_metrics_organizationId_createdAt_idx" ON "public"."queue_metrics"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."performance_metrics" ADD CONSTRAINT "performance_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_metrics" ADD CONSTRAINT "performance_metrics_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_metrics" ADD CONSTRAINT "performance_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."queue_metrics" ADD CONSTRAINT "queue_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."queue_metrics" ADD CONSTRAINT "queue_metrics_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
