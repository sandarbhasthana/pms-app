export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";

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
    console.log("GET /api/room-types, resolved propertyId:", propertyId);

    // Fetch room types scoped to this property
    const roomTypes = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.roomType.findMany({
        where: { propertyId: propertyId },
        orderBy: { name: "asc" },
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
    });

    return NextResponse.json(roomTypes);
  } catch (error) {
    console.error("GET /api/room-types error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Parse and validate request body
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

    if (typeof name !== "string" || !name.trim()) {
      return new NextResponse("Invalid room type name", { status: 422 });
    }

    // Validate pricing if provided
    if (
      basePrice !== undefined &&
      (typeof basePrice !== "number" || basePrice < 0)
    ) {
      return new NextResponse("Valid base price is required", { status: 400 });
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

    // Create new room type with property association
    const roomType = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.roomType.create({
        data: {
          organizationId: property.organizationId, // Keep for backward compatibility
          propertyId: propertyId!, // NEW: Associate with property
          name: name.trim(),
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
          basePrice: basePrice || null,
          weekdayPrice: weekdayPrice || null,
          weekendPrice: weekendPrice || null,
          currency: currency || "USD",
          availability: availability || null,
          minLOS: minLOS || null,
          maxLOS: maxLOS || null,
          closedToArrival: closedToArrival || false,
          closedToDeparture: closedToDeparture || false
        }
      });
    });

    return NextResponse.json(roomType, { status: 201 });
  } catch (error) {
    console.error("POST /api/room-types error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Room type name already exists in this property" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
