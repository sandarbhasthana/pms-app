/**
 * API Route: Report History
 * GET /api/reports/history
 *
 * List generated reports history
 */

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { Prisma, ReportType, ReportStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    return await withTenantContext(orgId, async (tx) => {
      const { searchParams } = new URL(req.url);
      const propertyId = searchParams.get("propertyId");
      const type = searchParams.get("type");
      const status = searchParams.get("status");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = parseInt(searchParams.get("offset") || "0");

      // Build where clause
      const where: Prisma.ReportHistoryWhereInput = {
        organizationId: orgId
      };

      if (propertyId) {
        where.propertyId = propertyId;
      }

      if (type && Object.values(ReportType).includes(type as ReportType)) {
        where.type = type as ReportType;
      }

      if (
        status &&
        Object.values(ReportStatus).includes(status as ReportStatus)
      ) {
        where.status = status as ReportStatus;
      }

      // Fetch reports
      const [reports, total] = await Promise.all([
        tx.reportHistory.findMany({
          where,
          select: {
            id: true,
            name: true,
            category: true,
            type: true,
            format: true,
            status: true,
            fileUrl: true,
            fileSize: true,
            s3Key: true, // Added s3Key for download functionality
            generationTime: true,
            recordCount: true,
            error: true,
            generatedAt: true,
            expiresAt: true,
            generator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            property: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            generatedAt: "desc"
          },
          take: limit,
          skip: offset
        }),
        tx.reportHistory.count({ where })
      ]);

      // Calculate time until deletion for each report
      const reportsWithDeletion = reports.map((report) => {
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
              timeUntilDeletion = `${diffHours} hour${
                diffHours > 1 ? "s" : ""
              }`;
            }
          } else {
            timeUntilDeletion = "Expired";
          }
        }

        return {
          ...report,
          timeUntilDeletion
        };
      });

      return NextResponse.json({
        reports: reportsWithDeletion,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      });
    });
  } catch (error) {
    console.error("Error fetching report history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch report history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
