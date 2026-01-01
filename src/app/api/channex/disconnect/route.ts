/**
 * Channex Disconnect API
 *
 * POST /api/channex/disconnect
 * Disconnects a PMS property from Channex
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as UserRole;

    if (!session?.user || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Find existing Channex property connection
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (!channexProperty) {
      return NextResponse.json(
        { error: "Property is not connected to Channex" },
        { status: 404 }
      );
    }

    // Delete related records in correct order (due to foreign keys)
    // 1. Delete rate plan mappings
    await prisma.channexRatePlanMapping.deleteMany({
      where: {
        roomTypeMapping: {
          channexPropertyId: channexProperty.id
        }
      }
    });

    // 2. Delete room type mappings
    await prisma.channexRoomTypeMapping.deleteMany({
      where: { channexPropertyId: channexProperty.id }
    });

    // 3. Delete channel connections
    await prisma.channexChannelConnection.deleteMany({
      where: { channexPropertyId: channexProperty.id }
    });

    // 4. Delete sync logs
    await prisma.channexSyncLog.deleteMany({
      where: { channexPropertyId: channexProperty.id }
    });

    // 5. Delete webhook logs
    await prisma.channexWebhookLog.deleteMany({
      where: { channexPropertyId: channexProperty.id }
    });

    // 6. Delete the property connection
    await prisma.channexProperty.delete({
      where: { id: channexProperty.id }
    });

    return NextResponse.json({
      success: true,
      message: "Property disconnected from Channex successfully"
    });
  } catch (error) {
    console.error("Error disconnecting from Channex:", error);
    return NextResponse.json(
      { error: "Failed to disconnect from Channex" },
      { status: 500 }
    );
  }
}

