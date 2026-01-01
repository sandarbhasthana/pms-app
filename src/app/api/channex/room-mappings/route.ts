/**
 * Channex Room Mappings API
 *
 * GET /api/channex/room-mappings?propertyId=xxx
 * POST /api/channex/room-mappings - Save room type mappings
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

    // Get Channex property
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId },
      include: {
        roomTypeMappings: {
          include: {
            roomType: true,
            ratePlanMappings: true
          }
        }
      }
    });

    if (!channexProperty) {
      return NextResponse.json({ error: "Not connected" }, { status: 404 });
    }

    // Get all room types for this property that have actual rooms
    const roomTypes = await prisma.roomType.findMany({
      where: {
        propertyId,
        rooms: {
          some: {} // Only include room types that have at least one room
        }
      }
    });

    // Build mapping response
    const mappings = roomTypes.map((rt) => {
      const existingMapping = channexProperty.roomTypeMappings.find(
        (m) => m.roomTypeId === rt.id
      );
      const ratePlanMapping = existingMapping?.ratePlanMappings[0];

      return {
        id: existingMapping?.id ?? null,
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        channexRoomTypeId: existingMapping?.channexRoomTypeId ?? null,
        channexRatePlanId: ratePlanMapping?.channexRatePlanId ?? null,
        isActive: existingMapping?.isActive ?? false
      };
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Error fetching room mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch room mappings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as UserRole;

    if (!session?.user || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, mappings } = body;

    if (!propertyId || !mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: "propertyId and mappings array are required" },
        { status: 400 }
      );
    }

    // Get Channex property
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (!channexProperty) {
      return NextResponse.json(
        { error: "Property not connected to Channex" },
        { status: 404 }
      );
    }

    // Update each mapping
    for (const mapping of mappings) {
      const { roomTypeId, channexRoomTypeId, channexRatePlanId } = mapping;

      if (!roomTypeId) continue;

      // Upsert room type mapping
      const roomTypeMapping = await prisma.channexRoomTypeMapping.upsert({
        where: {
          channexPropertyId_roomTypeId: {
            channexPropertyId: channexProperty.id,
            roomTypeId
          }
        },
        create: {
          channexPropertyId: channexProperty.id,
          roomTypeId,
          channexRoomTypeId: channexRoomTypeId || null,
          isActive: !!(channexRoomTypeId && channexRatePlanId)
        },
        update: {
          channexRoomTypeId: channexRoomTypeId || null,
          isActive: !!(channexRoomTypeId && channexRatePlanId)
        }
      });

      // Upsert rate plan mapping if provided
      if (channexRatePlanId) {
        await prisma.channexRatePlanMapping.upsert({
          where: {
            roomTypeMappingId_channexRatePlanId: {
              roomTypeMappingId: roomTypeMapping.id,
              channexRatePlanId
            }
          },
          create: {
            roomTypeMappingId: roomTypeMapping.id,
            channexRatePlanId,
            isActive: true
          },
          update: {
            isActive: true
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Room type mappings saved successfully"
    });
  } catch (error) {
    console.error("Error saving room mappings:", error);
    return NextResponse.json(
      { error: "Failed to save room mappings" },
      { status: 500 }
    );
  }
}
