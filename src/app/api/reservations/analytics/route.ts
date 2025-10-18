// File: src/app/api/reservations/analytics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";

// Simple in-memory cache for analytics data
const analyticsCache = new Map<string, { data: unknown; timestamp: number }>();
const ANALYTICS_CACHE_DURATION = 300000; // 5 minutes cache for analytics

/**
 * GET /api/reservations/analytics
 * Get comprehensive reservation status analytics for a property
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
    const { searchParams } = new URL(req.url);

    // Parse date range parameters
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30); // Last 30 days
    const defaultTo = new Date();

    const from = fromParam ? new Date(fromParam) : defaultFrom;
    const to = toParam ? new Date(toParam) : defaultTo;

    // Create cache key
    const cacheKey = `${propertyId}-${from.toISOString()}-${to.toISOString()}`;
    const now = Date.now();

    // Check cache first
    const cached = analyticsCache.get(cacheKey);
    if (cached && now - cached.timestamp < ANALYTICS_CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(`📊 Analytics cache hit: ${cacheKey}`);
      }
      return NextResponse.json(cached.data);
    }

    // Get analytics data
    const analytics = await withPropertyContext(propertyId!, async (tx) => {
      // 1. Status Distribution
      const statusCounts = await tx.reservation.groupBy({
        by: ["status"],
        where: {
          propertyId: propertyId,
          createdAt: {
            gte: from,
            lte: to
          }
        },
        _count: {
          status: true
        }
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

      // 2. Daily Trends (reduced to last 7 days for performance)
      const dailyTrends = [];
      const trendDays = 7;

      for (let i = trendDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const dayCounts = await tx.reservation.groupBy({
          by: ["status"],
          where: {
            propertyId: propertyId,
            createdAt: {
              gte: dayStart,
              lt: dayEnd
            }
          },
          _count: {
            status: true
          }
        });

        const dayData: Record<string, string | number> = {
          date: dayStart.toISOString().split("T")[0],
          [ReservationStatus.CONFIRMATION_PENDING]: 0,
          [ReservationStatus.CONFIRMED]: 0,
          [ReservationStatus.IN_HOUSE]: 0,
          [ReservationStatus.CHECKED_OUT]: 0,
          [ReservationStatus.NO_SHOW]: 0,
          [ReservationStatus.CANCELLED]: 0
        };

        dayCounts.forEach((count) => {
          dayData[count.status] = count._count.status;
        });

        dailyTrends.push(dayData);
      }

      // 3. Conversion Rates
      const pendingCount =
        statusCounts.find(
          (s) => s.status === ReservationStatus.CONFIRMATION_PENDING
        )?._count.status || 0;
      const confirmedCount =
        statusCounts.find((s) => s.status === ReservationStatus.CONFIRMED)
          ?._count.status || 0;
      const inHouseCount =
        statusCounts.find((s) => s.status === ReservationStatus.IN_HOUSE)
          ?._count.status || 0;
      const checkedOutCount =
        statusCounts.find((s) => s.status === ReservationStatus.CHECKED_OUT)
          ?._count.status || 0;
      const noShowCount =
        statusCounts.find((s) => s.status === ReservationStatus.NO_SHOW)?._count
          .status || 0;
      const cancelledCount =
        statusCounts.find((s) => s.status === ReservationStatus.CANCELLED)
          ?._count.status || 0;

      const conversionRates = {
        pendingToConfirmed:
          pendingCount + confirmedCount > 0
            ? (confirmedCount / (pendingCount + confirmedCount)) * 100
            : 0,
        confirmedToInHouse:
          confirmedCount > 0
            ? (inHouseCount / (confirmedCount + inHouseCount + noShowCount)) *
              100
            : 0,
        inHouseToCheckedOut:
          inHouseCount + checkedOutCount > 0
            ? (checkedOutCount / (inHouseCount + checkedOutCount)) * 100
            : 0,
        noShowRate:
          totalReservations > 0 ? (noShowCount / totalReservations) * 100 : 0,
        cancellationRate:
          totalReservations > 0 ? (cancelledCount / totalReservations) * 100 : 0
      };

      // 4. Average Time in Status (simplified calculation)
      const averageTimeInStatus = await Promise.all(
        Object.values(ReservationStatus).map(async (status) => {
          // Get status history for this status
          const statusHistory = await tx.reservationStatusHistory.findMany({
            where: {
              newStatus: status,
              changedAt: {
                gte: from,
                lte: to
              },
              reservation: {
                propertyId: propertyId
              }
            },
            include: {
              reservation: {
                select: {
                  statusUpdatedAt: true
                }
              }
            },
            take: 100 // Limit for performance
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
        conversionRates,
        averageTimeInStatus: averageTimeInStatus.filter(
          (item) => item.averageHours > 0
        )
      };
    });

    // Cache the response
    analyticsCache.set(cacheKey, { data: analytics, timestamp: now });

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
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Failed to get reservation analytics:", error);
    return NextResponse.json(
      { error: "Failed to get reservation analytics" },
      { status: 500 }
    );
  }
}
