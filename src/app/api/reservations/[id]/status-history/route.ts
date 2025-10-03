// File: src/app/api/reservations/[id]/status-history/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";

/**
 * GET /api/reservations/[id]/status-history
 * Get complete status history for a reservation
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

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const includeAutomatic = url.searchParams.get("includeAutomatic") !== "false";

    // Verify reservation exists and belongs to property
    const reservation = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservation.findFirst({
        where: {
          id,
          propertyId: propertyId
        },
        select: {
          id: true,
          guestName: true,
          status: true
        }
      });
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Get status history
    const statusHistory = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservationStatusHistory.findMany({
        where: {
          reservationId: id,
          ...(includeAutomatic ? {} : { isAutomatic: false })
        },
        orderBy: {
          changedAt: 'desc'
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          changedBy: true,
          changeReason: true,
          changedAt: true,
          isAutomatic: true
        }
      });
    });

    // Get total count for pagination
    const totalCount = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservationStatusHistory.count({
        where: {
          reservationId: id,
          ...(includeAutomatic ? {} : { isAutomatic: false })
        }
      });
    });

    return NextResponse.json({
      reservation: {
        id: reservation.id,
        guestName: reservation.guestName,
        currentStatus: reservation.status
      },
      statusHistory,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error("GET /api/reservations/[id]/status-history error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
