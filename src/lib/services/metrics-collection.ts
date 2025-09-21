// Metrics collection service for SUPER_ADMIN dashboard analytics

import { prisma } from "@/lib/prisma";
import { SystemMetrics } from "@/lib/types/analytics";
import { Decimal } from "@prisma/client/runtime/library";

export class MetricsCollectionService {
  /**
   * Update system-wide metrics (run hourly)
   */
  static async updateSystemMetrics(): Promise<SystemMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate current system metrics
      const metrics = await this.calculateSystemMetrics();

      // Upsert today's metrics
      const systemMetrics = await prisma.systemMetrics.upsert({
        where: { date: today },
        create: {
          date: today,
          ...metrics
        },
        update: {
          ...metrics,
          updatedAt: new Date()
        }
      });

      console.log("✅ System metrics updated:", systemMetrics);
      return {
        ...systemMetrics,
        revenue: systemMetrics.revenue.toNumber()
      };
    } catch (error) {
      console.error("❌ Error updating system metrics:", error);
      throw error;
    }
  }

  /**
   * Update organization-specific metrics (run daily)
   */
  static async updateOrganizationMetrics(): Promise<void> {
    try {
      const organizations = await prisma.organization.findMany({
        select: { id: true, name: true }
      });

      console.log(
        `📊 Updating metrics for ${organizations.length} organizations`
      );

      for (const org of organizations) {
        const metrics = await this.calculateOrganizationMetrics(org.id);

        await prisma.organizationMetrics.upsert({
          where: { organizationId: org.id },
          create: {
            organizationId: org.id,
            ...metrics
          },
          update: {
            ...metrics,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Updated metrics for organization: ${org.name}`);
      }
    } catch (error) {
      console.error("❌ Error updating organization metrics:", error);
      throw error;
    }
  }

  /**
   * Calculate current system-wide metrics
   */
  private static async calculateSystemMetrics(): Promise<{
    totalOrganizations: number;
    totalUsers: number;
    totalProperties: number;
    totalReservations: number;
    activeUsers: number;
    revenue: Decimal;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalOrganizations,
      totalUsers,
      totalProperties,
      totalReservations,
      activeUsers
    ] = await Promise.all([
      // Total organizations
      prisma.organization.count(),

      // Total users
      prisma.user.count(),

      // Total properties
      prisma.property.count(),

      // Total reservations
      prisma.reservation.count(),

      // Active users (last 30 days) - users with recent activity
      prisma.user.count({
        where: {
          OR: [
            { updatedAt: { gte: thirtyDaysAgo } },
            { reservations: { some: { createdAt: { gte: thirtyDaysAgo } } } }
          ]
        }
      })
    ]);

    // Calculate total revenue (future implementation with Stripe)
    const revenue = new Decimal(0); // TODO: Implement when subscription system is ready

    return {
      totalOrganizations,
      totalUsers,
      totalProperties,
      totalReservations,
      activeUsers,
      revenue
    };
  }

  /**
   * Calculate metrics for a specific organization
   */
  private static async calculateOrganizationMetrics(organizationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalProperties,
      totalReservations,
      monthlyActiveUsers,
      lastActivity,
      onboardingTracking
    ] = await Promise.all([
      // Total users in organization
      prisma.userOrg.count({
        where: { organizationId }
      }),

      // Total properties
      prisma.property.count({
        where: { organizationId }
      }),

      // Total reservations
      prisma.reservation.count({
        where: { organizationId }
      }),

      // Monthly active users
      prisma.userOrg.count({
        where: {
          organizationId,
          user: {
            OR: [
              { updatedAt: { gte: thirtyDaysAgo } },
              { reservations: { some: { createdAt: { gte: thirtyDaysAgo } } } }
            ]
          }
        }
      }),

      // Last activity timestamp
      prisma.systemActivity.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      }),

      // Onboarding status
      prisma.onboardingTracking.findUnique({
        where: { organizationId },
        select: {
          completedAt: true,
          firstPropertyCreatedAt: true,
          firstReservationAt: true,
          stripeConnectedAt: true
        }
      })
    ]);

    // Calculate total revenue for organization (future implementation)
    const totalRevenue = 0; // TODO: Implement when billing system is ready

    return {
      totalUsers,
      totalProperties,
      totalReservations,
      totalRevenue,
      lastActivity: lastActivity?.createdAt || null,
      monthlyActiveUsers,
      onboardingCompleted: !!onboardingTracking?.completedAt,
      firstPropertyCreated: !!onboardingTracking?.firstPropertyCreatedAt,
      firstReservationMade: !!onboardingTracking?.firstReservationAt,
      stripeConnected: !!onboardingTracking?.stripeConnectedAt
    };
  }

  /**
   * Get current system overview for dashboard
   */
  static async getSystemOverview() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's metrics or calculate if not available
      const systemMetricsRaw = await prisma.systemMetrics.findUnique({
        where: { date: today }
      });

      let systemMetrics: SystemMetrics;
      if (!systemMetricsRaw) {
        systemMetrics = await this.updateSystemMetrics();
      } else {
        systemMetrics = {
          ...systemMetricsRaw,
          revenue: systemMetricsRaw.revenue.toNumber()
        };
      }

      // Get system health (latest entry)
      const systemHealth = await prisma.systemHealth.findFirst({
        orderBy: { timestamp: "desc" }
      });

      // Calculate monthly growth
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setHours(0, 0, 0, 0);

      const lastMonthMetricsRaw = await prisma.systemMetrics.findUnique({
        where: { date: lastMonth }
      });

      const lastMonthMetrics = lastMonthMetricsRaw
        ? {
            ...lastMonthMetricsRaw,
            revenue: lastMonthMetricsRaw.revenue.toNumber()
          }
        : null;

      const monthlyGrowth = {
        organizations: this.calculateGrowth(
          systemMetrics.totalOrganizations,
          lastMonthMetrics?.totalOrganizations || 0
        ),
        users: this.calculateGrowth(
          systemMetrics.totalUsers,
          lastMonthMetrics?.totalUsers || 0
        ),
        properties: this.calculateGrowth(
          systemMetrics.totalProperties,
          lastMonthMetrics?.totalProperties || 0
        ),
        reservations: this.calculateGrowth(
          systemMetrics.totalReservations,
          lastMonthMetrics?.totalReservations || 0
        )
      };

      return {
        systemMetrics,
        organizationCount: systemMetrics.totalOrganizations,
        userCount: systemMetrics.totalUsers,
        propertyCount: systemMetrics.totalProperties,
        reservationCount: systemMetrics.totalReservations,
        activeUserCount: systemMetrics.activeUsers,
        monthlyGrowth,
        systemHealth
      };
    } catch (error) {
      console.error("❌ Error getting system overview:", error);
      throw error;
    }
  }

  /**
   * Calculate growth percentage between current and previous values
   */
  private static calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Get organization metrics with pagination and filtering
   */
  static async getOrganizationMetrics(
    page: number = 1,
    pageSize: number = 20,
    filters: {
      status?: "active" | "inactive" | "suspended";
      hasStripe?: boolean;
      onboardingCompleted?: boolean;
      search?: string;
    } = {}
  ) {
    try {
      const skip = (page - 1) * pageSize;

      // Build where clause based on filters
      const where: Record<string, unknown> = {};

      if (filters.search) {
        where.organization = {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { domain: { contains: filters.search, mode: "insensitive" } }
          ]
        };
      }

      if (filters.hasStripe !== undefined) {
        where.stripeConnected = filters.hasStripe;
      }

      if (filters.onboardingCompleted !== undefined) {
        where.onboardingCompleted = filters.onboardingCompleted;
      }

      const [organizations, total] = await Promise.all([
        prisma.organizationMetrics.findMany({
          where,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                domain: true,
                createdAt: true,
                updatedAt: true,
                stripeChargesEnabled: true
              }
            }
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: pageSize
        }),
        prisma.organizationMetrics.count({ where })
      ]);

      return {
        items: organizations.map((org) => ({
          id: org.organization.id,
          name: org.organization.name,
          domain: org.organization.domain,
          createdAt: org.organization.createdAt,
          updatedAt: org.organization.updatedAt,
          stripeConnected: org.stripeConnected,
          metrics: org,
          userCount: org.totalUsers,
          propertyCount: org.totalProperties,
          lastActivity: org.lastActivity,
          status: this.determineOrganizationStatus(org)
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      console.error("❌ Error getting organization metrics:", error);
      throw error;
    }
  }

  /**
   * Determine organization status based on metrics
   */
  private static determineOrganizationStatus(metrics: {
    lastActivity?: Date | null;
  }): "active" | "inactive" | "suspended" {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (!metrics.lastActivity || metrics.lastActivity < thirtyDaysAgo) {
      return "inactive";
    }

    return "active";
  }
}
