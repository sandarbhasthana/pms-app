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
    const url = new URL(req.url);
    const name = url.searchParams.get("name");

    console.log(
      `🔍 GET /api/room-types/by-name - propertyId: ${propertyId}, name: "${name}"`
    );

    if (!name) {
      console.log("❌ Missing room type name");
      return new NextResponse("Room type name is required", { status: 400 });
    }

    const roomType = await withPropertyContext(propertyId!, async (tx) => {
      // First, let's see what room types exist
      const allRoomTypes = await tx.roomType.findMany({
        where: { propertyId: propertyId },
        select: { id: true, name: true }
      });
      console.log(
        `📋 All room types for property ${propertyId}:`,
        allRoomTypes
      );

      return await tx.roomType.findFirst({
        where: {
          propertyId: propertyId,
          name: name
        },
        include: {
          rooms: {
            where: { propertyId: propertyId },
            orderBy: { name: "asc" }
          }
        }
      });
    });

    if (!roomType) {
      console.log(
        `❌ Room type "${name}" not found for property ${propertyId}`
      );
      return new NextResponse("Room type not found", { status: 404 });
    }

    console.log(`✅ Found room type:`, roomType);
    return NextResponse.json(roomType);
  } catch (error) {
    console.error("GET /api/room-types/by-name error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
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
    console.log(`💾 POST /api/room-types/by-name - propertyId: ${propertyId}`);

    const requestBody = await req.json();
    console.log("📥 Request body:", requestBody);

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
      additionalImageUrls
    } = requestBody;

    if (!name || typeof name !== "string") {
      console.log("❌ Invalid room type name:", name);
      return new NextResponse("Invalid room type name", { status: 422 });
    }

    // Try to find existing room type first
    console.log(`🔍 Looking for existing room type: "${name.trim()}"`);
    const existingRoomType = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.roomType.findFirst({
          where: {
            propertyId: propertyId,
            name: name.trim()
          },
          include: {
            rooms: {
              where: { propertyId: propertyId },
              orderBy: { name: "asc" }
            }
          }
        });
      }
    );

    console.log(
      `📋 Existing room type found:`,
      existingRoomType ? "Yes" : "No"
    );

    if (existingRoomType) {
      // Update existing room type
      console.log(
        `🔄 Updating existing room type with ID: ${existingRoomType.id}`
      );
      console.log(`📝 Update data - amenities:`, amenities);
      console.log(`📝 Update data - customAmenities:`, customAmenities);
      console.log(`📝 Update data - description:`, description);

      try {
        const updated = await withPropertyContext(propertyId!, async (tx) => {
          return await tx.roomType.update({
            where: { id: existingRoomType.id },
            data: {
              abbreviation: abbreviation || existingRoomType.abbreviation,
              privateOrDorm: privateOrDorm || existingRoomType.privateOrDorm,
              physicalOrVirtual:
                physicalOrVirtual || existingRoomType.physicalOrVirtual,
              maxOccupancy: maxOccupancy ?? existingRoomType.maxOccupancy,
              maxAdults: maxAdults ?? existingRoomType.maxAdults,
              maxChildren: maxChildren ?? existingRoomType.maxChildren,
              adultsIncluded: adultsIncluded ?? existingRoomType.adultsIncluded,
              childrenIncluded:
                childrenIncluded ?? existingRoomType.childrenIncluded,
              description: description ?? existingRoomType.description,
              amenities: amenities ?? existingRoomType.amenities,
              customAmenities:
                customAmenities ?? existingRoomType.customAmenities,
              featuredImageUrl:
                featuredImageUrl ?? existingRoomType.featuredImageUrl,
              additionalImageUrls:
                additionalImageUrls ?? existingRoomType.additionalImageUrls
            },
            include: {
              rooms: {
                orderBy: { name: "asc" }
              }
            }
          });
        });
        console.log(`✅ Room type updated successfully:`, updated.id);
        return NextResponse.json(updated);
      } catch (updateError) {
        console.error(`❌ Error updating room type:`, updateError);
        throw updateError;
      }
    } else {
      // Create new room type
      console.log(`🆕 Creating new room type: "${name.trim()}"`);
      console.log(`📝 Create data - amenities:`, amenities);
      console.log(`📝 Create data - customAmenities:`, customAmenities);

      try {
        const roomType = await withPropertyContext(propertyId!, async (tx) => {
          // Get the property to get organizationId
          const property = await tx.property.findUnique({
            where: { id: propertyId! },
            select: { organizationId: true }
          });

          if (!property) {
            throw new Error("Property not found");
          }

          return await tx.roomType.create({
            data: {
              organizationId: property.organizationId,
              propertyId: propertyId!,
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
              additionalImageUrls: additionalImageUrls || []
            },
            include: {
              rooms: {
                orderBy: { name: "asc" }
              }
            }
          });
        });
        console.log(`✅ Room type created successfully:`, roomType.id);
        return NextResponse.json(roomType, { status: 201 });
      } catch (createError) {
        console.error(`❌ Error creating room type:`, createError);
        throw createError;
      }
    }
  } catch (error) {
    console.error("POST /api/room-types/by-name error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
