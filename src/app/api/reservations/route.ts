// File: src/app/api/reservations/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // Determine organization context from header, cookie, or query
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const url = new URL(req.url);
    const orgIdQuery = url.searchParams.get("orgId");
    const orgId = orgIdHeader || orgIdCookie || orgIdQuery;

    console.log("📡 GET /api/reservations → orgId:", orgId);

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Fetch reservations for this organization
    const reservations = await withTenantContext(orgId, async (tx) => {
      return await tx.reservation.findMany({
        select: {
          id: true,
          guestName: true,
          roomId: true,
          checkIn: true,
          checkOut: true,
          adults: true,
          children: true,
          notes: true
        },
        orderBy: { checkIn: "asc" }
      });
    });

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
  try {
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const url = new URL(req.url);
    const orgIdQuery = url.searchParams.get("orgId");
    const orgId = orgIdHeader || orgIdCookie || orgIdQuery;
    const body = await req.json();

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    const { roomId, guestName, checkIn, checkOut, adults, children } = body;

    if (!roomId || !guestName || !checkIn || !checkOut || !adults) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Optional: get current orgId from session
    // const session = await getServerSession(authOptions);
    // const orgId = session?.user?.orgId;

    const reservation = await withTenantContext(orgId, async (tx) => {
      return await tx.reservation.create({
        data: {
          organizationId: orgId,
          roomId,
          guestName,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          adults,
          children,
          source: "WEBSITE"
        }
      });
    });

    return NextResponse.json(reservation, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/reservations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
