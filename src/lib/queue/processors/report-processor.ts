/**
 * Report Generation Processor
 *
 * Handles async report generation jobs for all report types
 */

import { Job } from "bullmq";
import { ReportStatus, ReportType } from "@prisma/client";
import { ReportGenerationJobData } from "@/lib/queue/types";
import { ReportService } from "@/lib/reports/ReportService";

/**
 * Get the appropriate report service based on report type
 */
async function getReportService(
  reportType: ReportType,
  organizationId: string,
  userId: string,
  propertyId?: string
): Promise<ReportService> {
  switch (reportType) {
    case "NIGHT_AUDIT": {
      const { NightAuditReportService } = await import(
        "@/lib/reports/services/NightAuditReportService"
      );
      return new NightAuditReportService(organizationId, userId, propertyId);
    }

    // Add other report types as they are implemented
    case "REVENUE_SUMMARY":
    case "PAYMENT_REPORT":
    case "DAILY_FLASH":
    case "OCCUPANCY":
    case "ARRIVALS":
    case "DEPARTURES":
    case "IN_HOUSE":
    case "NO_SHOW":
    case "CANCELLATION":
      // For now, use NightAuditReportService as fallback
      // TODO: Implement specific services for each report type
      console.warn(
        `⚠️ Report type ${reportType} not yet implemented, using Night Audit service as fallback`
      );
      const { NightAuditReportService } = await import(
        "@/lib/reports/services/NightAuditReportService"
      );
      return new NightAuditReportService(organizationId, userId, propertyId);

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * Process report generation job
 */
export async function processReportGeneration(
  job: Job<ReportGenerationJobData>
): Promise<void> {
  const { request } = job.data;

  console.log(`📊 Processing report generation job: ${job.id}`);
  console.log(`Report type: ${request.type}, Format: ${request.format}`);

  try {
    // Update job progress
    await job.updateProgress(10);

    // Get the appropriate report service based on type
    const reportService = await getReportService(
      request.type,
      request.organizationId,
      request.userId,
      request.propertyId
    );

    await job.updateProgress(20);

    console.log(
      `📝 Using ${reportService.constructor.name} for ${request.type} report`
    );

    await job.updateProgress(30);

    // Generate report
    const result = await reportService.generateReport(request);

    await job.updateProgress(90);

    if (result.status === ReportStatus.COMPLETED) {
      console.log(`✅ Report generated successfully: ${result.reportId}`);
      console.log(
        `📊 Generation time: ${result.generationTime}ms, Records: ${result.recordCount}`
      );

      // Send email notification if needed
      // TODO: Implement email notification

      await job.updateProgress(100);
    } else {
      throw new Error(result.error || "Report generation failed");
    }
  } catch (error) {
    console.error(`❌ Report generation failed:`, error);
    throw error;
  }
}

/**
 * Process report cleanup job (delete expired reports)
 */
export async function processReportCleanup(job: Job): Promise<void> {
  console.log(`🗑️ Processing report cleanup job: ${job.id}`);

  try {
    const { deleteExpiredReports } = await import("@/lib/reports/s3-utils");

    const deletedCount = await deleteExpiredReports();

    console.log(
      `✅ Cleanup completed. Deleted ${deletedCount} expired reports`
    );

    return;
  } catch (error) {
    console.error(`❌ Report cleanup failed:`, error);
    throw error;
  }
}
