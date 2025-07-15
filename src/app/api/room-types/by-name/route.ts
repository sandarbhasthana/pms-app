export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";

// Allowed roles for modifying room types
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR"];

export async function GET(req: NextRequest) {
  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;
    const url = new URL(req.url);
    const name = url.searchParams.get("name");

    console.log(
      `🔍 GET /api/room-types/by-name - orgId: ${orgId}, name: "${name}"`
    );

    if (!orgId) {
      console.log("❌ Missing organization context");
      return new NextResponse("Organization context missing", { status: 400 });
    }

    if (!name) {
      console.log("❌ Missing room type name");
      return new NextResponse("Room type name is required", { status: 400 });
    }

    const roomType = await withTenantContext(orgId, async (tx) => {
      // First, let's see what room types exist
      const allRoomTypes = await tx.roomType.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true }
      });
      console.log(`📋 All room types for org ${orgId}:`, allRoomTypes);

      return await tx.roomType.findFirst({
        where: {
          organizationId: orgId,
          name: name
        },
        include: {
          rooms: {
            orderBy: { name: "asc" }
          }
        }
      });
    });

    if (!roomType) {
      console.log(`❌ Room type "${name}" not found for org ${orgId}`);
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
  // Access control: only Org Admin and Property Manager can create room types
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !ALLOWED_ROLES.includes(role as string)) {
    console.log(`❌ Access denied - role: ${role}`);
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

    console.log(`💾 POST /api/room-types/by-name - orgId: ${orgId}`);

    if (!orgId) {
      console.log("❌ Missing organization context");
      return new NextResponse("Organization context missing", { status: 400 });
    }

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
    const existingRoomType = await withTenantContext(orgId, async (tx) => {
      return await tx.roomType.findFirst({
        where: {
          organizationId: orgId,
          name: name.trim()
        },
        include: {
          rooms: {
            orderBy: { name: "asc" }
          }
        }
      });
    });

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
        const updated = await withTenantContext(orgId, async (tx) => {
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
        const roomType = await withTenantContext(orgId, async (tx) => {
          return await tx.roomType.create({
            data: {
              organizationId: orgId,
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
