// File: src/app/api/reservations/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { calculatePaymentStatus } from "@/lib/payments/utils";

// Type for the reservation data returned from the database query
type ReservationFromDB = {
  id: string;
  guestName: string | null;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  status: string;
  notes: string | null;
};

export async function GET(req: NextRequest) {
  const orgId = req.cookies.get("orgId")?.value;
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization context missing" },
      { status: 400 }
    );
  }

  try {
    const reservations: ReservationFromDB[] = await withTenantContext(
      orgId,
      (tx) =>
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
            notes: true
          },
          orderBy: { checkIn: "asc" }
        })
    );

    // Add paymentStatus to each reservation with tenant context
    const enriched = await Promise.all(
      reservations.map(async (r: ReservationFromDB) => {
        const paymentStatus = await calculatePaymentStatus(r.id, orgId);
        return { ...r, paymentStatus };
      })
    );

    return NextResponse.json({
      count: enriched.length,
      reservations: enriched
    });
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      phone,
      email,
      idType,
      idNumber,
      issuingCountry
    } = await req.json();

    if (!roomId || !guestName || !checkIn || !checkOut || adults == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
          phone,
          email,
          idType,
          idNumber,
          issuingCountry,
          source: "WEBSITE"
        }
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
