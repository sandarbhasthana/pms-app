// File: src/app/api/reservations/bulk-status/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";
import { validateStatusTransition } from "@/lib/reservation-status/utils";
import { BulkStatusUpdatePayload } from "@/types/reservation-status";

/**
 * POST /api/reservations/bulk-status
 * Update status for multiple reservations
 */
export async function POST(req: NextRequest) {
  try {
    // Validate property access (PROPERTY_MGR role required for bulk operations)
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId, userId } = validation;

    // Parse request body
    const {
      reservationIds,
      newStatus,
      reason,
      updatedBy
    }: BulkStatusUpdatePayload = await req.json();

    if (
      !reservationIds ||
      !Array.isArray(reservationIds) ||
      reservationIds.length === 0
    ) {
      return NextResponse.json(
        { error: "reservationIds array is required" },
        { status: 400 }
      );
    }

    if (!newStatus) {
      return NextResponse.json(
        { error: "newStatus is required" },
        { status: 400 }
      );
    }

    if (reservationIds.length > 100) {
      return NextResponse.json(
        { error: "Cannot update more than 100 reservations at once" },
        { status: 400 }
      );
    }

    // Get all reservations and validate they belong to the property
    const reservations = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservation.findMany({
        where: {
          id: { in: reservationIds },
          propertyId: propertyId
        },
        select: {
          id: true,
          status: true,
          guestName: true
        }
      });
    });

    if (reservations.length !== reservationIds.length) {
      return NextResponse.json(
        { error: "Some reservations not found or not accessible" },
        { status: 404 }
      );
    }

    // Validate all status transitions
    const validationResults = reservations.map((reservation) => ({
      reservationId: reservation.id,
      guestName: reservation.guestName,
      currentStatus: reservation.status,
      validation: validateStatusTransition(reservation.status, newStatus)
    }));

    const invalidTransitions = validationResults.filter(
      (result) => !result.validation.isValid
    );

    if (invalidTransitions.length > 0) {
      return NextResponse.json(
        {
          error: "Some status transitions are not allowed",
          invalidTransitions: invalidTransitions.map((t) => ({
            reservationId: t.reservationId,
            guestName: t.guestName,
            currentStatus: t.currentStatus,
            reason: t.validation.reason
          }))
        },
        { status: 400 }
      );
    }

    // Perform bulk update
    const results = await withPropertyContext(propertyId!, async (tx) => {
      const updatePromises = reservations.map(async (reservation) => {
        // Update reservation
        const updated = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: newStatus,
            statusUpdatedBy: updatedBy || userId || null, // Use null instead of "system"
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
          select: {
            id: true,
            guestName: true,
            status: true,
            statusUpdatedAt: true
          }
        });

        // Create status history entry
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: reservation.id,
            propertyId: propertyId!,
            previousStatus: reservation.status,
            newStatus: newStatus,
            changedBy: updatedBy || userId || null, // Use null instead of "system"
            changeReason: reason || "Bulk status update",
            isAutomatic: false
          }
        });

        return {
          reservationId: reservation.id,
          guestName: updated.guestName,
          previousStatus: reservation.status,
          newStatus: updated.status,
          success: true
        };
      });

      return await Promise.all(updatePromises);
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${results.length} reservations`,
      results,
      summary: {
        totalRequested: reservationIds.length,
        totalUpdated: results.length,
        newStatus
      }
    });
  } catch (error) {
    console.error("POST /api/reservations/bulk-status error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
