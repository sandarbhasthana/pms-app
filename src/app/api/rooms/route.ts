// File: src/app/api/rooms/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // Determine organization ID from header, cookie, or query param
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const url = new URL(req.url);
    const orgIdQuery = url.searchParams.get("orgId");
    const orgId = orgIdHeader || orgIdCookie || orgIdQuery;
    console.log("GET /api/rooms, resolved orgId:", orgId);

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Fetch rooms scoped to this organization
    const rooms = await withTenantContext(orgId, async (tx) => {
      return await tx.room.findMany({
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
  // Access control: only Org Admin and Property Manager can add rooms
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || (role !== "ORG_ADMIN" && role !== "PROPERTY_MGR")) {
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

    // Create new room with optional pricing
    const room = await withTenantContext(orgId, async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          organizationId: orgId, // Still required for insert policy to pass
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
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
