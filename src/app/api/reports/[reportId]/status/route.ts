/**
 * API Route: Get Report Status
 * GET /api/reports/[reportId]/status
 *
 * Check the status of a report generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";

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
          type: true,
          format: true,
          status: true,
          fileUrl: true,
          fileSize: true,
          generationTime: true,
          recordCount: true,
          error: true,
          generatedAt: true,
          expiresAt: true
        }
      });

      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      // Calculate time until deletion
      let timeUntilDeletion: string | null = null;
      if (report.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(report.expiresAt);
        const diffMs = expiresAt.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );

        if (diffMs > 0) {
          if (diffDays > 0) {
            timeUntilDeletion = `${diffDays} day${diffDays > 1 ? "s" : ""}`;
          } else {
            timeUntilDeletion = `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
          }
        } else {
          timeUntilDeletion = "Expired";
        }
      }

      return NextResponse.json({
        ...report,
        timeUntilDeletion
      });
    });
  } catch (error) {
    console.error("Error fetching report status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch report status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
