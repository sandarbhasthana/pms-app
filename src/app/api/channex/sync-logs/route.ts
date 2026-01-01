/**
 * Channex Sync Logs API
 *
 * GET /api/channex/sync-logs?propertyId=xxx&limit=10
 * Returns recent sync logs for a property
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const ALLOWED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ORG_ADMIN,
  UserRole.PROPERTY_MGR
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as UserRole;

    if (!session?.user || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Get Channex property
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (!channexProperty) {
      return NextResponse.json({ error: "Not connected" }, { status: 404 });
    }

    // Get sync logs
    const logs = await prisma.channexSyncLog.findMany({
      where: { channexPropertyId: channexProperty.id },
      orderBy: { startedAt: "desc" },
      take: Math.min(limit, 50)
    });

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        syncType: log.syncType,
        status: log.status,
        startedAt: log.startedAt.toISOString(),
        completedAt: log.completedAt?.toISOString() ?? null,
        errorMessage: log.errorMessage
      }))
    });
  } catch (error) {
    console.error("Error fetching sync logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync logs" },
      { status: 500 }
    );
  }
}

