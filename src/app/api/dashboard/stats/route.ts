// File: src/app/api/dashboard/stats/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validatePropertyAccess } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for dashboard stats
const dashboardStatsCache = new Map<
  string,
  { data: DashboardStats; timestamp: number }
>();

interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalReservations: number;
  pendingReservations: number;
  revenue: {
    today: number;
    thisMonth: number;
    lastMonth: number;
  };
  occupancyRate: number;
}
const DASHBOARD_STATS_CACHE_DURATION = 300000; // 5 minutes cache

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics for a specific property
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

    // Check cache first
    const cacheKey = `dashboard-stats-${propertyId}`;
    const now = Date.now();
    const cached = dashboardStatsCache.get(cacheKey);

    if (cached && now - cached.timestamp < DASHBOARD_STATS_CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for dashboard stats: ${cacheKey} (age: ${Math.round(
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
        `❌ Cache miss for dashboard stats: ${cacheKey} - fetching from database`
      );
      console.log(`🎯 Property ID being used: ${propertyId}`);
    }

    // Get dashboard statistics
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    // Get dashboard statistics - OPTIMIZED: Combine multiple queries into single aggregated queries
    const stats = await (async () => {
      // OPTIMIZATION: Get room count in single query
      const totalRooms = await prisma.room.count({
        where: { propertyId: propertyId }
      });

      // OPTIMIZATION: Get all reservation statistics in a single groupBy query
      const reservationStats = await prisma.reservation.groupBy({
        by: ["status"],
        where: { propertyId: propertyId },
        _count: { id: true }
      });

      // Parse reservation counts from groupBy result
      const statusCounts = {
        CONFIRMED: 0,
        CHECKIN_DUE: 0,
        IN_HOUSE: 0,
        CHECKOUT_DUE: 0,
        CHECKED_OUT: 0,
        CONFIRMATION_PENDING: 0,
        CANCELLED: 0,
        NO_SHOW: 0
      };

      reservationStats.forEach((stat) => {
        statusCounts[stat.status as keyof typeof statusCounts] = stat._count.id;
      });

      const totalReservations =
        statusCounts.CONFIRMED +
        statusCounts.IN_HOUSE +
        statusCounts.CHECKED_OUT;
      const pendingReservations = statusCounts.CONFIRMATION_PENDING;
      const occupiedRooms = statusCounts.IN_HOUSE;
      const availableRooms = totalRooms - occupiedRooms;
      const maintenanceRooms = 0; // Placeholder - implement maintenance tracking

      // Count check-ins and check-outs separately
      const todayCheckIns = await prisma.reservation.count({
        where: {
          propertyId: propertyId,
          checkIn: {
            gte: startOfToday,
            lt: endOfToday
          },
          status: {
            in: ["CONFIRMED", "CHECKIN_DUE", "IN_HOUSE"]
          }
        }
      });

      const todayCheckOuts = await prisma.reservation.count({
        where: {
          propertyId: propertyId,
          checkOut: {
            gte: startOfToday,
            lt: endOfToday
          },
          status: "CHECKED_OUT"
        }
      });

      // OPTIMIZATION: Get revenue data for all periods in parallel (still 3 queries but optimized)
      // These cannot be combined into one query due to different date ranges
      const [todayRevenueData, thisMonthRevenueData, lastMonthRevenueData] =
        await Promise.all([
          prisma.reservation.aggregate({
            where: {
              propertyId: propertyId,
              checkIn: {
                gte: startOfToday,
                lt: endOfToday
              },
              status: {
                in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
              }
            },
            _sum: {
              paidAmount: true,
              amountCaptured: true
            },
            _count: true
          }),
          prisma.reservation.aggregate({
            where: {
              propertyId: propertyId,
              checkIn: {
                gte: startOfMonth
              },
              status: {
                in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
              }
            },
            _sum: {
              paidAmount: true,
              amountCaptured: true
            },
            _count: true
          }),
          prisma.reservation.aggregate({
            where: {
              propertyId: propertyId,
              checkIn: {
                gte: startOfLastMonth,
                lt: startOfMonth
              },
              status: {
                in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
              }
            },
            _sum: {
              paidAmount: true,
              amountCaptured: true
            },
            _count: true
          })
        ]);

      // Use actual revenue amounts, fallback to estimated if no amounts available
      const avgRoomRate = 150; // Fallback rate for reservations without payment amounts

      // Helper function to calculate total revenue from available fields
      const calculateRevenue = (
        sumData: {
          paidAmount: number | null;
          amountCaptured: number | null;
        } | null,
        count: number
      ) => {
        if (!sumData) return count * avgRoomRate;

        const paidAmount = sumData.paidAmount || 0;
        const capturedAmount = (sumData.amountCaptured || 0) / 100; // Convert cents to currency units
        const totalRevenue = paidAmount + capturedAmount;

        return totalRevenue > 0 ? totalRevenue : count * avgRoomRate;
      };

      const todayRevenue = calculateRevenue(
        todayRevenueData._sum,
        todayRevenueData._count
      );
      const thisMonthRevenue = calculateRevenue(
        thisMonthRevenueData._sum,
        thisMonthRevenueData._count
      );
      const lastMonthRevenue = calculateRevenue(
        lastMonthRevenueData._sum,
        lastMonthRevenueData._count
      );

      // Calculate occupancy rate
      const occupancyRate =
        totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      return {
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        todayCheckIns,
        todayCheckOuts,
        totalReservations,
        pendingReservations,
        revenue: {
          today: todayRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue
        },
        occupancyRate
      };
    })();

    // Cache the response
    dashboardStatsCache.set(cacheKey, { data: stats, timestamp: now });

    // Clean up old cache entries
    if (dashboardStatsCache.size > 50) {
      const oldestKey = dashboardStatsCache.keys().next().value;
      if (oldestKey) {
        dashboardStatsCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Fresh dashboard stats data: ${cacheKey}`);
    }

    const response = NextResponse.json(stats);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
