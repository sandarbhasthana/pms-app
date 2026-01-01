/**
 * Channex Manual Sync API
 *
 * POST /api/channex/sync
 * Triggers a manual sync for a property
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { queueARISync, queueFullSync } from "@/lib/channex/queue-helpers";

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
    const { propertyId, syncType } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Get Channex property
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId },
      include: {
        roomTypeMappings: {
          where: { isActive: true }
        }
      }
    });

    if (!channexProperty) {
      return NextResponse.json(
        { error: "Property not connected to Channex" },
        { status: 404 }
      );
    }

    // Check if there are any active mappings
    if (channexProperty.roomTypeMappings.length === 0) {
      return NextResponse.json(
        { error: "No active room type mappings. Configure mappings first." },
        { status: 400 }
      );
    }

    // Create sync log
    const syncLog = await prisma.channexSyncLog.create({
      data: {
        channexPropertyId: channexProperty.id,
        syncType: syncType === "full" ? "ARI_FULL_SYNC" : "ARI_PUSH",
        status: "IN_PROGRESS",
        startedAt: new Date()
      }
    });

    // Queue the sync job
    try {
      if (syncType === "full") {
        await queueFullSync({
          propertyId,
          triggeredBy: `manual-${session.user.email}`
        });
      } else {
        // ARI sync for all room types
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Sync 30 days ahead

        for (const mapping of channexProperty.roomTypeMappings) {
          await queueARISync({
            propertyId,
            roomTypeId: mapping.roomTypeId,
            startDate,
            endDate,
            triggeredBy: `manual-${session.user.email}`
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `${syncType === "full" ? "Full" : "ARI"} sync started`,
        syncLogId: syncLog.id
      });
    } catch (queueError) {
      // Update sync log with error
      await prisma.channexSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          errorMessage:
            queueError instanceof Error
              ? queueError.message
              : "Failed to queue sync",
          completedAt: new Date()
        }
      });
      throw queueError;
    }
  } catch (error) {
    console.error("Error triggering sync:", error);
    return NextResponse.json(
      { error: "Failed to trigger sync" },
      { status: 500 }
    );
  }
}
