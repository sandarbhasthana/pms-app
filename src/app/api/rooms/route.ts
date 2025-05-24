// File: src/app/api/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

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
    const rooms = await prisma.room.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" }
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
    const { name, type, capacity, imageUrl } = await req.json();
    if (
      typeof name !== "string" ||
      typeof type !== "string" ||
      typeof capacity !== "number"
    ) {
      return new NextResponse("Invalid payload", { status: 422 });
    }

    // Create new room
    const newRoom = await prisma.room.create({
      data: {
        name,
        type,
        capacity,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
        organizationId: orgId
      }
    });

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
