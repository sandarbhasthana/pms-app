// File: src/app/api/dashboard/unified/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validatePropertyAccess } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import {
  getOperationalDayStart,
  getOperationalDayEnd
} from "@/lib/timezone/day-boundaries";

// Simple in-memory cache for unified dashboard data
const unifiedDashboardCache = new Map<
  string,
  { data: UnifiedDashboardData; timestamp: number }
>();
// Shorter cache in development for real-time updates
// Production uses 1 minute for balance between performance and freshness
// For real-time updates in production, use the refresh=true parameter
const UNIFIED_DASHBOARD_CACHE_DURATION =
  process.env.NODE_ENV === "development"
    ? 30000 // 30 seconds in development
    : 60000; // 1 minute in production (reduced from 5 minutes)

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

interface PropertyInfo {
  id: string;
  name: string;
  suite?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  currency?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  organization?: {
    id: string;
    name: string;
    domain: string | null;
  };
  _count?: {
    roomTypes: number;
    rooms: number;
    reservations: number;
    userProperties: number;
  };
}

interface ReservationData {
  id: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  email: string;
  phone: string;
}

interface DashboardReservations {
  date: string;
  checkIns: ReservationData[];
  checkOuts: ReservationData[];
  stayingGuests: ReservationData[];
  summary: {
    totalCheckIns: number;
    totalCheckOuts: number;
    totalStaying: number;
    totalReservations: number;
  };
}

interface ActivityData {
  id: string;
  type: "sale" | "cancellation" | "overbooking";
  guestName: string;
  roomNumber: string;
  roomType: string;
  amount: number;
  checkIn: string;
  checkOut: string;
  status: string;
  createdAt: string;
  description: string;
}

interface DashboardActivities {
  type: string;
  date: string;
  activities: ActivityData[];
  stats: {
    count: number;
    totalAmount: number;
    averageAmount: number;
  };
  summary: {
    totalActivities: number;
    hasActivities: boolean;
  };
}

interface UnifiedDashboardData {
  property: PropertyInfo;
  stats: DashboardStats;
  reservations: {
    today: DashboardReservations;
    tomorrow: DashboardReservations;
  };
  activities: {
    sales: DashboardActivities;
    cancellations: DashboardActivities;
    overbookings: DashboardActivities;
  };
}

/**
 * GET /api/dashboard/unified
 * Get all dashboard data in a single request
 * Combines: property info, stats, today/tomorrow reservations, and all activity types
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

    // Ensure propertyId is defined
    if (!propertyId) {
      return new NextResponse("Property ID is required", { status: 400 });
    }

    // Check if refresh is requested (bypass cache)
    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get("refresh") === "true";

    // Check cache first (unless refresh is requested)
    const cacheKey = `unified-dashboard-${propertyId}`;
    const now = Date.now();
    const cached = unifiedDashboardCache.get(cacheKey);

    if (
      !refresh &&
      cached &&
      now - cached.timestamp < UNIFIED_DASHBOARD_CACHE_DURATION
    ) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for unified dashboard: ${cacheKey} (age: ${Math.round(
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
        `❌ Cache miss for unified dashboard: ${cacheKey} - fetching from database`
      );
    }

    // Fetch all data in parallel for maximum performance
    const [
      propertyData,
      statsData,
      todayReservationsData,
      tomorrowReservationsData,
      salesData,
      cancellationsData,
      overbookingsData
    ] = await Promise.all([
      fetchPropertyInfo(propertyId),
      fetchDashboardStats(propertyId),
      fetchDashboardReservations(propertyId, "today"),
      fetchDashboardReservations(propertyId, "tomorrow"),
      fetchDashboardActivities(propertyId, "sales"),
      fetchDashboardActivities(propertyId, "cancellations"),
      fetchDashboardActivities(propertyId, "overbookings")
    ]);

    const unifiedData: UnifiedDashboardData = {
      property: propertyData,
      stats: statsData,
      reservations: {
        today: todayReservationsData,
        tomorrow: tomorrowReservationsData
      },
      activities: {
        sales: salesData,
        cancellations: cancellationsData,
        overbookings: overbookingsData
      }
    };

    // Cache the response
    unifiedDashboardCache.set(cacheKey, { data: unifiedData, timestamp: now });

    // Clean up old cache entries
    if (unifiedDashboardCache.size > 50) {
      const oldestKey = unifiedDashboardCache.keys().next().value;
      if (oldestKey) {
        unifiedDashboardCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Fresh unified dashboard data: ${cacheKey}`);
    }

    const response = NextResponse.json(unifiedData);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("GET /api/dashboard/unified error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to fetch property info
async function fetchPropertyInfo(propertyId: string): Promise<PropertyInfo> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      suite: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      currency: true,
      isActive: true,
      isDefault: true,
      organization: {
        select: { id: true, name: true, domain: true }
      },
      _count: {
        select: {
          roomTypes: true,
          rooms: true,
          reservations: true,
          userProperties: true
        }
      }
    }
  });

  if (!property) {
    throw new Error("Property not found");
  }

  return property;
}

// Helper function to fetch dashboard stats
async function fetchDashboardStats(
  propertyId: string
): Promise<DashboardStats> {
  // Date calculations
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  );

  // Helper function to calculate revenue
  const calculateRevenue = (
    sum: { paidAmount: number | null; amountCaptured: number | null },
    count: number
  ): number => {
    if (count === 0) return 0;
    const paidAmount = sum.paidAmount || 0;
    const amountCaptured = sum.amountCaptured || 0;
    return paidAmount + amountCaptured;
  };

  // Get room count
  const totalRooms = await prisma.room.count({
    where: { propertyId: propertyId }
  });

  // Get all reservation statistics in a single groupBy query
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
    statusCounts.CONFIRMED + statusCounts.IN_HOUSE + statusCounts.CHECKED_OUT;
  const pendingReservations = statusCounts.CONFIRMATION_PENDING;
  const occupiedRooms = statusCounts.IN_HOUSE;
  const availableRooms = totalRooms - occupiedRooms;
  const maintenanceRooms = 0; // Placeholder

  // Count check-ins and check-outs
  const [todayCheckIns, todayCheckOuts] = await Promise.all([
    prisma.reservation.count({
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
    }),
    prisma.reservation.count({
      where: {
        propertyId: propertyId,
        checkOut: {
          gte: startOfToday,
          lt: endOfToday
        },
        status: {
          in: ["IN_HOUSE", "CHECKOUT_DUE", "CHECKED_OUT"]
        }
      }
    })
  ]);

  // Get revenue data for all periods in parallel
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
            lte: endOfLastMonth
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
}

// Helper function to fetch dashboard reservations
async function fetchDashboardReservations(
  propertyId: string,
  day: "today" | "tomorrow"
): Promise<DashboardReservations> {
  // Get property timezone first
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { timezone: true }
  });

  const timezone = property?.timezone || "UTC";

  const now = new Date();
  const targetDate =
    day === "today" ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get operational day boundaries using property timezone
  const startOfDay = getOperationalDayStart(targetDate, timezone);
  const endOfDay = getOperationalDayEnd(targetDate, timezone);

  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Fetching ${day} reservations for property ${propertyId}`);
    console.log(`   Timezone: ${timezone}`);
    console.log(`   Start of day: ${startOfDay.toISOString()}`);
    console.log(`   End of day: ${endOfDay.toISOString()}`);
  }

  // Get reservations for the target day
  const reservations = await prisma.reservation.findMany({
    where: {
      propertyId: propertyId,
      deletedAt: null,
      OR: [
        // Check-ins
        {
          checkIn: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        // Check-outs
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
    select: {
      id: true,
      guestName: true,
      email: true,
      phone: true,
      checkIn: true,
      checkOut: true,
      status: true,
      paidAmount: true,
      amountCaptured: true,
      room: {
        select: {
          name: true,
          roomType: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: [{ checkIn: "asc" }, { room: { name: "asc" } }]
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`   Found ${reservations.length} reservations for ${day}`);
    reservations.forEach((r) => {
      console.log(
        `   - ${
          r.guestName || "TBD"
        }: ${r.checkIn.toISOString()} to ${r.checkOut.toISOString()} (${
          r.status
        })`
      );
    });
  }

  // Categorize reservations
  const checkIns: ReservationData[] = [];
  const checkOuts: ReservationData[] = [];
  const stayingGuests: ReservationData[] = [];

  reservations.forEach((reservation) => {
    const resData: ReservationData = {
      id: reservation.id,
      guestName: reservation.guestName || "TBD",
      roomNumber: reservation.room.name,
      roomType: reservation.room.roomType?.name || "Standard",
      checkIn: reservation.checkIn.toISOString(),
      checkOut: reservation.checkOut.toISOString(),
      status: reservation.status,
      totalAmount:
        (reservation.paidAmount || 0) + (reservation.amountCaptured || 0) / 100,
      email: reservation.email || "",
      phone: reservation.phone || ""
    };

    const checkInDate = new Date(reservation.checkIn);
    const checkOutDate = new Date(reservation.checkOut);

    if (checkInDate >= startOfDay && checkInDate < endOfDay) {
      checkIns.push(resData);
    }
    if (checkOutDate >= startOfDay && checkOutDate < endOfDay) {
      checkOuts.push(resData);
    }
    if (
      day === "today" &&
      checkInDate <= startOfDay &&
      checkOutDate > endOfDay &&
      reservation.status === ReservationStatus.IN_HOUSE
    ) {
      stayingGuests.push(resData);
    }
  });

  if (process.env.NODE_ENV === "development") {
    console.log(
      `   ✅ Categorized: ${checkIns.length} check-ins, ${checkOuts.length} check-outs, ${stayingGuests.length} staying`
    );
  }

  return {
    date: targetDate.toISOString(),
    checkIns,
    checkOuts,
    stayingGuests,
    summary: {
      totalCheckIns: checkIns.length,
      totalCheckOuts: checkOuts.length,
      totalStaying: stayingGuests.length,
      totalReservations:
        checkIns.length + checkOuts.length + stayingGuests.length
    }
  };
}

// Helper function to fetch dashboard activities
async function fetchDashboardActivities(
  propertyId: string,
  type: "sales" | "cancellations" | "overbookings"
): Promise<DashboardActivities> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  let activities: ActivityData[] = [];
  let stats = {
    count: 0,
    totalAmount: 0,
    averageAmount: 0
  };

  if (type === "sales") {
    // Get today's new bookings (sales)
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId: propertyId,
        createdAt: {
          gte: startOfToday,
          lt: endOfToday
        },
        status: {
          in: ["CONFIRMED", "IN_HOUSE", "CHECKED_OUT"]
        }
      },
      select: {
        id: true,
        guestName: true,
        paidAmount: true,
        amountCaptured: true,
        checkIn: true,
        checkOut: true,
        status: true,
        createdAt: true,
        room: {
          select: {
            name: true,
            roomType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    activities = reservations.map((r) => ({
      id: r.id,
      type: "sale" as const,
      guestName: r.guestName || "TBD",
      roomNumber: r.room.name,
      roomType: r.room.roomType?.name || "Standard",
      amount: (r.paidAmount || 0) + (r.amountCaptured || 0) / 100,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      description: `New booking for ${r.room.roomType?.name || "Standard"}`
    }));

    stats = {
      count: activities.length,
      totalAmount: activities.reduce((sum, a) => sum + a.amount, 0),
      averageAmount:
        activities.length > 0
          ? activities.reduce((sum, a) => sum + a.amount, 0) / activities.length
          : 0
    };
  } else if (type === "cancellations") {
    // Get today's cancellations
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId: propertyId,
        status: "CANCELLED",
        updatedAt: {
          gte: startOfToday,
          lt: endOfToday
        }
      },
      select: {
        id: true,
        guestName: true,
        paidAmount: true,
        amountCaptured: true,
        checkIn: true,
        checkOut: true,
        status: true,
        updatedAt: true,
        room: {
          select: {
            name: true,
            roomType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    activities = reservations.map((r) => ({
      id: r.id,
      type: "cancellation" as const,
      guestName: r.guestName || "TBD",
      roomNumber: r.room.name,
      roomType: r.room.roomType?.name || "Standard",
      amount: (r.paidAmount || 0) + (r.amountCaptured || 0) / 100,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      status: r.status,
      createdAt: r.updatedAt.toISOString(),
      description: `Cancelled ${r.room.roomType?.name || "Standard"} booking`
    }));

    stats = {
      count: activities.length,
      totalAmount: -activities.reduce((sum, a) => sum + a.amount, 0), // Negative for lost revenue
      averageAmount:
        activities.length > 0
          ? -activities.reduce((sum, a) => sum + a.amount, 0) /
            activities.length
          : 0
    };
  } else if (type === "overbookings") {
    // Get potential overbookings (rooms with multiple overlapping reservations)
    // This is a simplified check - you may want to implement more sophisticated logic
    const today = new Date();
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId: propertyId,
        status: {
          in: ["CONFIRMED", "IN_HOUSE"]
        },
        checkIn: {
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        },
        checkOut: {
          gte: today
        }
      },
      select: {
        id: true,
        guestName: true,
        paidAmount: true,
        amountCaptured: true,
        checkIn: true,
        checkOut: true,
        status: true,
        createdAt: true,
        roomId: true,
        room: {
          select: {
            name: true,
            roomType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { checkIn: "asc" }
    });

    // Group by room and check for overlaps
    const roomReservations = new Map<string, typeof reservations>();
    reservations.forEach((r) => {
      if (!roomReservations.has(r.roomId)) {
        roomReservations.set(r.roomId, []);
      }
      roomReservations.get(r.roomId)!.push(r);
    });

    // Find overlapping reservations
    const overbookings: typeof reservations = [];
    roomReservations.forEach((roomRes) => {
      if (roomRes.length > 1) {
        for (let i = 0; i < roomRes.length; i++) {
          for (let j = i + 1; j < roomRes.length; j++) {
            const r1 = roomRes[i];
            const r2 = roomRes[j];
            if (r1.checkIn < r2.checkOut && r2.checkIn < r1.checkOut) {
              // Overlapping reservations found
              if (!overbookings.find((o) => o.id === r2.id)) {
                overbookings.push(r2);
              }
            }
          }
        }
      }
    });

    activities = overbookings.map((r) => ({
      id: r.id,
      type: "overbooking" as const,
      guestName: r.guestName || "TBD",
      roomNumber: r.room.name,
      roomType: r.room.roomType?.name || "Standard",
      amount: (r.paidAmount || 0) + (r.amountCaptured || 0) / 100,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      description: `Potential overbooking in ${r.room.name}`
    }));

    stats = {
      count: activities.length,
      totalAmount: activities.reduce((sum, a) => sum + a.amount, 0),
      averageAmount:
        activities.length > 0
          ? activities.reduce((sum, a) => sum + a.amount, 0) / activities.length
          : 0
    };
  }

  return {
    type,
    date: now.toISOString(),
    activities,
    stats,
    summary: {
      totalActivities: activities.length,
      hasActivities: activities.length > 0
    }
  };
}
