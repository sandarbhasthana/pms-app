// File: src/app/api/reservations/[id]/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { calculatePaymentStatus } from "@/lib/payments/utils";
import { prisma } from "@/lib/prisma";
import { clearReservationsCacheForProperty } from "../route";
import { logFieldUpdate } from "@/lib/audit-log/reservation-audit";
import { getServerSession } from "next-auth";

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

    // Get current reservation data for audit logging
    const currentReservation = await prisma.reservation.findUnique({
      where: { id }
    });

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

    // Log field updates to audit trail
    try {
      const session = await getServerSession();
      const userId = session?.user?.id || null;

      // Log each field that was updated
      if (
        guestName !== undefined &&
        guestName !== currentReservation?.guestName
      ) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "guestName",
          currentReservation?.guestName,
          guestName,
          userId
        );
      }

      if (
        checkIn !== undefined &&
        checkIn !== currentReservation?.checkIn?.toISOString()
      ) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "checkIn",
          currentReservation?.checkIn?.toISOString(),
          checkIn,
          userId
        );
      }

      if (
        checkOut !== undefined &&
        checkOut !== currentReservation?.checkOut?.toISOString()
      ) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "checkOut",
          currentReservation?.checkOut?.toISOString(),
          checkOut,
          userId
        );
      }

      if (notes !== undefined && notes !== currentReservation?.notes) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "notes",
          currentReservation?.notes,
          notes,
          userId
        );
      }

      if (phone !== undefined && phone !== currentReservation?.phone) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "phone",
          currentReservation?.phone,
          phone,
          userId
        );
      }

      if (email !== undefined && email !== currentReservation?.email) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "email",
          currentReservation?.email,
          email,
          userId
        );
      }

      if (adults !== undefined && adults !== currentReservation?.adults) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "adults",
          currentReservation?.adults,
          adults,
          userId
        );
      }

      if (children !== undefined && children !== currentReservation?.children) {
        await logFieldUpdate(
          prisma,
          id,
          reservation.propertyId,
          "children",
          currentReservation?.children,
          children,
          userId
        );
      }
    } catch (auditError) {
      console.error("Error logging field updates:", auditError);
      // Don't throw - audit logging failure shouldn't block updates
    }

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
    console.log(`🗑️ DELETE /api/reservations/${id} - Starting deletion`);

    // Validate property access with required role FIRST
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      console.error(
        `❌ Property access validation failed: ${validation.error}`
      );
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;
    console.log(`✅ Property access validated for property: ${propertyId}`);

    // Delete the reservation directly within property context
    try {
      console.log(`🗑️ Deleting reservation: ${id}`);

      const result = await withPropertyContext(propertyId!, async (tx) => {
        // Delete payments first
        console.log(`🗑️ Deleting payments for reservation: ${id}`);
        const deletedPayments = await tx.payment.deleteMany({
          where: { reservationId: id }
        });
        console.log(`✅ Deleted ${deletedPayments.count} payments`);

        // Then delete the reservation
        console.log(`🗑️ Deleting reservation: ${id}`);
        const deletedReservation = await tx.reservation.delete({
          where: { id }
        });
        console.log(`✅ Deleted reservation:`, deletedReservation);
        return deletedReservation;
      });

      console.log(`✅ Reservation deleted successfully:`, result);

      // Clear the reservations cache for this property so the next fetch gets fresh data
      clearReservationsCacheForProperty(propertyId!);

      return new NextResponse(null, { status: 204 });
    } catch (deleteError) {
      console.error(`❌ Error during deletion:`, deleteError);

      // Check if it's a "record not found" error from Prisma
      if (
        deleteError instanceof Error &&
        deleteError.message.includes("P2025")
      ) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 }
        );
      }

      throw deleteError;
    }
  } catch (error) {
    console.error("❌ DELETE /api/reservations/[id] error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
