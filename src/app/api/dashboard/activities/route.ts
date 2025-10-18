// File: src/app/api/dashboard/activities/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  validatePropertyAccess,
  withPropertyContext
} from "@/lib/property-context";

// Simple in-memory cache for dashboard activities
const dashboardActivitiesCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();
const DASHBOARD_ACTIVITIES_CACHE_DURATION = 300000; // 5 minutes cache

/**
 * GET /api/dashboard/activities
 * Get today's activities (sales, cancellations, overbookings) for dashboard
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
    const type = url.searchParams.get("type") || "sales"; // sales, cancellations, overbookings

    // Check cache first
    const cacheKey = `dashboard-activities-${propertyId}-${type}`;
    const now = Date.now();
    const cached = dashboardActivitiesCache.get(cacheKey);

    if (
      cached &&
      now - cached.timestamp < DASHBOARD_ACTIVITIES_CACHE_DURATION
    ) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for dashboard activities: ${cacheKey} (age: ${Math.round(
            (now - cached.timestamp) / 1000
          )}s)`
        );
      }
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    // Get activities data
    const activitiesData = await withPropertyContext(
      propertyId!,
      async (tx) => {
        const today = new Date();
        const startOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const endOfToday = new Date(
          startOfToday.getTime() + 24 * 60 * 60 * 1000
        );

        let activities: Array<{
          id: string;
          type: "sale" | "cancellation" | "overbooking";
          guestName: string;
          roomNumber: string;
          roomType: string;
          amount: number;
          checkIn: Date;
          checkOut: Date;
          status: string;
          createdAt: Date;
          description: string;
        }> = [];
        let stats = {
          count: 0,
          totalAmount: 0,
          averageAmount: 0
        };

        if (type === "sales") {
          // Get today's new bookings/sales
          const salesData = await tx.reservation.findMany({
            where: {
              propertyId: propertyId,
              createdAt: {
                gte: startOfToday,
                lt: endOfToday
              },
              status: {
                in: ["CONFIRMED", "CONFIRMATION_PENDING"]
              }
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
            orderBy: { createdAt: "desc" }
          });

          activities = salesData.map((r) => ({
            id: r.id,
            type: "sale",
            guestName: r.guestName || "Guest",
            roomNumber: r.room?.name || "TBD",
            roomType: r.room?.roomType?.name || "Standard",
            amount: r.paidAmount || 0,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            createdAt: r.createdAt,
            description: `New booking for ${r.room?.roomType?.name || "room"}`
          }));

          const totalAmount = salesData.reduce(
            (sum, r) => sum + (r.paidAmount || 0),
            0
          );
          stats = {
            count: salesData.length,
            totalAmount,
            averageAmount:
              salesData.length > 0 ? totalAmount / salesData.length : 0
          };
        } else if (type === "cancellations") {
          // Get today's cancellations
          const cancellationsData = await tx.reservation.findMany({
            where: {
              propertyId: propertyId,
              updatedAt: {
                gte: startOfToday,
                lt: endOfToday
              },
              status: "CANCELLED"
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
            orderBy: { updatedAt: "desc" }
          });

          activities = cancellationsData.map((r) => ({
            id: r.id,
            type: "cancellation",
            guestName: r.guestName || "Guest",
            roomNumber: r.room?.name || "TBD",
            roomType: r.room?.roomType?.name || "Standard",
            amount: -(r.paidAmount || 0), // Negative for cancellations
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            createdAt: r.updatedAt,
            description: `Cancelled booking for ${
              r.room?.roomType?.name || "room"
            }`
          }));

          const totalAmount = cancellationsData.reduce(
            (sum, r) => sum + (r.paidAmount || 0),
            0
          );
          stats = {
            count: cancellationsData.length,
            totalAmount: -totalAmount, // Negative impact
            averageAmount:
              cancellationsData.length > 0
                ? totalAmount / cancellationsData.length
                : 0
          };
        } else if (type === "overbookings") {
          // Get potential overbookings (more reservations than available rooms for any date)
          // This is a simplified check - in reality, you'd need more complex logic
          const overbookingsData = await tx.reservation.findMany({
            where: {
              propertyId: propertyId,
              createdAt: {
                gte: startOfToday,
                lt: endOfToday
              },
              status: {
                in: ["CONFIRMED", "IN_HOUSE"]
              }
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
            orderBy: { createdAt: "desc" },
            take: 5 // Limit for demo purposes
          });

          // For now, we'll show recent reservations as potential overbooking risks
          activities = overbookingsData.map((r) => ({
            id: r.id,
            type: "overbooking",
            guestName: r.guestName || "Guest",
            roomNumber: r.room?.name || "TBD",
            roomType: r.room?.roomType?.name || "Standard",
            amount: r.paidAmount || 0,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            status: r.status,
            createdAt: r.createdAt,
            description: `Potential overbooking risk for ${
              r.room?.roomType?.name || "room"
            }`
          }));

          stats = {
            count: overbookingsData.length,
            totalAmount: 0, // No direct financial impact
            averageAmount: 0
          };
        }

        return {
          type,
          date: today.toISOString().split("T")[0],
          activities: activities.slice(0, 10), // Limit to 10 most recent
          stats,
          summary: {
            totalActivities: activities.length,
            hasActivities: activities.length > 0
          }
        };
      }
    );

    // Cache the response
    dashboardActivitiesCache.set(cacheKey, {
      data: activitiesData,
      timestamp: now
    });

    // Clean up old cache entries
    if (dashboardActivitiesCache.size > 50) {
      const oldestKey = dashboardActivitiesCache.keys().next().value;
      if (oldestKey) {
        dashboardActivitiesCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Fresh dashboard activities data: ${cacheKey}`);
    }

    const response = NextResponse.json(activitiesData);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("GET /api/dashboard/activities error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
