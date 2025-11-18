/**
 * API Route: Download Report
 * GET /api/reports/[reportId]/download
 *
 * Generate presigned URL for downloading report file
 */

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { getReportDownloadUrl } from "@/lib/reports/s3-utils";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    const { reportId } = await params;

    return await withTenantContext(orgId, async (tx) => {
      // Fetch report from database
      const report = await tx.reportHistory.findFirst({
        where: {
          id: reportId,
          organizationId: orgId
        },
        select: {
          id: true,
          name: true,
          status: true,
          s3Key: true,
          fileUrl: true,
          expiresAt: true
        }
      });

      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      if (report.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "Report is not ready for download", status: report.status },
          { status: 400 }
        );
      }

      if (!report.s3Key) {
        return NextResponse.json(
          { error: "Report file not found" },
          { status: 404 }
        );
      }

      // Check if report has expired
      if (report.expiresAt && new Date(report.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Report has expired and been deleted" },
          { status: 410 } // 410 Gone
        );
      }

      // Generate presigned URL (valid for 1 hour)
      const downloadUrl = await getReportDownloadUrl(report.s3Key, 3600);

      // Create response with caching headers for better performance
      const response = NextResponse.json({
        downloadUrl,
        fileName: report.name,
        expiresIn: 3600 // seconds
      });

      // Cache the presigned URL for 5 minutes (300 seconds)
      // This reduces API calls for repeated downloads
      response.headers.set(
        "Cache-Control",
        "private, max-age=300, stale-while-revalidate=60"
      );

      return response;
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      {
        error: "Failed to generate download URL",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
