// File: src/app/api/reservations/[id]/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { calculatePaymentStatus } from "@/lib/payments/utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reservations/[id]
 * Get specific reservation details
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get detailed reservation information
    const reservationDetails = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.reservation.findUnique({
          where: { id },
          include: {
            room: {
              select: { id: true, name: true, type: true }
            },
            property: {
              select: { id: true, name: true }
            },
            payments: {
              orderBy: { createdAt: "desc" }
            }
          }
        });
      }
    );

    if (!reservationDetails) {
      return new NextResponse("Reservation not found", { status: 404 });
    }

    // Add payment status
    const property = await prisma.property.findUnique({
      where: { id: propertyId! },
      select: { organizationId: true }
    });

    const paymentStatus = await calculatePaymentStatus(
      id,
      property?.organizationId || ""
    );

    return NextResponse.json({
      ...reservationDetails,
      paymentStatus
    });
  } catch (error) {
    console.error(`GET /api/reservations/${id} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reservations/[id]
 * Update reservation details
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Get reservation to determine property and current room
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { propertyId: true, roomId: true }
    });

    if (!reservation || !reservation.propertyId) {
      return new NextResponse("Reservation not found", { status: 404 });
    }

    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const {
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
      status,
      roomId // ✅ ADD ROOM ID SUPPORT
    } = await req.json();

    // If roomId is being updated, validate it belongs to the same property
    if (roomId && roomId !== reservation.roomId) {
      const newRoom = await prisma.room.findUnique({
        where: { id: roomId },
        select: { propertyId: true, name: true, type: true }
      });

      if (!newRoom) {
        return NextResponse.json({ error: "Room not found" }, { status: 400 });
      }

      if (newRoom.propertyId !== reservation.propertyId) {
        return NextResponse.json(
          { error: "Room does not belong to the same property" },
          { status: 400 }
        );
      }
    }

    // If dates are being changed, check for conflicts
    if (checkIn || checkOut) {
      const currentReservation = await prisma.reservation.findUnique({
        where: { id },
        select: { roomId: true, checkIn: true, checkOut: true }
      });

      if (currentReservation) {
        const newCheckIn = checkIn
          ? new Date(checkIn)
          : currentReservation.checkIn;
        const newCheckOut = checkOut
          ? new Date(checkOut)
          : currentReservation.checkOut;

        const conflictingReservations = await withPropertyContext(
          reservation.propertyId,
          async (tx) => {
            return await tx.reservation.findMany({
              where: {
                roomId: currentReservation.roomId,
                propertyId: reservation.propertyId,
                id: { not: id }, // Exclude current reservation
                status: { in: ["CONFIRMED", "IN_HOUSE"] },
                OR: [
                  {
                    AND: [
                      { checkIn: { lte: newCheckIn } },
                      { checkOut: { gt: newCheckIn } }
                    ]
                  },
                  {
                    AND: [
                      { checkIn: { lt: newCheckOut } },
                      { checkOut: { gte: newCheckOut } }
                    ]
                  },
                  {
                    AND: [
                      { checkIn: { gte: newCheckIn } },
                      { checkOut: { lte: newCheckOut } }
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
      }
    }

    const updated = await withPropertyContext(
      reservation.propertyId,
      async (tx) => {
        return await tx.reservation.update({
          where: { id },
          data: {
            guestName: guestName !== undefined ? guestName : undefined,
            checkIn: checkIn ? new Date(checkIn) : undefined,
            checkOut: checkOut ? new Date(checkOut) : undefined,
            adults: adults !== undefined ? adults : undefined,
            children: children !== undefined ? children : undefined,
            notes: notes !== undefined ? notes : undefined,
            phone: phone !== undefined ? phone : undefined,
            email: email !== undefined ? email : undefined,
            idType: idType !== undefined ? idType : undefined,
            idNumber: idNumber !== undefined ? idNumber : undefined,
            issuingCountry:
              issuingCountry !== undefined ? issuingCountry : undefined,
            status: status !== undefined ? status : undefined,
            roomId: roomId !== undefined ? roomId : undefined // ✅ ADD ROOM ID UPDATE
          },
          include: {
            room: {
              select: { id: true, name: true, type: true }
            },
            property: {
              select: { id: true, name: true }
            }
          }
        });
      }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/reservations/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reservations/[id]
 * Delete reservation (FRONT_DESK role required)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Get reservation to determine property
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { propertyId: true, status: true }
    });

    if (!reservation || !reservation.propertyId) {
      return new NextResponse("Reservation not found", { status: 404 });
    }

    // Validate property access with required role
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Check if reservation can be deleted (e.g., not checked in)
    if (reservation.status === "IN_HOUSE") {
      return NextResponse.json(
        { error: "Cannot delete a checked-in reservation" },
        { status: 400 }
      );
    }

    await withPropertyContext(reservation.propertyId!, async (tx) => {
      // First check if reservation exists and get payment info
      const existing = await tx.reservation.findUnique({
        where: { id },
        include: {
          payments: true // Include payments to check if any exist
        }
      });

      if (!existing) {
        return { count: 0 };
      }

      // Delete payments first (if any exist)
      if (existing.payments && existing.payments.length > 0) {
        await tx.payment.deleteMany({
          where: { reservationId: id }
        });
      }

      // Then delete the reservation
      return await tx.reservation.delete({
        where: { id }
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/reservations/[id] error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
