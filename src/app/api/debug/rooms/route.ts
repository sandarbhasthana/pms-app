// File: src/app/api/debug/rooms/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/debug/rooms
 * Debug endpoint to check room data in the database
 */
export async function GET() {
  try {
    // Get session for organization context
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    const orgId = session.user.orgId;

    console.log("🔍 Debug endpoint - orgId from session:", orgId);

    // First, let's check what organizations exist
    const allOrgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    console.log("📊 All organizations in DB:", allOrgs);

    // Query directly without RLS to debug
    // Get all properties in the organization
    const properties = await prisma.property.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        isDefault: true,
        _count: {
          select: {
            rooms: true,
            roomTypes: true,
            reservations: true
          }
        }
      }
    });

    // Get all rooms in the organization
    const allRooms = await prisma.room.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        type: true,
        propertyId: true,
        property: {
          select: {
            name: true
          }
        }
      }
    });

    // Get room counts by property
    const roomsByProperty = await prisma.room.groupBy({
      by: ["propertyId"],
      where: { organizationId: orgId },
      _count: {
        id: true
      }
    });

    // Get current user's property context
    const currentPropertyId = session.user.currentPropertyId;
    const currentProperty = properties.find((p) => p.id === currentPropertyId);

    // Check total rooms in database
    const totalRoomsInDB = await prisma.room.count();
    console.log("📈 Total rooms in database:", totalRoomsInDB);

    // Check rooms for this org
    const roomsForOrg = await prisma.room.count({
      where: { organizationId: orgId }
    });
    console.log("🏨 Rooms for org", orgId, ":", roomsForOrg);

    // Get all rooms regardless of org to see what's in DB
    const allRoomsInDB = await prisma.room.findMany({
      select: {
        id: true,
        name: true,
        organizationId: true,
        propertyId: true
      },
      take: 5
    });

    const debugData = {
      organizationId: orgId,
      currentPropertyId,
      currentProperty,
      totalProperties: properties.length,
      totalRooms: allRooms.length,
      properties,
      allRooms,
      roomsByProperty,
      sessionInfo: {
        userId: session.user.id,
        currentPropertyId: session.user.currentPropertyId,
        availablePropertiesCount: session.user.availableProperties?.length || 0,
        defaultProperty: session.user.defaultProperty
      },
      _debug: {
        allOrganizations: allOrgs,
        totalRoomsInDB,
        roomsForThisOrg: roomsForOrg,
        sampleRoomsFromDB: allRoomsInDB
      }
    };

    return NextResponse.json(debugData);
  } catch (error) {
    console.error("GET /api/debug/rooms error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
