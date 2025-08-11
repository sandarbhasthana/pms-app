export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get detailed room type information
    const roomTypeDetails = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.roomType.findUnique({
          where: { id },
          include: {
            rooms: {
              where: { propertyId: propertyId },
              orderBy: { name: "asc" }
            },
            property: {
              select: { id: true, name: true }
            },
            _count: {
              select: { rooms: true }
            }
          }
        });
      }
    );

    if (!roomTypeDetails) {
      return new NextResponse("Room type not found", { status: 404 });
    }

    return NextResponse.json(roomTypeDetails);
  } catch (error) {
    console.error("GET /api/room-types/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Get room type to determine property
    const roomType = await prisma.roomType.findUnique({
      where: { id },
      select: { propertyId: true }
    });

    if (!roomType || !roomType.propertyId) {
      return new NextResponse("Room type not found", { status: 404 });
    }

    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Parse and validate body
    const {
      name,
      abbreviation,
      privateOrDorm,
      physicalOrVirtual,
      maxOccupancy,
      maxAdults,
      maxChildren,
      adultsIncluded,
      childrenIncluded,
      description,
      amenities,
      customAmenities,
      featuredImageUrl,
      additionalImageUrls,
      // Pricing fields
      basePrice,
      weekdayPrice,
      weekendPrice,
      currency,
      availability,
      minLOS,
      maxLOS,
      closedToArrival,
      closedToDeparture
    } = await req.json();

    const updated = await withPropertyContext(
      roomType.propertyId,
      async (tx) => {
        return await tx.roomType.update({
          where: { id },
          data: {
            name: name?.trim(),
            abbreviation: abbreviation || null,
            privateOrDorm: privateOrDorm || "private",
            physicalOrVirtual: physicalOrVirtual || "physical",
            maxOccupancy: maxOccupancy || 1,
            maxAdults: maxAdults || 1,
            maxChildren: maxChildren || 0,
            adultsIncluded: adultsIncluded || 1,
            childrenIncluded: childrenIncluded || 0,
            description: description || null,
            amenities: amenities || [],
            customAmenities: customAmenities || [],
            featuredImageUrl: featuredImageUrl || null,
            additionalImageUrls: additionalImageUrls || [],
            // Pricing fields
            basePrice: basePrice !== undefined ? basePrice : undefined,
            weekdayPrice: weekdayPrice !== undefined ? weekdayPrice : undefined,
            weekendPrice: weekendPrice !== undefined ? weekendPrice : undefined,
            currency: currency || undefined,
            availability: availability !== undefined ? availability : undefined,
            minLOS: minLOS !== undefined ? minLOS : undefined,
            maxLOS: maxLOS !== undefined ? maxLOS : undefined,
            closedToArrival:
              closedToArrival !== undefined ? closedToArrival : undefined,
            closedToDeparture:
              closedToDeparture !== undefined ? closedToDeparture : undefined
          }
        });
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/room-types/[id] error:", error);
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Room type name already exists in this property" },
          { status: 409 }
        );
      }
      if (error.code === "P2025") {
        return new NextResponse("Room type not found", { status: 404 });
      }
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Get room type to determine property
    const roomType = await prisma.roomType.findUnique({
      where: { id },
      select: { propertyId: true }
    });

    if (!roomType || !roomType.propertyId) {
      return new NextResponse("Room type not found", { status: 404 });
    }

    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Check if room type has associated rooms
    const roomCount = await prisma.room.count({
      where: {
        roomTypeId: id,
        propertyId: roomType.propertyId
      }
    });

    if (roomCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete room type with associated rooms",
          message: `This room type has ${roomCount} associated room(s). Please reassign or delete these rooms first.`,
          roomCount
        },
        { status: 409 }
      );
    }

    await withPropertyContext(roomType.propertyId, async (tx) => {
      // Delete the room type
      return await tx.roomType.delete({
        where: { id }
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/room-types/[id] error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return new NextResponse("Room type not found", { status: 404 });
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
