// File: src/app/api/debug/room-types/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";

/**
 * GET /api/debug/room-types - Debug room types data
 */
export async function GET(req: NextRequest) {
  try {
    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get detailed room types data for debugging
    const debugData = await withPropertyContext(propertyId!, async (tx) => {
      // Get all room types for this property
      const propertyRoomTypes = await tx.roomType.findMany({
        where: { propertyId: propertyId },
        select: {
          id: true,
          name: true,
          organizationId: true,
          propertyId: true,
          createdAt: true,
          _count: {
            select: { rooms: true }
          }
        },
        orderBy: { name: "asc" }
      });

      // Also check if there are any room types with same organizationId but no propertyId
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: { organizationId: true }
      });

      const orgRoomTypes = property
        ? await tx.roomType.findMany({
            where: {
              organizationId: property.organizationId,
              propertyId: null // Old room types without property association
            },
            select: {
              id: true,
              name: true,
              organizationId: true,
              propertyId: true,
              createdAt: true,
              _count: {
                select: { rooms: true }
              }
            },
            orderBy: { name: "asc" }
          })
        : [];

      // Check for duplicates by name
      const allRoomTypes = [...propertyRoomTypes, ...orgRoomTypes];
      const duplicateNames = allRoomTypes.reduce((acc, rt) => {
        if (!acc[rt.name]) {
          acc[rt.name] = [];
        }
        acc[rt.name].push(rt);
        return acc;
      }, {} as Record<string, typeof allRoomTypes>);

      const duplicates = Object.entries(duplicateNames)
        .filter(([, roomTypes]) => roomTypes.length > 1)
        .reduce((acc, [name, roomTypes]) => {
          acc[name] = roomTypes;
          return acc;
        }, {} as Record<string, typeof allRoomTypes>);

      return {
        propertyId,
        organizationId: property?.organizationId,
        propertyRoomTypes,
        orgRoomTypes,
        duplicates,
        summary: {
          totalPropertyRoomTypes: propertyRoomTypes.length,
          totalOrgRoomTypes: orgRoomTypes.length,
          duplicateNames: Object.keys(duplicates)
        }
      };
    });

    return NextResponse.json(debugData);
  } catch (error) {
    console.error("GET /api/debug/room-types error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
