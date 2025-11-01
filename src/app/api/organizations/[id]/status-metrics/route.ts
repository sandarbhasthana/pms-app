// File: src/app/api/organizations/[id]/status-metrics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simple in-memory cache for organization metrics
const orgMetricsCache = new Map<string, { data: unknown; timestamp: number }>();
const ORG_METRICS_CACHE_DURATION = 300000; // 5 minutes cache

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await context.params;

    // Get session and validate authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Validate user has ORG_ADMIN access to this organization
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId: organizationId,
        role: "ORG_ADMIN",
        isActive: true
      }
    });

    if (!userOrg) {
      return new NextResponse("Access denied to this organization", {
        status: 403
      });
    }

    // Check cache first
    const cacheKey = `org-metrics-${organizationId}`;
    const now = Date.now();
    const cached = orgMetricsCache.get(cacheKey);

    if (cached && now - cached.timestamp < ORG_METRICS_CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 Cache hit for org metrics: ${cacheKey} (age: ${Math.round(
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
        `❌ Cache miss for org metrics: ${cacheKey} - fetching from database`
      );
    }

    // Get all properties for this organization
    const properties = await prisma.property.findMany({
      where: {
        organizationId: organizationId
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            reservations: true
          }
        }
      }
    });

    if (properties.length === 0) {
      const emptyMetrics = {
        totalProperties: 0,
        totalReservations: 0,
        averageOccupancyRate: 0,
        averageNoShowRate: 0,
        averageConfirmationRate: 0,
        topPerformingProperty: null,
        needsAttentionProperties: [],
        properties: []
      };

      // Cache empty result
      orgMetricsCache.set(cacheKey, { data: emptyMetrics, timestamp: now });
      return NextResponse.json(emptyMetrics);
    }

    // Get detailed metrics for each property
    const propertyMetrics = await Promise.all(
      properties.map(async (property) => {
        // Get status distribution for this property
        const statusCounts = await prisma.reservation.groupBy({
          by: ["status"],
          where: {
            propertyId: property.id
          },
          _count: {
            status: true
          }
        });

        // Convert to status counts object
        const statusCountsObj: Record<ReservationStatus, number> = {
          [ReservationStatus.CONFIRMATION_PENDING]: 0,
          [ReservationStatus.CONFIRMED]: 0,
          [ReservationStatus.CHECKIN_DUE]: 0,
          [ReservationStatus.IN_HOUSE]: 0,
          [ReservationStatus.CHECKOUT_DUE]: 0,
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

        // Calculate basic metrics
        const occupancyRate =
          totalReservations > 0
            ? ((statusCountsObj[ReservationStatus.IN_HOUSE] +
                statusCountsObj[ReservationStatus.CHECKED_OUT]) /
                totalReservations) *
              100
            : 0;

        const noShowRate =
          totalReservations > 0
            ? (statusCountsObj[ReservationStatus.NO_SHOW] / totalReservations) *
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

        return {
          id: property.id,
          name: property.name,
          totalReservations,
          occupancyRate,
          noShowRate,
          confirmationRate,
          statusCounts: statusCountsObj
        };
      })
    );

    // Calculate organization-wide metrics
    const totalReservations = propertyMetrics.reduce(
      (sum, p) => sum + p.totalReservations,
      0
    );
    const averageOccupancyRate =
      propertyMetrics.length > 0
        ? propertyMetrics.reduce((sum, p) => sum + p.occupancyRate, 0) /
          propertyMetrics.length
        : 0;
    const averageNoShowRate =
      propertyMetrics.length > 0
        ? propertyMetrics.reduce((sum, p) => sum + p.noShowRate, 0) /
          propertyMetrics.length
        : 0;
    const averageConfirmationRate =
      propertyMetrics.length > 0
        ? propertyMetrics.reduce((sum, p) => sum + p.confirmationRate, 0) /
          propertyMetrics.length
        : 0;

    // Find top performing property (highest occupancy rate)
    const topPerformingProperty =
      propertyMetrics.length > 0
        ? propertyMetrics.reduce((top, current) =>
            current.occupancyRate > top.occupancyRate ? current : top
          ).name
        : null;

    // Find properties that need attention (high no-show rate or low confirmation rate)
    const needsAttentionProperties = propertyMetrics
      .filter((p) => p.noShowRate > 10 || p.confirmationRate < 70)
      .map((p) => p.name);

    const organizationMetrics = {
      totalProperties: properties.length,
      totalReservations,
      averageOccupancyRate,
      averageNoShowRate,
      averageConfirmationRate,
      topPerformingProperty,
      needsAttentionProperties,
      properties: propertyMetrics
    };

    // Cache the response
    orgMetricsCache.set(cacheKey, {
      data: organizationMetrics,
      timestamp: now
    });

    // Clean up old cache entries
    if (orgMetricsCache.size > 50) {
      const oldestKey = orgMetricsCache.keys().next().value;
      if (oldestKey) {
        orgMetricsCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`🏢 Fresh org metrics data: ${cacheKey}`);
    }

    const response = NextResponse.json(organizationMetrics);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("Failed to get organization metrics:", error);
    return NextResponse.json(
      { error: "Failed to get organization metrics" },
      { status: 500 }
    );
  }
}
