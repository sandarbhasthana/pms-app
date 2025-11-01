// File: src/app/api/dashboard/reservations/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";
import {
  getOperationalDayStart,
  getOperationalDayEnd
} from "@/lib/timezone/day-boundaries";

// Simple in-memory cache for dashboard reservations
const dashboardReservationsCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();
const DASHBOARD_RESERVATIONS_CACHE_DURATION = 300000; // 5 minutes cache

/**
 * GET /api/dashboard/reservations
 * Get today's and tomorrow's reservations for dashboard
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
    const url = new URL(req.url);
    const day = url.searchParams.get("day") || "today"; // today, tomorrow

    // Check cache first
    const cacheKey = `dashboard-reservations-${propertyId}-${day}`;
    const now = Date.now();
    const cached = dashboardReservationsCache.get(cacheKey);

    if (
      cached &&
      now - cached.timestamp < DASHBOARD_RESERVATIONS_CACHE_DURATION
    ) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for dashboard reservations: ${cacheKey} (age: ${Math.round(
            (now - cached.timestamp) / 1000
          )}s)`
        );
      }
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    // Get reservations data
    const reservationsData = await withPropertyContext(
      propertyId!,
      async (tx) => {
        // Get property timezone for operational day calculations
        const property = await tx.property.findUnique({
          where: { id: propertyId },
          select: { timezone: true }
        });

        const timezone = property?.timezone || "UTC";

        const today = new Date();
        let targetDate: Date;

        if (day === "tomorrow") {
          targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        } else {
          targetDate = today;
        }

        // Use operational day boundaries (6 AM start) instead of midnight
        const startOfDay = getOperationalDayStart(targetDate, timezone);
        const endOfDay = getOperationalDayEnd(targetDate, timezone);

        // Get reservations for the target day
        const reservations = await tx.reservation.findMany({
          where: {
            propertyId: propertyId,
            // Exclude soft-deleted reservations
            deletedAt: null,
            OR: [
              // Check-ins today/tomorrow
              {
                checkIn: {
                  gte: startOfDay,
                  lt: endOfDay
                }
              },
              // Check-outs today/tomorrow
              {
                checkOut: {
                  gte: startOfDay,
                  lt: endOfDay
                }
              },
              // Currently staying (for today only)
              ...(day === "today"
                ? [
                    {
                      checkIn: { lte: startOfDay },
                      checkOut: { gt: endOfDay },
                      status: ReservationStatus.IN_HOUSE
                    }
                  ]
                : [])
            ]
          },
          include: {
            room: {
              select: {
                name: true,
                roomType: {
                  select: {
                    name: true,
                    basePrice: true
                  }
                }
              }
            }
          },
          orderBy: [{ checkIn: "asc" }, { room: { name: "asc" } }]
        });

        // Categorize reservations
        const checkIns = reservations.filter((r) => {
          const checkInDate = new Date(r.checkIn);
          return checkInDate >= startOfDay && checkInDate < endOfDay;
        });

        const checkOuts = reservations.filter((r) => {
          const checkOutDate = new Date(r.checkOut);
          return checkOutDate >= startOfDay && checkOutDate < endOfDay;
        });

        const stayingGuests =
          day === "today"
            ? reservations.filter((r) => {
                const checkInDate = new Date(r.checkIn);
                const checkOutDate = new Date(r.checkOut);
                return (
                  checkInDate <= startOfDay &&
                  checkOutDate > endOfDay &&
                  r.status === "IN_HOUSE"
                );
              })
            : [];

        return {
          date: targetDate.toISOString().split("T")[0],
          checkIns: checkIns.map((r) => ({
            id: r.id,
            guestName: r.guestName || "TBD",
            roomNumber: r.room?.name || "TBD",
            roomType: r.room?.roomType?.name || "Standard",
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            totalAmount: (r.paidAmount || 0) + (r.amountCaptured || 0) / 100,
            email: r.email,
            phone: r.phone
          })),
          checkOuts: checkOuts.map((r) => ({
            id: r.id,
            guestName: r.guestName || "TBD",
            roomNumber: r.room?.name || "TBD",
            roomType: r.room?.roomType?.name || "Standard",
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            totalAmount: (r.paidAmount || 0) + (r.amountCaptured || 0) / 100,
            email: r.email,
            phone: r.phone
          })),
          stayingGuests: stayingGuests.map((r) => ({
            id: r.id,
            guestName: r.guestName || "TBD",
            roomNumber: r.room?.name || "TBD",
            roomType: r.room?.roomType?.name || "Standard",
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            totalAmount: (r.paidAmount || 0) + (r.amountCaptured || 0) / 100,
            email: r.email,
            phone: r.phone
          })),
          summary: {
            totalCheckIns: checkIns.length,
            totalCheckOuts: checkOuts.length,
            totalStaying: stayingGuests.length,
            totalReservations: reservations.length
          }
        };
      }
    );

    // Cache the response
    dashboardReservationsCache.set(cacheKey, {
      data: reservationsData,
      timestamp: now
    });

    // Clean up old cache entries
    if (dashboardReservationsCache.size > 50) {
      const oldestKey = dashboardReservationsCache.keys().next().value;
      if (oldestKey) {
        dashboardReservationsCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Fresh dashboard reservations data: ${cacheKey}`);
    }

    const response = NextResponse.json(reservationsData);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("GET /api/dashboard/reservations error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
