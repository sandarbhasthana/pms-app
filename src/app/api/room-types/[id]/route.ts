export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";

// Allowed roles for modifying room types
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR"];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    const roomType = await withTenantContext(orgId, async (tx) => {
      return await tx.roomType.findFirst({
        where: { id: params.id },
        include: {
          rooms: {
            orderBy: { name: "asc" }
          }
        }
      });
    });

    if (!roomType) {
      return new NextResponse("Room type not found", { status: 404 });
    }

    return NextResponse.json(roomType);
  } catch (error) {
    console.error("GET /api/room-types/[id] error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Access control
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !ALLOWED_ROLES.includes(role as string)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
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
      additionalImageUrls
    } = await req.json();

    const updated = await withTenantContext(orgId, async (tx) => {
      return await tx.roomType.update({
        where: { id: params.id },
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
          additionalImageUrls: additionalImageUrls || []
        }
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/room-types/[id] error:", error);
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return new NextResponse("Room type name already exists", {
          status: 409
        });
      }
      if (error.code === "P2025") {
        return new NextResponse("Room type not found", { status: 404 });
      }
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Access control
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !ALLOWED_ROLES.includes(role as string)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const orgId =
      req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    await withTenantContext(orgId, async (tx) => {
      // First, unlink any rooms from this room type
      await tx.room.updateMany({
        where: { roomTypeId: params.id },
        data: { roomTypeId: null }
      });

      // Then delete the room type
      return await tx.roomType.delete({
        where: { id: params.id }
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
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
