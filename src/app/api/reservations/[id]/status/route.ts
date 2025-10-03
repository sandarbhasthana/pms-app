// File: src/app/api/reservations/[id]/status/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";
import { validateStatusTransition } from "@/lib/reservation-status/utils";

/**
 * PATCH /api/reservations/[id]/status
 * Update reservation status with validation and audit trail
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate property access (FRONT_DESK role required)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId, userId } = validation;

    // Parse request body
    const {
      newStatus,
      reason,
      updatedBy,
      isAutomatic = false
    }: {
      newStatus: ReservationStatus;
      reason?: string;
      updatedBy?: string;
      isAutomatic?: boolean;
    } = await req.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "newStatus is required" },
        { status: 400 }
      );
    }

    // Validate that the reservation exists and belongs to the property
    const reservation = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservation.findFirst({
        where: {
          id,
          propertyId: propertyId
        },
        select: {
          id: true,
          status: true,
          guestName: true,
          checkIn: true,
          checkOut: true
        }
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Validate status transition
    const transitionValidation = validateStatusTransition(
      reservation.status,
      newStatus
    );

    if (!transitionValidation.isValid) {
      return NextResponse.json(
        { error: transitionValidation.reason },
        { status: 400 }
      );
    }

    // Update reservation status and create audit trail
    const updatedReservation = await withPropertyContext(
      propertyId!,
      async (tx) => {
        // Update the reservation
        const updated = await tx.reservation.update({
          where: { id },
          data: {
            status: newStatus,
            statusUpdatedBy: updatedBy || userId || "system",
            statusUpdatedAt: new Date(),
            statusChangeReason: reason,
            // Set check-in/check-out timestamps based on status
            ...(newStatus === ReservationStatus.IN_HOUSE && {
              checkedInAt: new Date()
            }),
            ...(newStatus === ReservationStatus.CHECKED_OUT && {
              checkedOutAt: new Date()
            })
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

        // Create status history entry
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: id,
            previousStatus: reservation.status,
            newStatus: newStatus,
            changedBy: updatedBy || userId || "system",
            changeReason: reason,
            isAutomatic: isAutomatic
          }
        });

        return updated;
      }
    );

    return NextResponse.json({
      success: true,
      reservation: updatedReservation,
      message: `Status updated to ${newStatus}`
    });
  } catch (error) {
    console.error("PATCH /api/reservations/[id]/status error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservations/[id]/status
 * Get current status and recent status history
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate property access (FRONT_DESK role required)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get reservation with status information
    const reservation = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservation.findFirst({
        where: {
          id,
          propertyId: propertyId
        },
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          checkedOutAt: true,
          statusUpdatedBy: true,
          statusUpdatedAt: true,
          statusChangeReason: true,
          guestName: true,
          checkIn: true,
          checkOut: true
        }
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      reservation,
      currentStatus: reservation.status
    });
  } catch (error) {
    console.error("GET /api/reservations/[id]/status error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
