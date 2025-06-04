//api/reservations/[id]/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId =
    req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

  if (!orgId) {
    return new NextResponse("Missing organization context", { status: 400 });
  }

  const { guestName, checkIn, checkOut, adults, children, notes } =
    await req.json();

  try {
    const updated = await withTenantContext(orgId, async (tx) => {
      return await tx.reservation.update({
        where: { id: params.id },
        data: {
          guestName: guestName !== undefined ? guestName : undefined,
          checkIn: checkIn ? new Date(checkIn) : undefined,
          checkOut: checkOut ? new Date(checkOut) : undefined,
          adults: adults !== undefined ? adults : undefined,
          children: children !== undefined ? children : undefined,
          notes: notes !== undefined ? notes : undefined
        }
      });
    });

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Update error:", error);
    return new NextResponse("Failed to update reservation", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orgId =
    req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

  if (!orgId) {
    return new NextResponse("Missing organization context", { status: 400 });
  }

  try {
    const deleted = await withTenantContext(orgId, async (tx) => {
      return await tx.reservation.deleteMany({
        where: { id: params.id }
      });
    });

    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Delete error:", error);
    return new NextResponse("Failed to delete reservation", { status: 500 });
  }
}

/**
 * GET /api/reservations/[id]
 * Returns a single reservation by ID (scoped to the current org via RLS).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Extract orgId from header or cookie
  const orgId =
    req.headers.get("x-organization-id") || req.cookies.get("orgId")?.value;

  if (!orgId) {
    return new NextResponse("Missing organization context", { status: 400 });
  }

  try {
    const reservation = await withTenantContext(orgId, async (tx) => {
      // `findFirst` ensures we only fetch a reservation that belongs to this org
      return await tx.reservation.findFirst({
        where: {
          id: params.id,
          organizationId: orgId
        }
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("GET /api/reservations/[id] error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
