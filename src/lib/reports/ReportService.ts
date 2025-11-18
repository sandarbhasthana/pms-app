/**
 * Report Generation Service - Base Class
 *
 * Core service for generating reports with template rendering,
 * data aggregation, and export functionality
 */

import prisma from "@/lib/prisma";
import {
  ReportType,
  ReportStatus,
  ExportFormat,
  ReportCategory
} from "@prisma/client";
import {
  ReportGenerationRequest,
  ReportGenerationResult,
  ReportData
} from "./types";

export abstract class ReportService {
  protected organizationId: string;
  protected propertyId?: string;
  protected userId: string;

  constructor(organizationId: string, userId: string, propertyId?: string) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.propertyId = propertyId;
  }

  /**
   * Generate a report
   */
  async generateReport(
    request: ReportGenerationRequest
  ): Promise<ReportGenerationResult> {
    const startTime = Date.now();

    try {
      // Create report history entry
      const reportHistory = await prisma.reportHistory.create({
        data: {
          organizationId: request.organizationId,
          propertyId: request.propertyId,
          templateId: request.templateId,
          name: this.getReportName(request.type),
          category: this.getReportCategory(request.type),
          type: request.type,
          format: request.format,
          startDate: request.startDate,
          endDate: request.endDate,
          status: ReportStatus.PENDING,
          generatedBy: request.userId,
          expiresAt: this.calculateExpiryDate()
        }
      });

      // Update status to processing
      await prisma.reportHistory.update({
        where: { id: reportHistory.id },
        data: { status: ReportStatus.PROCESSING }
      });

      // Fetch report data
      const reportData = await this.fetchReportData(request);

      // Generate file based on format
      const { fileUrl, fileSize, s3Key } = await this.generateFile(
        reportData,
        request.format,
        reportHistory.id
      );

      // Calculate generation time
      const generationTime = Date.now() - startTime;

      // Update report history with success
      await prisma.reportHistory.update({
        where: { id: reportHistory.id },
        data: {
          status: ReportStatus.COMPLETED,
          fileUrl,
          fileSize,
          s3Key,
          generationTime,
          recordCount: reportData.data.length
        }
      });

      return {
        reportId: reportHistory.id,
        status: ReportStatus.COMPLETED,
        fileUrl,
        generationTime,
        recordCount: reportData.data.length
      };
    } catch (error) {
      console.error("Report generation failed:", error);

      return {
        reportId: "",
        status: ReportStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Abstract method to fetch report data - must be implemented by subclasses
   */
  protected abstract fetchReportData(
    request: ReportGenerationRequest
  ): Promise<ReportData>;

  /**
   * Generate file based on format
   */
  protected async generateFile(
    data: ReportData,
    format: ExportFormat,
    reportId: string
  ): Promise<{ fileUrl: string; fileSize: number; s3Key: string }> {
    const { generatePDF } = await import("./generators/pdf-generator");
    const { generateExcel } = await import("./generators/excel-generator");
    const { generateCSV } = await import("./generators/csv-generator");
    const { uploadReportToS3 } = await import("./s3-utils");

    let buffer: Buffer;
    let contentType: string;
    let fileName: string;

    // Get property name for filename
    let propertyName = "AllProperties";
    if (this.propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: this.propertyId },
        select: { name: true }
      });
      if (property) {
        propertyName = property.name.replace(/[^a-zA-Z0-9]/g, "_");
      }
    }

    // Get report type name (e.g., "NIGHT_AUDIT" -> "NightAudit")
    const reportTypeName = data.title
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

    // Format current date/time: YYYYMMDD_HHMMSS
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    // Generate file based on format
    // Filename format: PropertyName_ReportType_YYYYMMDD_HHMMSS.extension
    switch (format) {
      case ExportFormat.PDF:
        buffer = await generatePDF(data);
        contentType = "application/pdf";
        fileName = `${propertyName}_${reportTypeName}_${dateTime}.pdf`;
        break;
      case ExportFormat.EXCEL:
        buffer = await generateExcel(data);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileName = `${propertyName}_${reportTypeName}_${dateTime}.xlsx`;
        break;
      case ExportFormat.CSV:
        buffer = await generateCSV(data);
        contentType = "text/csv";
        fileName = `${propertyName}_${reportTypeName}_${dateTime}.csv`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Upload to S3
    const result = await uploadReportToS3(
      buffer,
      fileName,
      contentType,
      this.organizationId,
      reportId
    );

    return result;
  }

  /**
   * Get report name from type
   */
  protected getReportName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      NIGHT_AUDIT: "Night Audit Report",
      DAILY_FLASH: "Daily Flash Report",
      REVENUE_SUMMARY: "Revenue Summary",
      PAYMENT_REPORT: "Payment Report",
      OCCUPANCY: "Occupancy Report",
      ARRIVALS: "Arrivals Report",
      DEPARTURES: "Departures Report",
      IN_HOUSE: "In-House Guests Report",
      NO_SHOW: "No-Show Report",
      CANCELLATION: "Cancellation Report"
      // Add more as needed
    } as Record<ReportType, string>;

    return names[type] || type;
  }

  /**
   * Get report category from type
   */
  protected getReportCategory(type: ReportType): ReportCategory {
    // Map report types to categories
    if (
      [
        "REVENUE_SUMMARY",
        "PAYMENT_REPORT",
        "REFUND_REPORT",
        "TAX_REPORT"
      ].includes(type)
    ) {
      return ReportCategory.FINANCIAL;
    }
    if (
      [
        "DAILY_FLASH",
        "NIGHT_AUDIT",
        "OCCUPANCY",
        "ARRIVALS",
        "DEPARTURES"
      ].includes(type)
    ) {
      return ReportCategory.OPERATIONAL;
    }
    return ReportCategory.OPERATIONAL;
  }

  /**
   * Calculate expiry date (7 days from now)
   */
  protected calculateExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    return expiryDate;
  }
}
