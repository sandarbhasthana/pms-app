// File: src/lib/notifications/sms-delivery-tracker.ts

import { prisma } from "@/lib/prisma";
import {
  NotificationEventType,
  NotificationStatus
} from "@/types/notifications";
import { Prisma } from "@prisma/client";

// SMS Delivery Metadata Interface
interface SMSDeliveryMetadata {
  twilioStatus?: string;
  recipientPhone?: string;
  errorCode?: string;
  errorMessage?: string;
  numSegments?: number;
  price?: string;
  priceUnit?: string;
  timestamp?: string;
  retryCount?: number;
  deliveredAt?: string;
  failedAt?: string;
  twilioMessageId?: string;
  retryAttemptedAt?: string;
  retrySuccess?: boolean;
  retryError?: string;
}

// SMS Analytics Interface
interface SMSAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageSegments: number;
  totalCost: number;
  costPerMessage: number;
  failureReasons: Record<string, number>;
  deliveryTimes: {
    average: number;
    median: number;
    p95: number;
  };
}

/**
 * SMS Delivery Tracker
 * Handles SMS delivery status tracking and analytics
 */
export class SMSDeliveryTracker {
  /**
   * Track SMS delivery status
   */
  async trackDelivery(
    notificationId: string,
    messageId: string,
    status: NotificationStatus,
    metadata: SMSDeliveryMetadata = {}
  ): Promise<void> {
    try {
      // Find the notification log entry
      const notificationLog = await prisma.notificationLog.findFirst({
        where: {
          OR: [
            { id: notificationId },
            {
              data: {
                path: ["messageId"],
                equals: messageId
              }
            }
          ]
        }
      });

      if (!notificationLog) {
        console.warn(
          `SMS delivery tracking: Notification not found for messageId ${messageId}`
        );
        return;
      }

      // Update notification status and data
      const existingData =
        (notificationLog.data as Record<string, unknown>) || {};
      const updatedData = {
        ...existingData,
        ...metadata,
        smsDeliveryTracking: {
          ...((existingData.smsDeliveryTracking as Record<string, unknown>) ||
            {}),
          lastUpdated: new Date().toISOString(),
          twilioMessageId: messageId,
          deliveryStatus: status,
          ...metadata
        }
      };

      await prisma.notificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status,
          data: updatedData
        }
      });

      console.log(`📱 SMS delivery tracked: ${messageId} -> ${status}`);
    } catch (error) {
      console.error("SMS delivery tracking error:", error);
      throw error;
    }
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: NotificationStatus;
    metadata: SMSDeliveryMetadata;
  } | null> {
    try {
      const notificationLog = await prisma.notificationLog.findFirst({
        where: {
          data: {
            path: ["smsDeliveryTracking", "twilioMessageId"],
            equals: messageId
          }
        }
      });

      if (!notificationLog) {
        return null;
      }

      const data = notificationLog.data as Record<string, unknown>;
      const smsMetadata =
        (data?.smsDeliveryTracking as SMSDeliveryMetadata) || {};

      return {
        status: notificationLog.status as NotificationStatus,
        metadata: smsMetadata
      };
    } catch (error) {
      console.error("Get SMS delivery status error:", error);
      return null;
    }
  }

  /**
   * Retry failed SMS delivery
   */
  async retryFailedDelivery(messageId: string): Promise<boolean> {
    try {
      const deliveryStatus = await this.getDeliveryStatus(messageId);

      if (
        !deliveryStatus ||
        deliveryStatus.status !== NotificationStatus.FAILED
      ) {
        console.warn(`Cannot retry SMS ${messageId}: not in failed state`);
        return false;
      }

      const retryCount = (deliveryStatus.metadata.retryCount || 0) + 1;
      const maxRetries = 3;

      if (retryCount > maxRetries) {
        console.warn(
          `SMS ${messageId} exceeded max retry attempts (${maxRetries})`
        );
        return false;
      }

      // Import SMS service dynamically to avoid circular dependencies
      const { twilioSMSService } = await import("./twilio-sms-service");

      // Get original notification data for retry
      const notificationLog = await prisma.notificationLog.findFirst({
        where: {
          data: {
            path: ["smsDeliveryTracking", "twilioMessageId"],
            equals: messageId
          }
        }
      });

      if (!notificationLog) {
        console.error(
          `Cannot retry SMS ${messageId}: original notification not found`
        );
        return false;
      }

      // Extract retry information
      const data = notificationLog.data as Record<string, unknown>;
      const smsMetadata = data?.smsDeliveryTracking as SMSDeliveryMetadata;

      if (!smsMetadata?.recipientPhone) {
        console.error(
          `Cannot retry SMS ${messageId}: recipient phone not found`
        );
        return false;
      }

      // Attempt retry
      const retryResult = await twilioSMSService.sendNotification(
        notificationLog.eventType as NotificationEventType,
        smsMetadata.recipientPhone,
        data
      );

      // Update retry metadata
      await this.trackDelivery(
        notificationLog.id,
        retryResult.messageId || messageId,
        retryResult.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
        {
          ...smsMetadata,
          retryCount,
          retryAttemptedAt: new Date().toISOString(),
          retrySuccess: retryResult.success,
          retryError: retryResult.error
        }
      );

      return retryResult.success;
    } catch (error) {
      console.error("SMS retry error:", error);
      return false;
    }
  }

  /**
   * Get SMS analytics for a date range
   */
  async getAnalytics(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    propertyId?: string
  ): Promise<SMSAnalytics> {
    try {
      const whereClause: Prisma.NotificationLogWhereInput = {
        channel: "sms",
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (organizationId) {
        whereClause.organizationId = organizationId;
      }

      if (propertyId) {
        whereClause.propertyId = propertyId;
      }

      const notifications = await prisma.notificationLog.findMany({
        where: whereClause,
        select: {
          status: true,
          data: true,
          createdAt: true
        }
      });

      // Calculate analytics
      const totalSent = notifications.length;
      const totalDelivered = notifications.filter(
        (n) => n.status === NotificationStatus.DELIVERED
      ).length;
      const totalFailed = notifications.filter(
        (n) => n.status === NotificationStatus.FAILED
      ).length;
      const deliveryRate =
        totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      // Calculate cost and segments
      let totalCost = 0;
      let totalSegments = 0;
      const failureReasons: Record<string, number> = {};
      const deliveryTimes: number[] = [];

      notifications.forEach((notification) => {
        const data = notification.data as Record<string, unknown>;
        const smsMetadata = data?.smsDeliveryTracking as SMSDeliveryMetadata;

        if (smsMetadata) {
          // Cost calculation
          if (smsMetadata.price) {
            totalCost += parseFloat(smsMetadata.price);
          }

          // Segments
          if (smsMetadata.numSegments) {
            totalSegments += smsMetadata.numSegments;
          }

          // Failure reasons
          if (
            notification.status === NotificationStatus.FAILED &&
            smsMetadata.errorCode
          ) {
            failureReasons[smsMetadata.errorCode] =
              (failureReasons[smsMetadata.errorCode] || 0) + 1;
          }

          // Delivery times
          if (smsMetadata.deliveredAt && smsMetadata.timestamp) {
            const sentTime = new Date(smsMetadata.timestamp).getTime();
            const deliveredTime = new Date(smsMetadata.deliveredAt).getTime();
            deliveryTimes.push(deliveredTime - sentTime);
          }
        }
      });

      // Calculate delivery time statistics
      deliveryTimes.sort((a, b) => a - b);
      const averageDeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes.reduce((sum, time) => sum + time, 0) /
            deliveryTimes.length
          : 0;
      const medianDeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes[Math.floor(deliveryTimes.length / 2)]
          : 0;
      const p95DeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes[Math.floor(deliveryTimes.length * 0.95)]
          : 0;

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        averageSegments:
          totalSent > 0
            ? Math.round((totalSegments / totalSent) * 100) / 100
            : 0,
        totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
        costPerMessage:
          totalSent > 0
            ? Math.round((totalCost / totalSent) * 10000) / 10000
            : 0,
        failureReasons,
        deliveryTimes: {
          average: Math.round(averageDeliveryTime),
          median: Math.round(medianDeliveryTime),
          p95: Math.round(p95DeliveryTime)
        }
      };
    } catch (error) {
      console.error("SMS analytics error:", error);
      throw error;
    }
  }

  /**
   * Get failed SMS messages for retry
   */
  async getFailedMessages(
    organizationId?: string,
    propertyId?: string,
    maxRetries: number = 3
  ): Promise<
    Array<{
      messageId: string;
      recipientPhone: string;
      errorCode?: string;
      errorMessage?: string;
      retryCount: number;
      failedAt: string;
    }>
  > {
    try {
      const whereClause: Prisma.NotificationLogWhereInput = {
        channel: "sms",
        status: NotificationStatus.FAILED
      };

      if (organizationId) {
        whereClause.organizationId = organizationId;
      }

      if (propertyId) {
        whereClause.propertyId = propertyId;
      }

      const failedNotifications = await prisma.notificationLog.findMany({
        where: whereClause,
        select: {
          data: true
        }
      });

      return failedNotifications
        .map((notification) => {
          const data = notification.data as Record<string, unknown>;
          const smsMetadata = data?.smsDeliveryTracking as SMSDeliveryMetadata;

          if (!smsMetadata?.twilioMessageId || !smsMetadata?.recipientPhone) {
            return null;
          }

          const retryCount = smsMetadata.retryCount || 0;
          if (retryCount >= maxRetries) {
            return null;
          }

          return {
            messageId: smsMetadata.twilioMessageId,
            recipientPhone: smsMetadata.recipientPhone,
            errorCode: smsMetadata.errorCode,
            errorMessage: smsMetadata.errorMessage,
            retryCount,
            failedAt: smsMetadata.failedAt || smsMetadata.timestamp || ""
          };
        })
        .filter(Boolean) as Array<{
        messageId: string;
        recipientPhone: string;
        errorCode?: string;
        errorMessage?: string;
        retryCount: number;
        failedAt: string;
      }>;
    } catch (error) {
      console.error("Get failed SMS messages error:", error);
      return [];
    }
  }
}

// Export singleton instance
export const smsDeliveryTracker = new SMSDeliveryTracker();
