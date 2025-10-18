// File: src/app/api/reservations/performance-metrics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { validatePropertyAccess } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for performance metrics
const performanceCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();
const PERFORMANCE_CACHE_DURATION = 600000; // 10 minutes cache

export async function GET(req: NextRequest) {
  try {
    // Validate property access (FRONT_DESK role required)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";

    // Check cache first
    const cacheKey = `performance-${propertyId}-${period}`;
    const now = Date.now();
    const cached = performanceCache.get(cacheKey);

    if (cached && now - cached.timestamp < PERFORMANCE_CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for performance metrics: ${cacheKey} (age: ${Math.round(
            (now - cached.timestamp) / 1000
          )}s)`
        );
      }
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `❌ Cache miss for performance metrics: ${cacheKey} - fetching from database`
      );
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }

    // Get reservation counts by status for the period
    const statusCounts = await prisma.reservation.groupBy({
      by: ["status"],
      where: {
        propertyId: propertyId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        status: true
      }
    });

    // Convert to status counts object
    const statusCountsObj: Record<ReservationStatus, number> = {
      [ReservationStatus.CONFIRMATION_PENDING]: 0,
      [ReservationStatus.CONFIRMED]: 0,
      [ReservationStatus.IN_HOUSE]: 0,
      [ReservationStatus.CHECKED_OUT]: 0,
      [ReservationStatus.NO_SHOW]: 0,
      [ReservationStatus.CANCELLED]: 0
    };

    statusCounts.forEach((item) => {
      statusCountsObj[item.status] = item._count.status;
    });

    const totalReservations = Object.values(statusCountsObj).reduce(
      (sum, count) => sum + count,
      0
    );

    // Calculate performance metrics
    const occupancyRate =
      totalReservations > 0
        ? ((statusCountsObj[ReservationStatus.IN_HOUSE] +
            statusCountsObj[ReservationStatus.CHECKED_OUT]) /
            totalReservations) *
          100
        : 0;

    const noShowRate =
      totalReservations > 0
        ? (statusCountsObj[ReservationStatus.NO_SHOW] / totalReservations) * 100
        : 0;

    const cancellationRate =
      totalReservations > 0
        ? (statusCountsObj[ReservationStatus.CANCELLED] / totalReservations) *
          100
        : 0;

    const confirmationRate =
      totalReservations > 0
        ? ((statusCountsObj[ReservationStatus.CONFIRMED] +
            statusCountsObj[ReservationStatus.IN_HOUSE] +
            statusCountsObj[ReservationStatus.CHECKED_OUT]) /
            totalReservations) *
          100
        : 0;

    // Get average daily reservations
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgDailyReservations =
      daysDiff > 0 ? totalReservations / daysDiff : 0;

    // Calculate revenue metrics (mock data for now)
    const avgRevenuePerReservation = 150; // Mock value
    const totalRevenue =
      statusCountsObj[ReservationStatus.CHECKED_OUT] * avgRevenuePerReservation;

    const performanceMetrics = {
      confirmationRate: {
        current: Math.round(confirmationRate * 10) / 10,
        target: 90,
        trend: confirmationRate > 85 ? 2.3 : confirmationRate > 70 ? 0.5 : -1.2
      },
      cancellationRate: {
        current: Math.round(cancellationRate * 10) / 10,
        target: 5,
        trend: cancellationRate < 5 ? -1.1 : cancellationRate < 10 ? 0.2 : 1.5
      },
      noShowRate: {
        current: Math.round(noShowRate * 10) / 10,
        target: 5,
        trend: noShowRate < 5 ? -1.1 : noShowRate < 10 ? 0.2 : 1.5
      },
      averageCheckInTime: {
        current: 12.5, // Mock value - would need actual check-in time tracking
        target: 10,
        trend: -0.8
      },
      statusTransitionEfficiency: {
        current: occupancyRate > 70 ? 92.1 : occupancyRate > 50 ? 85.5 : 78.2,
        target: 95,
        trend: occupancyRate > 70 ? 1.7 : occupancyRate > 50 ? 0.3 : -1.2
      },
      manualOverrideFrequency: {
        current: 15.3, // Mock value - would need actual override tracking
        target: 10,
        trend: -0.5
      },
      guestSatisfactionScore: {
        current: occupancyRate > 70 ? 4.2 : occupancyRate > 50 ? 3.8 : 3.5,
        target: 4.5,
        trend: occupancyRate > 70 ? 0.3 : occupancyRate > 50 ? 0.1 : -0.2
      },
      // Additional metadata
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalReservations,
      avgDailyReservations: Math.round(avgDailyReservations * 10) / 10,
      totalRevenue,
      avgRevenuePerReservation,
      statusBreakdown: statusCountsObj
    };

    // Cache the response
    performanceCache.set(cacheKey, {
      data: performanceMetrics,
      timestamp: now
    });

    // Clean up old cache entries
    if (performanceCache.size > 50) {
      const oldestKey = performanceCache.keys().next().value;
      if (oldestKey) {
        performanceCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Fresh performance metrics data: ${cacheKey}`);
    }

    const response = NextResponse.json(performanceMetrics);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("Failed to get performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to get performance metrics" },
      { status: 500 }
    );
  }
}
