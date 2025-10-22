// File: src/app/api/reservations/[id]/audit-log/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";

/**
 * GET /api/reservations/[id]/audit-log
 * Get complete audit log for a reservation (all changes)
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
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

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

    // Get audit log entries
    const auditLogs = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservationAuditLog.findMany({
        where: {
          reservationId: id
        },
        orderBy: {
          changedAt: "desc"
        },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    // Get total count for pagination
    const totalCount = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.reservationAuditLog.count({
        where: {
          reservationId: id
        }
      });
    });

    console.log(`📋 Audit log for reservation ${id}:`, auditLogs);

    return NextResponse.json({
      reservation: {
        id: reservation.id,
        guestName: reservation.guestName,
        currentStatus: reservation.status
      },
      auditLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error("GET /api/reservations/[id]/audit-log error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

