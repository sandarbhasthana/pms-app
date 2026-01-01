/**
 * Channex Config API
 *
 * GET /api/channex/config?propertyId=xxx
 * Returns the Channex configuration for a property
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

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Get Channex property configuration
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId },
      include: {
        channelConnections: true
      }
    });

    if (!channexProperty) {
      return NextResponse.json(
        {
          isConnected: false,
          channexPropertyId: null,
          syncStatus: null,
          lastSyncAt: null,
          channelConnections: []
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      isConnected: true,
      channexPropertyId: channexProperty.channexPropertyId,
      syncStatus: channexProperty.syncStatus,
      lastSyncAt: channexProperty.lastSyncAt?.toISOString() ?? null,
      channelConnections: channexProperty.channelConnections.map((cc) => ({
        id: cc.id,
        channelCode: cc.channelCode,
        channelName: cc.channelName,
        status: cc.connectionStatus
      }))
    });
  } catch (error) {
    console.error("Error fetching Channex config:", error);
    return NextResponse.json(
      { error: "Failed to fetch Channex config" },
      { status: 500 }
    );
  }
}
