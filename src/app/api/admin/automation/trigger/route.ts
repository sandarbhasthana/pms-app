/**
 * Manual Automation Trigger API
 *
 * Allows manual triggering of automation jobs for testing and emergency use
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { triggerManualJob } from "@/lib/queue/scheduler";
import { withPropertyContext } from "@/lib/property-context";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { jobType, propertyId, dryRun = false } = body;

    // Validate required fields
    if (!jobType || !propertyId) {
      return NextResponse.json(
        { error: "jobType and propertyId are required" },
        { status: 400 }
      );
    }

    // Validate job type
    const validJobTypes = [
      "no-show-detection",
      "late-checkout-detection",
      "cleanup",
      "auto-checkin"
    ];
    if (!validJobTypes.includes(jobType)) {
      return NextResponse.json(
        {
          error: `Invalid job type. Must be one of: ${validJobTypes.join(", ")}`
        },
        { status: 400 }
      );
    }

    // Check user permissions for the property
    const hasAccess = await withPropertyContext(
      propertyId,
      async () => true
    ).catch(() => false);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this property" },
        { status: 403 }
      );
    }

    // Trigger the job
    const job = await triggerManualJob(jobType, propertyId, { dryRun });

    return NextResponse.json({
      success: true,
      message: `${jobType} job triggered successfully`,
      jobId: job.id,
      dryRun,
      propertyId
    });
  } catch (error) {
    console.error("Error triggering manual job:", error);
    return NextResponse.json(
      {
        error: "Failed to trigger job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (propertyId) {
      // Check user permissions for the property
      const hasAccess = await withPropertyContext(
        propertyId,
        async () => true
      ).catch(() => false);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to this property" },
          { status: 403 }
        );
      }
    }

    // Get job status information
    const { getScheduledJobsStatus } = await import("@/lib/queue/scheduler");
    const status = await getScheduledJobsStatus();

    return NextResponse.json({
      success: true,
      status,
      availableJobTypes: [
        "no-show-detection",
        "late-checkout-detection",
        "cleanup",
        "auto-checkin",
        "payment-status-update"
      ]
    });
  } catch (error) {
    console.error("Error getting automation status:", error);
    return NextResponse.json(
      {
        error: "Failed to get status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
