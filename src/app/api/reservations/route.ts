// File: src/app/api/reservations/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { calculatePaymentStatus } from "@/lib/payments/utils";
import { ReservationStatus, PropertyRole } from "@prisma/client";

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
  email: string | null;
  phone: string | null;
  room: {
    id: string;
    name: string;
    type: string;
  };
  property: {
    id: string;
    name: string;
  } | null;
};

export async function GET(req: NextRequest) {
  try {
    // console.log("🔍 GET /api/reservations - Starting request");
    // console.log("🔍 Request URL:", req.url);
    // console.log(
    //   "🔍 Request headers:",
    //   Object.fromEntries(req.headers.entries())
    // );

    // Validate property access
    const validation = await validatePropertyAccess(req);
    //console.log("🔍 Property validation result:", validation);

    if (!validation.success) {
      console.error("❌ Property validation failed:", validation.error);
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;
    // console.log("GET /api/reservations, resolved propertyId:", propertyId);

    // Parse query parameters for filtering
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    // Support both parameter names: calendar sends 'start'/'end', others send 'startDate'/'endDate'
    const startDate =
      url.searchParams.get("start") || url.searchParams.get("startDate");
    const endDate =
      url.searchParams.get("end") || url.searchParams.get("endDate");
    const roomId = url.searchParams.get("roomId");

    // console.log("🔍 Query parameters:", { status, startDate, endDate, roomId });

    const reservations: ReservationFromDB[] = await withPropertyContext(
      propertyId!,
      (tx) =>
        tx.reservation.findMany({
          where: {
            propertyId: propertyId,
            ...(status && { status: status as ReservationStatus }),
            ...(roomId && { roomId }),
            ...(startDate &&
              endDate && {
                OR: [
                  {
                    checkIn: {
                      gte: new Date(startDate),
                      lte: new Date(endDate)
                    }
                  },
                  {
                    checkOut: {
                      gte: new Date(startDate),
                      lte: new Date(endDate)
                    }
                  },
                  {
                    AND: [
                      { checkIn: { lte: new Date(startDate) } },
                      { checkOut: { gte: new Date(endDate) } }
                    ]
                  }
                ]
              })
          },
          include: {
            room: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            property: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { checkIn: "asc" }
        })
    );

    // Add paymentStatus to each reservation with property context
    const enriched = await Promise.all(
      reservations.map(async (r: ReservationFromDB) => {
        // Get organization ID for payment status calculation (still needed for backward compatibility)
        const property = await withPropertyContext(propertyId!, async (tx) => {
          return await tx.property.findUnique({
            where: { id: propertyId },
            select: { organizationId: true }
          });
        });

        const paymentStatus = await calculatePaymentStatus(
          r.id,
          property?.organizationId || ""
        );
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
  try {
    // Validate property access with required role
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.FRONT_DESK
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

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
      issuingCountry,
      source
    } = await req.json();

    if (!roomId || !guestName || !checkIn || !checkOut || adults == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that the room belongs to the same property
    const room = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.room.findUnique({
        where: { id: roomId },
        select: { propertyId: true, name: true }
      });
    });

    if (!room || room.propertyId !== propertyId) {
      return NextResponse.json(
        { error: "Room not found in this property" },
        { status: 400 }
      );
    }

    // Get property details for organizationId (still needed for backward compatibility)
    const property = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.property.findUnique({
        where: { id: propertyId },
        select: { organizationId: true }
      });
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Check for room availability (basic overlap check)
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const conflictingReservations = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.reservation.findMany({
          where: {
            roomId: roomId,
            propertyId: propertyId,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            OR: [
              {
                AND: [
                  { checkIn: { lte: checkInDate } },
                  { checkOut: { gt: checkInDate } }
                ]
              },
              {
                AND: [
                  { checkIn: { lt: checkOutDate } },
                  { checkOut: { gte: checkOutDate } }
                ]
              },
              {
                AND: [
                  { checkIn: { gte: checkInDate } },
                  { checkOut: { lte: checkOutDate } }
                ]
              }
            ]
          }
        });
      }
    );

    if (conflictingReservations.length > 0) {
      return NextResponse.json(
        {
          error: "Room is not available for the selected dates",
          conflicts: conflictingReservations.map((r) => ({
            id: r.id,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            guestName: r.guestName
          }))
        },
        { status: 409 }
      );
    }

    const reservation = await withPropertyContext(propertyId!, (tx) =>
      tx.reservation.create({
        data: {
          organizationId: property.organizationId, // Keep for backward compatibility
          propertyId: propertyId, // NEW: Associate with property
          roomId,
          guestName,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          adults,
          children: children || 0,
          notes,
          phone,
          email,
          idType,
          idNumber,
          issuingCountry,
          source: source || "WEBSITE",
          status: "CONFIRMED"
        },
        include: {
          room: {
            select: { id: true, name: true, type: true }
          },
          property: {
            select: { id: true, name: true }
          }
        }
      })
    );

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("POST /api/reservations error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
