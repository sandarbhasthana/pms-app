// Activity tracking service for system audit trail and analytics

import { prisma } from "@/lib/prisma";
import { SystemActivityType, Prisma } from "@prisma/client";
import { ACTIVITY_TYPE_LABELS } from "@/lib/types/analytics";

interface ActivityData {
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export class ActivityTracker {
  /**
   * Track a system activity event
   */
  static async trackActivity(
    type: SystemActivityType,
    data: ActivityData = {}
  ): Promise<void> {
    try {
      const description = this.generateDescription(type, data);

      await prisma.systemActivity.create({
        data: {
          activityType: type,
          description,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
          performedBy: data.userId || null,
          organizationId: data.organizationId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null
        }
      });

      console.log(`📝 Activity tracked: ${type} - ${description}`);
    } catch (error) {
      console.error("❌ Error tracking activity:", error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Track organization creation
   */
  static async trackOrganizationCreated(data: {
    organizationId: string;
    organizationName: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("ORGANIZATION_CREATED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        organizationName: data.organizationName
      }
    });
  }

  /**
   * Track user creation
   */
  static async trackUserCreated(data: {
    userId: string;
    userEmail: string;
    organizationId?: string;
    createdBy?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("USER_CREATED", {
      userId: data.createdBy,
      organizationId: data.organizationId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        newUserId: data.userId,
        userEmail: data.userEmail
      }
    });
  }

  /**
   * Track property creation
   */
  static async trackPropertyCreated(data: {
    propertyId: string;
    propertyName: string;
    organizationId: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("PROPERTY_CREATED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        propertyId: data.propertyId,
        propertyName: data.propertyName
      }
    });
  }

  /**
   * Track reservation creation
   */
  static async trackReservationCreated(data: {
    reservationId: string;
    guestName: string;
    organizationId: string;
    propertyId: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("RESERVATION_CREATED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        reservationId: data.reservationId,
        guestName: data.guestName,
        propertyId: data.propertyId
      }
    });
  }

  /**
   * Track onboarding events
   */
  static async trackOnboardingStarted(data: {
    organizationId: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("ONBOARDING_STARTED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  static async trackOnboardingCompleted(data: {
    organizationId: string;
    organizationName: string;
    adminEmail: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("ONBOARDING_COMPLETED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        organizationName: data.organizationName,
        adminEmail: data.adminEmail
      }
    });
  }

  static async trackOnboardingAbandoned(data: {
    organizationId?: string;
    step: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("ONBOARDING_ABANDONED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        abandonedStep: data.step
      }
    });
  }

  /**
   * Track login events
   */
  static async trackLoginSuccess(data: {
    userId: string;
    userEmail: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("LOGIN_SUCCESS", {
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        userEmail: data.userEmail
      }
    });
  }

  static async trackLoginFailed(data: {
    email: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("LOGIN_FAILED", {
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        email: data.email,
        reason: data.reason
      }
    });
  }

  /**
   * Track Stripe integration events
   */
  static async trackStripeConnected(data: {
    organizationId: string;
    organizationName: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("STRIPE_CONNECTED", {
      organizationId: data.organizationId,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        organizationName: data.organizationName
      }
    });
  }

  /**
   * Track system errors
   */
  static async trackSystemError(data: {
    errorType: string;
    errorMessage: string;
    endpoint?: string;
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackActivity("SYSTEM_ERROR", {
      userId: data.userId,
      organizationId: data.organizationId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        errorType: data.errorType,
        errorMessage: data.errorMessage,
        endpoint: data.endpoint
      }
    });
  }

  /**
   * Get recent activities for dashboard feed
   */
  static async getRecentActivities(
    limit: number = 20,
    organizationId?: string
  ) {
    try {
      const where: { organizationId?: string } = {};
      if (organizationId) {
        where.organizationId = organizationId;
      }

      const activities = await prisma.systemActivity.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true }
          },
          organization: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit
      });

      return activities.map((activity) => ({
        id: activity.id,
        type: activity.activityType,
        description: activity.description,
        organizationName: activity.organization?.name,
        userName: activity.user?.name || activity.user?.email,
        timestamp: activity.createdAt,
        metadata: activity.metadata
      }));
    } catch (error) {
      console.error("❌ Error getting recent activities:", error);
      throw error;
    }
  }

  /**
   * Get activity statistics for dashboard
   */
  static async getActivityStatistics(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await prisma.systemActivity.groupBy({
        by: ["activityType"],
        where: {
          createdAt: { gte: startDate }
        },
        _count: {
          activityType: true
        },
        orderBy: {
          _count: {
            activityType: "desc"
          }
        }
      });

      return activities.map((activity) => ({
        type: activity.activityType,
        count: activity._count.activityType,
        label: ACTIVITY_TYPE_LABELS[activity.activityType]
      }));
    } catch (error) {
      console.error("❌ Error getting activity statistics:", error);
      throw error;
    }
  }

  /**
   * Generate human-readable description for activity
   */
  private static generateDescription(
    type: SystemActivityType,
    data: ActivityData
  ): string {
    const metadata = data.metadata || {};

    switch (type) {
      case "ORGANIZATION_CREATED":
        return `Organization "${metadata.organizationName}" was created`;

      case "USER_CREATED":
        return `User "${metadata.userEmail}" was created`;

      case "PROPERTY_CREATED":
        return `Property "${metadata.propertyName}" was created`;

      case "RESERVATION_CREATED":
        return `Reservation for "${metadata.guestName}" was created`;

      case "ONBOARDING_STARTED":
        return "Organization onboarding process started";

      case "ONBOARDING_COMPLETED":
        return `Organization "${metadata.organizationName}" completed onboarding`;

      case "ONBOARDING_ABANDONED":
        return `Onboarding abandoned at step: ${metadata.abandonedStep}`;

      case "LOGIN_SUCCESS":
        return `User "${metadata.userEmail}" logged in successfully`;

      case "LOGIN_FAILED":
        return `Failed login attempt for "${metadata.email}": ${metadata.reason}`;

      case "STRIPE_CONNECTED":
        return `Stripe integration connected for "${metadata.organizationName}"`;

      case "SYSTEM_ERROR":
        return `System error: ${metadata.errorType} - ${metadata.errorMessage}`;

      default:
        return ACTIVITY_TYPE_LABELS[type] || `${type} activity occurred`;
    }
  }
}
