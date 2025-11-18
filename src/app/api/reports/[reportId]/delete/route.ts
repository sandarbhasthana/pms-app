/**
 * API Route: Delete Report
 * DELETE /api/reports/[reportId]/delete
 *
 * Delete a report from database and S3
 */

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { deleteReportFromS3 } from "@/lib/reports/s3-utils";

export const runtime = "nodejs";

export async function DELETE(
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
      // Fetch the report
      const report = await tx.reportHistory.findUnique({
        where: {
          id: reportId,
          organizationId: orgId
        },
        select: {
          id: true,
          s3Key: true,
          status: true
        }
      });

      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      // Delete from S3 if file exists
      if (report.s3Key) {
        try {
          await deleteReportFromS3(report.s3Key);
          console.log(`Deleted report from S3: ${report.s3Key}`);
        } catch (s3Error) {
          console.error("Error deleting from S3:", s3Error);
          // Continue with database deletion even if S3 deletion fails
        }
      }

      // Delete from database
      await tx.reportHistory.delete({
        where: {
          id: reportId
        }
      });

      return NextResponse.json({
        success: true,
        message: "Report deleted successfully"
      });
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      {
        error: "Failed to delete report",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
