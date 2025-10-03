// File: src/app/api/dashboard/stats/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";

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

    // Get dashboard statistics
    const stats = await withPropertyContext(propertyId!, async (tx) => {
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

      // Room statistics
      const totalRooms = await tx.room.count({
        where: { propertyId: propertyId }
      });

      // Calculate occupied rooms based on current reservations
      const occupiedRooms = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          status: "IN_HOUSE",
          checkIn: { lte: today },
          checkOut: { gt: today }
        }
      });

      // For now, assume all non-occupied rooms are available
      // In a real system, you'd track maintenance status separately
      const availableRooms = totalRooms - occupiedRooms;
      const maintenanceRooms = 0; // Placeholder - implement maintenance tracking

      // Reservation statistics
      const totalReservations = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          status: {
            in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
          }
        }
      });

      const pendingReservations = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          status: "CONFIRMATION_PENDING"
        }
      });

      // Today's check-ins and check-outs
      const todayCheckIns = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          checkIn: {
            gte: startOfToday,
            lt: endOfToday
          },
          status: {
            in: ["CONFIRMED", "IN_HOUSE"]
          }
        }
      });

      const todayCheckOuts = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          checkOut: {
            gte: startOfToday,
            lt: endOfToday
          },
          status: "CHECKED_OUT"
        }
      });

      // Revenue calculations (using reservation counts as placeholder for now)
      const todayReservationCount = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          checkIn: {
            gte: startOfToday,
            lt: endOfToday
          },
          status: {
            in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
          }
        }
      });

      const thisMonthReservationCount = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          checkIn: {
            gte: startOfMonth
          },
          status: {
            in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
          }
        }
      });

      const lastMonthReservationCount = await tx.reservation.count({
        where: {
          propertyId: propertyId,
          checkIn: {
            gte: startOfLastMonth,
            lt: startOfMonth
          },
          status: {
            in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
          }
        }
      });

      // Calculate placeholder revenue (you can implement actual revenue calculation later)
      const avgRoomRate = 150; // Placeholder average room rate
      const todayRevenue = todayReservationCount * avgRoomRate;
      const thisMonthRevenue = thisMonthReservationCount * avgRoomRate;
      const lastMonthRevenue = lastMonthReservationCount * avgRoomRate;

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
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
