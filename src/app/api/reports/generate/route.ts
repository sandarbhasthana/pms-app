/**
 * API Route: Generate Report
 * POST /api/reports/generate
 *
 * Generates a report on-demand or queues it for async processing
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant";
import { ReportType, ExportFormat } from "@prisma/client";
import { addJobToQueue } from "@/lib/queue/queues";
import { ReportGenerationRequest } from "@/lib/reports/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Get session for userId
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    return await withTenantContext(orgId, async () => {
      const body = await req.json();

      // Validate request
      const { type, format, startDate, endDate, propertyId, config } = body;

      if (!type || !format) {
        return NextResponse.json(
          { error: "Missing required fields: type, format" },
          { status: 400 }
        );
      }

      // Validate enum values
      if (!Object.values(ReportType).includes(type)) {
        return NextResponse.json(
          { error: `Invalid report type: ${type}` },
          { status: 400 }
        );
      }

      if (!Object.values(ExportFormat).includes(format)) {
        return NextResponse.json(
          { error: `Invalid export format: ${format}` },
          { status: 400 }
        );
      }

      // Create report generation request
      const request: ReportGenerationRequest = {
        type,
        format,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        organizationId: orgId,
        propertyId,
        userId: session.user.id,
        config
      };

      // Check if running on Vercel (serverless - no BullMQ support)
      const isVercel =
        process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;

      if (isVercel) {
        // Vercel: Return error message - reports not supported in serverless
        console.log(
          "⚠️  Report generation not supported on Vercel (serverless)"
        );
        return NextResponse.json(
          {
            error: "Report generation not available",
            message:
              "Background report generation is not supported on Vercel. Please use Railway deployment for report features.",
            details:
              "Vercel's serverless architecture doesn't support persistent Redis connections required for BullMQ job queues."
          },
          { status: 503 } // 503 Service Unavailable
        );
      }

      // Queue the report generation job (Railway only)
      const job = await addJobToQueue(
        "reports",
        "generate-report",
        {
          jobType: "generate-report",
          request
        },
        {
          priority: 1,
          removeOnComplete: 100,
          removeOnFail: 50
        }
      );

      console.log(`📊 Report generation job queued: ${job.id}`);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: "Report generation started"
      });
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
