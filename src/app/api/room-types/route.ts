export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";

// Allowed roles for modifying room types
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR"];

export async function GET(req: NextRequest) {
  try {
    // Determine organization ID from header, cookie, or query param
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const url = new URL(req.url);
    const orgIdQuery = url.searchParams.get("orgId");
    const orgId = orgIdHeader || orgIdCookie || orgIdQuery;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Fetch room types scoped to this organization
    const roomTypes = await withTenantContext(orgId, async (tx) => {
      return await tx.roomType.findMany({
        orderBy: { name: "asc" },
        include: {
          rooms: {
            orderBy: { name: "asc" }
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
  // Access control: only Org Admin and Property Manager can create room types
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !ALLOWED_ROLES.includes(role as string)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    // Determine organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

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
      additionalImageUrls
    } = await req.json();

    if (typeof name !== "string" || !name.trim()) {
      return new NextResponse("Invalid room type name", { status: 422 });
    }

    // Create new room type
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
      return new NextResponse("Room type name already exists", { status: 409 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
