// File: src/app/api/reservations/status-summary/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";
import { StatusSummary } from "@/types/reservation-status";

// Type for recent status changes with reservation data
type RecentStatusChange = {
  id: string;
  reservationId: string;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  changedBy: string | null;
  changeReason: string | null;
  changedAt: Date;
  isAutomatic: boolean;
  reservation: {
    id: string;
    guestName: string | null;
    checkIn: Date;
    checkOut: Date;
  };
};

/**
 * GET /api/reservations/status-summary
 * Get reservation status summary for dashboard
 */
export async function GET(req: NextRequest) {
  try {
    // Validate property access (FRONT_DESK role required, includes PROPERTY_MGR via hierarchy)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Parse query parameters
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const includeHistorical =
      url.searchParams.get("includeHistorical") === "true";

    // Build date filter
    const dateFilter =
      startDate && endDate
        ? {
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
          }
        : {};

    // Get status counts
    const statusCounts = await withPropertyContext(propertyId!, async (tx) => {
      const counts = await tx.reservation.groupBy({
        by: ["status"],
        where: {
          propertyId: propertyId,
          ...dateFilter
        },
        _count: {
          status: true
        }
      });

      // Convert to StatusSummary format
      const summary: StatusSummary = {
        [ReservationStatus.CONFIRMATION_PENDING]: 0,
        [ReservationStatus.CONFIRMED]: 0,
        [ReservationStatus.IN_HOUSE]: 0,
        [ReservationStatus.CHECKED_OUT]: 0,
        [ReservationStatus.NO_SHOW]: 0,
        [ReservationStatus.CANCELLED]: 0
      };

      counts.forEach((count) => {
        summary[count.status] = count._count.status;
      });

      return summary;
    });

    // Get today's activity
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayActivity = await withPropertyContext(propertyId!, async (tx) => {
      const [checkInsToday, checkOutsToday, arrivalsToday, departureToday] =
        await Promise.all([
          // Reservations that checked in today
          tx.reservation.count({
            where: {
              propertyId: propertyId,
              checkedInAt: {
                gte: todayStart,
                lt: todayEnd
              }
            }
          }),
          // Reservations that checked out today
          tx.reservation.count({
            where: {
              propertyId: propertyId,
              checkedOutAt: {
                gte: todayStart,
                lt: todayEnd
              }
            }
          }),
          // Reservations scheduled to arrive today
          tx.reservation.count({
            where: {
              propertyId: propertyId,
              checkIn: {
                gte: todayStart,
                lt: todayEnd
              },
              status: {
                in: [
                  ReservationStatus.CONFIRMED,
                  ReservationStatus.CONFIRMATION_PENDING
                ]
              }
            }
          }),
          // Reservations scheduled to depart today
          tx.reservation.count({
            where: {
              propertyId: propertyId,
              checkOut: {
                gte: todayStart,
                lt: todayEnd
              },
              status: ReservationStatus.IN_HOUSE
            }
          })
        ]);

      return {
        checkInsToday,
        checkOutsToday,
        arrivalsToday,
        departureToday
      };
    });

    // Get recent status changes if requested
    let recentChanges: RecentStatusChange[] = [];
    if (includeHistorical) {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      recentChanges = await withPropertyContext(propertyId!, async (tx) => {
        return await tx.reservationStatusHistory.findMany({
          where: {
            changedAt: {
              gte: last24Hours
            },
            reservation: {
              propertyId: propertyId
            }
          },
          include: {
            reservation: {
              select: {
                id: true,
                guestName: true,
                checkIn: true,
                checkOut: true
              }
            }
          },
          orderBy: {
            changedAt: "desc"
          },
          take: 20
        });
      });
    }

    // Calculate totals
    const totalReservations = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const activeReservations =
      statusCounts[ReservationStatus.CONFIRMED] +
      statusCounts[ReservationStatus.IN_HOUSE];
    const completedReservations = statusCounts[ReservationStatus.CHECKED_OUT];
    const cancelledReservations =
      statusCounts[ReservationStatus.CANCELLED] +
      statusCounts[ReservationStatus.NO_SHOW];

    return NextResponse.json({
      statusCounts,
      todayActivity,
      recentChanges,
      summary: {
        totalReservations,
        activeReservations,
        completedReservations,
        cancelledReservations,
        occupancyRate:
          totalReservations > 0
            ? (statusCounts[ReservationStatus.IN_HOUSE] / totalReservations) *
              100
            : 0,
        confirmationRate:
          statusCounts[ReservationStatus.CONFIRMATION_PENDING] +
            statusCounts[ReservationStatus.CONFIRMED] >
          0
            ? (statusCounts[ReservationStatus.CONFIRMED] /
                (statusCounts[ReservationStatus.CONFIRMATION_PENDING] +
                  statusCounts[ReservationStatus.CONFIRMED])) *
              100
            : 0,
        noShowRate:
          totalReservations > 0
            ? (statusCounts[ReservationStatus.NO_SHOW] / totalReservations) *
              100
            : 0
      },
      dateRange: startDate && endDate ? { startDate, endDate } : null,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("GET /api/reservations/status-summary error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
