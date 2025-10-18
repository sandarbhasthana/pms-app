// File: src/app/api/reservations/status-summary/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory cache to prevent duplicate expensive queries
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 600000; // 10 minutes cache - increased to prevent frequent cache misses

// Request deduplication - prevent multiple simultaneous requests for the same data
type StatusSummaryResponse = {
  statusCounts: StatusSummary;
  todayActivity: {
    checkInsToday: number;
    checkOutsToday: number;
    arrivalsToday: number;
    departureToday: number;
  };
  recentChanges: RecentStatusChange[];
  summary: {
    totalReservations: number;
    activeReservations: number;
    completedReservations: number;
    cancelledReservations: number;
    occupancyRate: number;
    confirmationRate: number;
    noShowRate: number;
  };
  dateRange: { startDate: string; endDate: string } | null;
  generatedAt: string;
};

const pendingRequests = new Map<string, Promise<StatusSummaryResponse>>();

// Request counter for debugging
let requestCounter = 0;

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
  const currentRequestId = ++requestCounter;

  if (process.env.NODE_ENV === "development") {
    console.log(`🚀 Request #${currentRequestId} started`);
  }

  let cacheKey: string = "";

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

    // Create normalized cache key based on parameters
    const normalizedStartDate = startDate || "default";
    const normalizedEndDate = endDate || "default";
    cacheKey = `${propertyId}-${normalizedStartDate}-${normalizedEndDate}-${includeHistorical}`;
    const now = Date.now();

    // Debug logging for cache key analysis
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔑 Request #${currentRequestId} - Cache key: ${cacheKey}, Cache size: ${cache.size}, Pending: ${pendingRequests.size}`
      );
    }

    // Check cache first
    const cached = cache.get(cacheKey);
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 Request #${currentRequestId} - Cache debug:`, {
        hasCached: !!cached,
        cacheTimestamp: cached?.timestamp,
        now,
        age: cached ? Math.round((now - cached.timestamp) / 1000) : "N/A",
        duration: CACHE_DURATION / 1000,
        isValid: cached ? now - cached.timestamp < CACHE_DURATION : false
      });
    }

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Request #${currentRequestId} - Cache hit for status-summary: ${cacheKey} (age: ${Math.round(
            (now - cached.timestamp) / 1000
          )}s) - RETURNING IMMEDIATELY`
        );
      }
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      response.headers.set(
        "X-Cache-Age",
        Math.round((now - cached.timestamp) / 1000).toString()
      );
      return response;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `❌ Request #${currentRequestId} - Cache miss for: ${cacheKey} - proceeding to database`
      );
    }

    // Check if there's already a pending request for this cache key
    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `⏳ Request #${currentRequestId} - Deduplicating request for: ${cacheKey}`
        );
      }
      const result = await pendingRequest;
      const response = NextResponse.json(result);
      response.headers.set("X-Cache", "DEDUPE");
      return response;
    }

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

    // Create a promise for the expensive database operation
    const dataPromise = (async () => {
      const statusCounts = await withPropertyContext(
        propertyId!,
        async (tx) => {
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
        }
      );

      // Get today's activity
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const todayActivity = await withPropertyContext(
        propertyId!,
        async (tx) => {
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
        }
      );

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

      const responseData = {
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
      };

      // Cache the response
      cache.set(cacheKey, { data: responseData, timestamp: now });

      if (process.env.NODE_ENV === "development") {
        console.log(`💾 Caching data for: ${cacheKey} at timestamp: ${now}`);
      }

      // Clean up old cache entries (simple cleanup)
      if (cache.size > 100) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }

      return responseData;
    })();

    // Store the promise to prevent duplicate requests
    pendingRequests.set(cacheKey, dataPromise);

    try {
      const responseData = await dataPromise;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔄 Request #${currentRequestId} - Fresh data for status-summary: ${cacheKey}`
        );
      }
      const response = NextResponse.json(responseData);
      response.headers.set("X-Cache", "MISS");
      return response;
    } finally {
      // Clean up the pending request
      pendingRequests.delete(cacheKey);
    }
  } catch (error) {
    // Clean up the pending request on error
    if (cacheKey) {
      pendingRequests.delete(cacheKey);
    }
    console.error("GET /api/reservations/status-summary error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
