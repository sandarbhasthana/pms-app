// File: src/app/api/dashboard/analytics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validatePropertyAccess } from "@/lib/property-context";
import { withPropertyContext } from "@/lib/property-context";
import { ReservationStatus } from "@prisma/client";

// Simple in-memory cache for analytics data
const analyticsCache = new Map<
  string,
  { data: UnifiedAnalyticsData; timestamp: number }
>();
const ANALYTICS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface StatusSummary {
  [ReservationStatus.CONFIRMATION_PENDING]: number;
  [ReservationStatus.CONFIRMED]: number;
  [ReservationStatus.CHECKIN_DUE]: number;
  [ReservationStatus.IN_HOUSE]: number;
  [ReservationStatus.CHECKOUT_DUE]: number;
  [ReservationStatus.CHECKED_OUT]: number;
  [ReservationStatus.NO_SHOW]: number;
  [ReservationStatus.CANCELLED]: number;
}

interface UnifiedAnalyticsData {
  statusOverview: {
    statusCounts: StatusSummary;
    todayActivity: {
      checkInsToday: number;
      checkOutsToday: number;
      arrivalsToday: number;
      departuresScheduled: number;
    };
    summary: {
      totalReservations: number;
      activeReservations: number;
      completedReservations: number;
      cancelledReservations: number;
      occupancyRate: number;
      confirmationRate: number;
      noShowRate: number;
    };
    recentChanges?: Array<{
      id: string;
      reservationId: string;
      previousStatus: ReservationStatus | null;
      newStatus: ReservationStatus;
      changedBy: string | null;
      changeReason: string | null;
      changedAt: string;
      isAutomatic: boolean;
      reservation: {
        id: string;
        guestName: string | null;
        checkIn: string;
        checkOut: string;
      };
    }>;
  };
  chartData: {
    statusDistribution: Array<{
      status: ReservationStatus;
      count: number;
      percentage: number;
    }>;
    dailyTrends: Array<{
      date: string;
      [key: string]: number | string;
    }>;
    conversionRates: {
      pendingToConfirmed: number;
      confirmedToCheckedIn: number;
      checkedInToCheckedOut: number;
      cancellationRate: number;
      noShowRate: number;
    };
    averageTimeInStatus: Array<{
      status: ReservationStatus;
      averageHours: number;
    }>;
  };
}

/**
 * GET /api/dashboard/analytics
 * Unified analytics endpoint that combines status overview and chart data
 * Reduces API calls from 2-4 to 1
 */
export async function GET(req: NextRequest) {
  try {
    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    if (!propertyId) {
      return new NextResponse("Property ID is required", { status: 400 });
    }

    const url = new URL(req.url);
    const includeRecentActivity =
      url.searchParams.get("includeRecentActivity") === "true";

    // Check cache first
    const cacheKey = `analytics-${propertyId}-${includeRecentActivity}`;
    const now = Date.now();
    const cached = analyticsCache.get(cacheKey);

    if (cached && now - cached.timestamp < ANALYTICS_CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for analytics: ${cacheKey} (age: ${Math.round(
            (now - cached.timestamp) / 1000
          )}s)`
        );
      }
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    // Fetch all analytics data in parallel
    const [statusOverview, chartData] = await Promise.all([
      fetchStatusOverview(propertyId, includeRecentActivity),
      fetchChartData(propertyId)
    ]);

    const unifiedData: UnifiedAnalyticsData = {
      statusOverview,
      chartData
    };

    // Cache the response
    analyticsCache.set(cacheKey, { data: unifiedData, timestamp: now });

    // Clean up old cache entries
    if (analyticsCache.size > 50) {
      const oldestKey = analyticsCache.keys().next().value;
      if (oldestKey) {
        analyticsCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Fresh analytics data: ${cacheKey}`);
    }

    const response = NextResponse.json(unifiedData);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("Failed to get unified analytics:", error);
    return NextResponse.json(
      { error: "Failed to get unified analytics" },
      { status: 500 }
    );
  }
}

/**
 * Fetch status overview data
 */
async function fetchStatusOverview(
  propertyId: string,
  includeRecentActivity: boolean
) {
  return await withPropertyContext(propertyId, async (tx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get status counts
    const counts = await tx.reservation.groupBy({
      by: ["status"],
      where: { propertyId },
      _count: { status: true }
    });

    const statusCounts: StatusSummary = {
      [ReservationStatus.CONFIRMATION_PENDING]: 0,
      [ReservationStatus.CONFIRMED]: 0,
      [ReservationStatus.CHECKIN_DUE]: 0,
      [ReservationStatus.IN_HOUSE]: 0,
      [ReservationStatus.CHECKOUT_DUE]: 0,
      [ReservationStatus.CHECKED_OUT]: 0,
      [ReservationStatus.NO_SHOW]: 0,
      [ReservationStatus.CANCELLED]: 0
    };

    counts.forEach((count) => {
      statusCounts[count.status] = count._count.status;
    });

    // Get today's activity
    const [checkInsToday, checkOutsToday] = await Promise.all([
      tx.reservation.count({
        where: {
          propertyId,
          checkIn: { gte: today, lt: tomorrow },
          status: {
            in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKIN_DUE]
          }
        }
      }),
      tx.reservation.count({
        where: {
          propertyId,
          checkOut: { gte: today, lt: tomorrow },
          status: {
            in: [ReservationStatus.IN_HOUSE, ReservationStatus.CHECKOUT_DUE]
          }
        }
      })
    ]);

    // Calculate summary metrics
    const totalReservations = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const activeReservations =
      statusCounts[ReservationStatus.CONFIRMED] +
      statusCounts[ReservationStatus.CHECKIN_DUE] +
      statusCounts[ReservationStatus.IN_HOUSE] +
      statusCounts[ReservationStatus.CHECKOUT_DUE];
    const completedReservations = statusCounts[ReservationStatus.CHECKED_OUT];
    const cancelledReservations = statusCounts[ReservationStatus.CANCELLED];

    // Get recent changes if requested
    let recentChanges = undefined;
    if (includeRecentActivity) {
      const changes = await tx.reservationStatusHistory.findMany({
        where: { reservation: { propertyId } },
        orderBy: { changedAt: "desc" },
        take: 10,
        include: {
          reservation: {
            select: {
              id: true,
              guestName: true,
              checkIn: true,
              checkOut: true
            }
          }
        }
      });

      recentChanges = changes.map((change) => ({
        id: change.id,
        reservationId: change.reservationId,
        previousStatus: change.previousStatus,
        newStatus: change.newStatus,
        changedBy: change.changedBy,
        changeReason: change.changeReason,
        changedAt: change.changedAt.toISOString(),
        isAutomatic: change.isAutomatic,
        reservation: {
          id: change.reservation.id,
          guestName: change.reservation.guestName,
          checkIn: change.reservation.checkIn.toISOString(),
          checkOut: change.reservation.checkOut.toISOString()
        }
      }));
    }

    return {
      statusCounts,
      todayActivity: {
        checkInsToday,
        checkOutsToday,
        arrivalsToday: checkInsToday,
        departuresScheduled: checkOutsToday
      },
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
      recentChanges
    };
  });
}

/**
 * Fetch chart data (status distribution and trends)
 */
async function fetchChartData(propertyId: string) {
  return await withPropertyContext(propertyId, async (tx) => {
    // Get status distribution
    const statusCounts = await tx.reservation.groupBy({
      by: ["status"],
      where: { propertyId },
      _count: { status: true }
    });

    const totalReservations = statusCounts.reduce(
      (sum, item) => sum + item._count.status,
      0
    );

    const statusDistribution = statusCounts.map((item) => ({
      status: item.status,
      count: item._count.status,
      percentage:
        totalReservations > 0
          ? (item._count.status / totalReservations) * 100
          : 0
    }));

    // Get daily trends for last 7 days
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayCounts = await tx.reservation.groupBy({
        by: ["status"],
        where: {
          propertyId,
          createdAt: { gte: date, lt: nextDate }
        },
        _count: { status: true }
      });

      const dayData: { date: string; [key: string]: number | string } = {
        date: date.toISOString().split("T")[0]
      };

      dayCounts.forEach((count) => {
        dayData[count.status] = count._count.status;
      });

      dailyTrends.push(dayData);
    }

    // Calculate conversion rates
    const totalConfirmed =
      statusCounts.find((s) => s.status === ReservationStatus.CONFIRMED)?._count
        .status || 0;
    const totalPending =
      statusCounts.find(
        (s) => s.status === ReservationStatus.CONFIRMATION_PENDING
      )?._count.status || 0;
    const totalCheckedIn =
      statusCounts.find((s) => s.status === ReservationStatus.IN_HOUSE)?._count
        .status || 0;
    const totalCheckedOut =
      statusCounts.find((s) => s.status === ReservationStatus.CHECKED_OUT)
        ?._count.status || 0;
    const totalCancelled =
      statusCounts.find((s) => s.status === ReservationStatus.CANCELLED)?._count
        .status || 0;
    const totalNoShow =
      statusCounts.find((s) => s.status === ReservationStatus.NO_SHOW)?._count
        .status || 0;

    // Calculate average time in status
    const averageTimeInStatus = await Promise.all(
      Object.values(ReservationStatus).map(async (status) => {
        // Get status history for this status
        const statusHistory = await tx.reservationStatusHistory.findMany({
          where: {
            newStatus: status,
            reservation: {
              propertyId: propertyId
            }
          },
          orderBy: {
            changedAt: "desc"
          },
          take: 50 // Limit for performance
        });

        let totalHours = 0;
        let count = 0;

        for (const history of statusHistory) {
          // Find the next status change or use current time
          const nextChange = await tx.reservationStatusHistory.findFirst({
            where: {
              reservationId: history.reservationId,
              changedAt: {
                gt: history.changedAt
              }
            },
            orderBy: {
              changedAt: "asc"
            }
          });

          const endTime = nextChange ? nextChange.changedAt : new Date();
          const timeInStatus =
            (endTime.getTime() - history.changedAt.getTime()) /
            (1000 * 60 * 60); // hours

          if (timeInStatus > 0 && timeInStatus < 24 * 30) {
            // Reasonable bounds (less than 30 days)
            totalHours += timeInStatus;
            count++;
          }
        }

        return {
          status,
          averageHours: count > 0 ? totalHours / count : 0
        };
      })
    );

    return {
      statusDistribution,
      dailyTrends,
      conversionRates: {
        pendingToConfirmed:
          totalPending + totalConfirmed > 0
            ? (totalConfirmed / (totalPending + totalConfirmed)) * 100
            : 0,
        confirmedToCheckedIn:
          totalConfirmed > 0 ? (totalCheckedIn / totalConfirmed) * 100 : 0,
        checkedInToCheckedOut:
          totalCheckedIn > 0 ? (totalCheckedOut / totalCheckedIn) * 100 : 0,
        cancellationRate:
          totalReservations > 0
            ? (totalCancelled / totalReservations) * 100
            : 0,
        noShowRate:
          totalReservations > 0 ? (totalNoShow / totalReservations) * 100 : 0
      },
      averageTimeInStatus
    };
  });
}
