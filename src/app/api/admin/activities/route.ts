// API endpoint for fetching recent activities

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { ActivityTracker } from "@/lib/services/activity-tracker";

/**
 * GET /api/admin/activities
 * Fetch recent system activities
 * Access: SUPER_ADMIN only
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - SUPER_ADMIN access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const organizationId = searchParams.get("organizationId") || undefined;

    // Fetch recent activities
    const activities = await ActivityTracker.getRecentActivities(limit, organizationId);

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
    });

  } catch (error) {
    console.error("Activities fetch error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
