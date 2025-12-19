// File: src/app/api/rooms/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";

// OPTIMIZATION: In-memory cache for rooms
const roomsCache = new Map<string, { data: unknown; timestamp: number }>();
const ROOMS_CACHE_DURATION = 600000; // 10 minutes

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

    // OPTIMIZATION: Check cache first
    const cacheKey = `rooms-${propertyId}`;
    const now = Date.now();
    const cached = roomsCache.get(cacheKey);

    if (cached && now - cached.timestamp < ROOMS_CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(`📦 Cache hit for rooms: ${cacheKey}`);
      }
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    // ✅ OPTIMIZED: Use select instead of include (Task 1.4)
    const rooms = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.room.findMany({
        where: { propertyId: propertyId },
        select: {
          id: true,
          name: true,
          type: true,
          capacity: true,
          imageUrl: true,
          description: true,
          doorlockId: true,
          roomTypeId: true,
          propertyId: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          roomType: {
            select: { id: true, name: true, basePrice: true }
          }
        },
        orderBy: { name: "asc" }
      });
    });

    // OPTIMIZATION: Store in cache
    roomsCache.set(cacheKey, { data: rooms, timestamp: Date.now() });

    const response = NextResponse.json(rooms);
    response.headers.set("X-Cache", "MISS");
    return response;
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

    // OPTIMIZATION: Invalidate cache after creating new room
    const cacheKey = `rooms-${propertyId}`;
    roomsCache.delete(cacheKey);

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
