// File: src/app/api/reservations/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  // 1️⃣ Only use the cookie
  const orgId = req.cookies.get("orgId")?.value;
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization context missing" },
      { status: 400 }
    );
  }

  try {
    // 2️⃣ Fetch only this org's reservations
    const reservations = await withTenantContext(orgId, (tx) =>
      tx.reservation.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          guestName: true,
          roomId: true,
          checkIn: true,
          checkOut: true,
          adults: true,
          children: true,
          status: true,
          notes: true,
        },
        orderBy: { checkIn: "asc" },
      })
    );

    return NextResponse.json({ count: reservations.length, reservations });
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // 1️⃣ Only use the cookie
  const orgId = req.cookies.get("orgId")?.value;
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization context missing" },
      { status: 400 }
    );
  }

  try {
    const {
      roomId,
      guestName,
      checkIn,
      checkOut,
      adults,
      children,
      notes,
    } = await req.json();

    if (!roomId || !guestName || !checkIn || !checkOut || adults == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2️⃣ Create under the selected org
    const reservation = await withTenantContext(orgId, (tx) =>
      tx.reservation.create({
        data: {
          organizationId: orgId,
          roomId,
          guestName,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          adults,
          children,
          notes,
          source: "WEBSITE",
        },
      })
    );

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("POST /api/reservations error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
