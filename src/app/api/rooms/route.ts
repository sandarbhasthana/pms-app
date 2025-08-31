// File: src/app/api/rooms/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";

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
    console.log("GET /api/rooms, resolved propertyId:", propertyId);

    // Fetch rooms scoped to this property
    const rooms = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.room.findMany({
        where: { propertyId: propertyId },
        include: {
          roomType: {
            select: { id: true, name: true, basePrice: true }
          }
        },
        orderBy: { name: "asc" }
      });
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate property access with required role
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.PROPERTY_MGR
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Parse and validate request body
    const {
      name,
      type,
      capacity,
      imageUrl,
      description,
      doorlockId,
      roomTypeId,
      // Optional pricing fields
      basePrice,
      weekdayPrice,
      weekendPrice,
      availability,
      minLOS,
      maxLOS,
      closedToArrival,
      closedToDeparture
    } = await req.json();

    if (
      typeof name !== "string" ||
      typeof type !== "string" ||
      typeof capacity !== "number"
    ) {
      return new NextResponse("Invalid payload", { status: 422 });
    }

    // Get property details for organizationId (still needed for backward compatibility)
    const property = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.property.findUnique({
        where: { id: propertyId },
        select: { organizationId: true }
      });
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Create new room with property association
    const room = await withPropertyContext(propertyId!, async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          organizationId: property.organizationId, // Keep for backward compatibility
          propertyId: propertyId!, // NEW: Associate with property
          name,
          type,
          capacity,
          imageUrl,
          description,
          doorlockId,
          roomTypeId: roomTypeId || null
        }
      });

      // Create initial pricing if basePrice is provided
      if (typeof basePrice === "number" && basePrice > 0) {
        await tx.roomPricing.create({
          data: {
            roomId: newRoom.id,
            basePrice,
            weekdayPrice: weekdayPrice || null,
            weekendPrice: weekendPrice || null,
            availability: availability || 1,
            minLOS: minLOS || null,
            maxLOS: maxLOS || null,
            closedToArrival: closedToArrival || false,
            closedToDeparture: closedToDeparture || false
          }
        });
      }

      return newRoom;
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
