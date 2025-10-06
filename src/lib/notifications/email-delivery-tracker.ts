// File: src/lib/notifications/email-delivery-tracker.ts

import { prisma } from "@/lib/prisma";
import {
  NotificationStatus,
  NotificationChannel,
  NotificationEventType,
  EmployeeRole,
  NotificationPriority
} from "@/types/notifications";

export interface EmailDeliveryStatus {
  messageId: string;
  status: NotificationStatus;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  errorMessage?: string;
}

export interface EmailDeliveryStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface EmailClickEvent {
  url: string;
  clickedAt: string;
}

export interface EmailBounceEvent {
  type: "hard" | "soft";
  reason: string;
  bouncedAt: string;
}

export interface EmailDeliveryMetadata {
  messageId?: string;
  clicks?: EmailClickEvent[];
  bounce?: EmailBounceEvent;
  retried?: boolean;
  retriedAt?: string;
  newMessageId?: string;
  [key: string]: unknown; // Allow additional properties while maintaining type safety
}

interface NotificationLogWhereClause {
  organizationId: string;
  channel: NotificationChannel;
  createdAt: {
    gte?: Date;
    lte?: Date;
  };
  propertyId?: string;
  status?: NotificationStatus;
}

interface FailedNotification {
  id: string;
  eventType: string;
  recipientId: string;
  recipientRole: string;
  channel: string;
  subject: string;
  message: string;
  data: unknown;
  propertyId: string;
  organizationId: string;
  createdAt: Date;
  status: string;
  errorMessage: string | null;
}

/**
 * EmailDeliveryTracker handles tracking email delivery status
 * and provides analytics on email performance
 */
export class EmailDeliveryTracker {
  /**
   * Track email delivery status
   */
  async trackDelivery(
    notificationId: string,
    messageId: string,
    status: NotificationStatus,
    metadata?: EmailDeliveryMetadata
  ): Promise<void> {
    try {
      // Update notification log with delivery status
      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          status,
          deliveredAt:
            status === NotificationStatus.DELIVERED ? new Date() : undefined,
          data: metadata ? JSON.stringify(metadata) : undefined
        }
      });

      console.log(`📧 Email delivery tracked: ${messageId} -> ${status}`);
    } catch (error) {
      console.error("Error tracking email delivery:", error);
    }
  }

  /**
   * Track email open event
   */
  async trackOpen(messageId: string): Promise<void> {
    try {
      const notification = await prisma.notificationLog.findFirst({
        where: {
          data: {
            path: ["messageId"],
            equals: messageId
          }
        }
      });

      if (notification) {
        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.READ,
            readAt: new Date()
          }
        });

        console.log(`📧 Email opened: ${messageId}`);
      }
    } catch (error) {
      console.error("Error tracking email open:", error);
    }
  }

  /**
   * Track email click event
   */
  async trackClick(messageId: string, linkUrl: string): Promise<void> {
    try {
      const notification = await prisma.notificationLog.findFirst({
        where: {
          data: {
            path: ["messageId"],
            equals: messageId
          }
        }
      });

      if (notification) {
        const metadata = (notification.data as EmailDeliveryMetadata) || {};
        const clicks = metadata.clicks || [];
        clicks.push({
          url: linkUrl,
          clickedAt: new Date().toISOString()
        });

        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            data: JSON.stringify({
              ...metadata,
              clicks
            })
          }
        });

        console.log(`📧 Email link clicked: ${messageId} -> ${linkUrl}`);
      }
    } catch (error) {
      console.error("Error tracking email click:", error);
    }
  }

  /**
   * Track email bounce event
   */
  async trackBounce(
    messageId: string,
    bounceType: "hard" | "soft",
    reason: string
  ): Promise<void> {
    try {
      const notification = await prisma.notificationLog.findFirst({
        where: {
          data: {
            path: ["messageId"],
            equals: messageId
          }
        }
      });

      if (notification) {
        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.FAILED,
            data: JSON.stringify({
              ...((notification.data as EmailDeliveryMetadata) || {}),
              bounce: {
                type: bounceType,
                reason,
                bouncedAt: new Date().toISOString()
              }
            })
          }
        });

        console.log(
          `📧 Email bounced: ${messageId} -> ${bounceType}: ${reason}`
        );
      }
    } catch (error) {
      console.error("Error tracking email bounce:", error);
    }
  }

  /**
   * Get email delivery statistics for a date range
   */
  async getDeliveryStats(
    organizationId: string,
    propertyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EmailDeliveryStats> {
    try {
      const whereClause: NotificationLogWhereClause = {
        organizationId,
        channel: NotificationChannel.EMAIL,
        createdAt: {}
      };

      if (propertyId) {
        whereClause.propertyId = propertyId;
      }

      if (startDate) {
        whereClause.createdAt.gte = startDate;
      }

      if (endDate) {
        whereClause.createdAt.lte = endDate;
      }

      const notifications = await prisma.notificationLog.findMany({
        where: whereClause,
        select: {
          status: true,
          readAt: true,
          data: true
        }
      });

      const stats: EmailDeliveryStats = {
        totalSent: notifications.length,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0
      };

      notifications.forEach((notification) => {
        switch (notification.status) {
          case NotificationStatus.DELIVERED:
          case NotificationStatus.READ:
            stats.delivered++;
            break;
          case NotificationStatus.FAILED:
            stats.failed++;
            break;
        }

        if (notification.readAt) {
          stats.opened++;
        }

        const metadata = notification.data as EmailDeliveryMetadata;
        if (metadata?.clicks && metadata.clicks.length > 0) {
          stats.clicked++;
        }

        if (metadata?.bounce) {
          stats.bounced++;
        }
      });

      // Calculate rates
      if (stats.totalSent > 0) {
        stats.deliveryRate = (stats.delivered / stats.totalSent) * 100;
        stats.openRate = (stats.opened / stats.totalSent) * 100;
        stats.clickRate = (stats.clicked / stats.totalSent) * 100;
      }

      return stats;
    } catch (error) {
      console.error("Error getting email delivery stats:", error);
      return {
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0
      };
    }
  }

  /**
   * Get failed email notifications for retry
   */
  async getFailedEmails(
    organizationId: string,
    propertyId?: string,
    limit: number = 50
  ): Promise<FailedNotification[]> {
    try {
      const whereClause: NotificationLogWhereClause = {
        organizationId,
        channel: NotificationChannel.EMAIL,
        createdAt: {},
        status: NotificationStatus.FAILED
      };

      if (propertyId) {
        whereClause.propertyId = propertyId;
      }

      return await prisma.notificationLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit
      });
    } catch (error) {
      console.error("Error getting failed emails:", error);
      return [];
    }
  }

  /**
   * Retry failed email notification
   */
  async retryFailedEmail(notificationId: string): Promise<boolean> {
    try {
      const notification = await prisma.notificationLog.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        console.error(`Notification ${notificationId} not found`);
        return false;
      }

      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: notification.recipientId },
        select: { email: true, name: true }
      });

      if (!user?.email) {
        console.error(
          `User ${notification.recipientId} not found or has no email`
        );
        return false;
      }

      // Import SendGrid email service and retry
      const { sendGridEmailService } = await import("./sendgrid-email-service");

      const result = await sendGridEmailService.sendNotification(
        {
          eventType: notification.eventType as NotificationEventType,
          recipientId: notification.recipientId,
          recipientRole: notification.recipientRole as EmployeeRole,
          propertyId: notification.propertyId,
          organizationId: notification.organizationId,
          data: notification.data as Record<
            string, string | number | boolean | null
          >,
          subject: notification.subject,
          message: notification.message,
          priority: notification.priority as NotificationPriority,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING
        },
        user.email,
        user.name || undefined
      );

      if (result.success) {
        // Update status to sent
        await prisma.notificationLog.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            data: JSON.stringify({
              ...((notification.data as EmailDeliveryMetadata) || {}),
              retried: true,
              retriedAt: new Date().toISOString(),
              newMessageId: result.messageId
            })
          }
        });

        console.log(`📧 Email retry successful: ${notificationId}`);
        return true;
      } else {
        console.error(`Email retry failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error("Error retrying failed email:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailDeliveryTracker = new EmailDeliveryTracker();
