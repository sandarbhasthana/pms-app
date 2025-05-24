// File: src/app/api/rooms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Allowed roles for modifying rooms
const ALLOWED_ROLES = ["ORG_ADMIN", "PROPERTY_MGR"];

/**
 * Update a room by ID (PUT /api/rooms/[id])
 */
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

  // Determine orgId context
  const orgId =
    req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;
  if (!orgId) {
    return new NextResponse("Organization context missing", { status: 400 });
  }

  // Parse and validate body
  const { name, type, capacity, imageUrl } = await req.json();
  if (
    (name && typeof name !== "string") ||
    (type && typeof type !== "string") ||
    (capacity && typeof capacity !== "number")
  ) {
    return new NextResponse("Invalid payload", { status: 422 });
  }

  try {
    const updated = await prisma.room.updateMany({
      where: { id: params.id, organizationId: orgId },
      data: {
        name,
        type,
        capacity,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined
      }
    });
    if (updated.count === 0) {
      return new NextResponse("Room not found", { status: 404 });
    }
    return NextResponse.json({ updated: updated.count });
  } catch (error) {
    console.error("PUT /api/rooms/[id] error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Delete a room by ID (DELETE /api/rooms/[id])
 */
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

  // Determine orgId context
  const orgId =
    req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;
  if (!orgId) {
    return new NextResponse("Organization context missing", { status: 400 });
  }

  try {
    const deleted = await prisma.room.deleteMany({
      where: { id: params.id, organizationId: orgId }
    });
    if (deleted.count === 0) {
      return new NextResponse("Room not found", { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
