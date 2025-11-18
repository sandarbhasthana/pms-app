/**
 * Report Generation Processor
 *
 * Handles async report generation jobs
 */

import { Job } from "bullmq";
import { ReportStatus } from "@prisma/client";
import { ReportGenerationJobData } from "@/lib/queue/types";

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

    // Import the appropriate report service based on type
    const { NightAuditReportService } = await import(
      "@/lib/reports/services/NightAuditReportService"
    );

    await job.updateProgress(20);

    // Create service instance
    const reportService = new NightAuditReportService(
      request.organizationId,
      request.userId,
      request.propertyId
    );

    await job.updateProgress(30);

    // Generate report
    const result = await reportService.generateReport(request);

    await job.updateProgress(90);

    if (result.status === ReportStatus.COMPLETED) {
      console.log(`✅ Report generated successfully: ${result.reportId}`);

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
