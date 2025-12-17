/**
 * S3 Utilities for Report Storage
 *
 * Handles uploading, downloading, and managing report files in AWS S3
 * with 7-day auto-deletion lifecycle
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const BUCKET_NAME = process.env.S3_BUCKET!;
const REPORTS_FOLDER = "reports";

/**
 * Upload report file to S3
 */
export async function uploadReportToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string,
  reportId: string
): Promise<{ fileUrl: string; s3Key: string; fileSize: number }> {
  try {
    // Generate S3 key with organization and report ID
    const s3Key = `${organizationId}/${REPORTS_FOLDER}/${reportId}/${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      // Add metadata for lifecycle management
      Metadata: {
        organizationId,
        reportId,
        uploadedAt: new Date().toISOString()
      }
      // Note: 7-day auto-deletion is handled by S3 Lifecycle Rules
      // Configure in AWS Console: S3 > Bucket > Management > Lifecycle rules
      // Rule: Delete objects in 'reports/' folder after 7 days
    });

    await s3Client.send(command);

    // Build public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    return {
      fileUrl,
      s3Key,
      fileSize: buffer.length
    };
  } catch (error) {
    console.error("Error uploading report to S3:", error);
    throw new Error("Failed to upload report to S3");
  }
}

/**
 * Generate presigned URL for downloading report
 */
export async function getReportDownloadUrl(
  s3Key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

/**
 * Delete report file from S3
 */
export async function deleteReportFromS3(s3Key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await s3Client.send(command);
    console.log(`✅ Deleted report from S3: ${s3Key}`);
  } catch (error) {
    console.error("Error deleting report from S3:", error);
    throw new Error("Failed to delete report from S3");
  }
}

/**
 * Delete expired reports from S3 and database
 * This should be called by a cron job
 */
export async function deleteExpiredReports(): Promise<number> {
  try {
    const prisma = (await import("@/lib/prisma")).default;

    // Find expired reports (older than 7 days)
    const expiredReports = await prisma.reportHistory.findMany({
      where: {
        expiresAt: {
          lte: new Date()
        },
        status: "COMPLETED"
      },
      select: {
        id: true,
        s3Key: true,
        name: true,
        expiresAt: true
      }
    });

    console.log(`🗑️ Found ${expiredReports.length} expired reports to delete`);

    let deletedCount = 0;

    // Delete each report from S3 and database
    for (const report of expiredReports) {
      try {
        // Delete from S3 if file exists
        if (report.s3Key) {
          try {
            await deleteReportFromS3(report.s3Key);
            console.log(`✅ Deleted S3 file: ${report.s3Key}`);
          } catch (s3Error) {
            console.error(
              `⚠️ Failed to delete S3 file ${report.s3Key}:`,
              s3Error
            );
            // Continue with database deletion even if S3 deletion fails
          }
        }

        // Delete from database
        await prisma.reportHistory.delete({
          where: { id: report.id }
        });

        console.log(
          `✅ Deleted report from database: ${report.name} (expired: ${report.expiresAt})`
        );
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete report ${report.id}:`, error);
      }
    }

    console.log(
      `✅ Cleanup completed: Deleted ${deletedCount} expired reports`
    );
    return deletedCount;
  } catch (error) {
    console.error("❌ Error deleting expired reports:", error);
    throw error;
  }
}
