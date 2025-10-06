import { prisma } from "@/lib/prisma";
import {
  NotificationEventType,
  NotificationPriority,
  EmployeeRole,
  NotificationChannel,
  NotificationStatus,
  NotificationPayload,
  NotificationRule,
  NotificationTemplate,
  NotificationCondition,
  ThrottlingConfig,
  UserNotificationPreferences,
  DailySummaryData
} from "@/types/notifications";
import { EmailDeliveryMetadata } from "./email-delivery-tracker";

export class NotificationService {
  /**
   * Send immediate notification
   */
  async sendNotification(params: {
    eventType: NotificationEventType;
    recipientId: string;
    recipientRole: EmployeeRole;
    propertyId: string;
    organizationId: string;
    data: Record<string, string | number | boolean | null> | DailySummaryData;
    subject?: string;
    message?: string;
  }): Promise<void> {
    const {
      eventType,
      recipientId,
      recipientRole,
      propertyId,
      organizationId,
      data,
      subject,
      message
    } = params;

    // Get notification rules for this event type
    const rules = await this.getNotificationRules(
      eventType,
      recipientRole,
      propertyId,
      organizationId
    );

    // Get user preferences
    const preferences = await this.getUserPreferences(recipientId);

    for (const rule of rules) {
      // Check if rule conditions are met
      if (!this.evaluateRuleConditions(rule, data)) {
        continue;
      }

      // Get enabled channels for this user
      const enabledChannels = this.getEnabledChannels(
        rule.channels as NotificationChannel[],
        preferences
      );

      for (const channel of enabledChannels) {
        // Check quiet hours for non-critical notifications
        if (
          rule.priority !== NotificationPriority.IMMEDIATE &&
          this.isQuietHours(preferences)
        ) {
          continue;
        }

        // Create notification payload
        const payload: Omit<NotificationPayload, "id" | "createdAt"> = {
          eventType,
          priority: rule.priority,
          recipientId,
          recipientRole,
          channel,
          subject: subject || this.generateSubject(rule.template, data),
          message: message || this.generateMessage(rule.template, data),
          data: data as Record<string, string | number | boolean | null>,
          propertyId,
          organizationId,
          status: NotificationStatus.PENDING
        };

        // Send notification via appropriate channel
        await this.sendViaChannel(payload, channel);
      }
    }
  }

  /**
   * Send daily summary notifications
   */
  async sendDailySummary(
    propertyId: string,
    organizationId: string,
    summaryData: DailySummaryData
  ): Promise<void> {
    // Get all users who should receive daily summaries
    const users = await prisma.user.findMany({
      where: {
        userProperties: {
          some: {
            propertyId,
            role: {
              in: ["PROPERTY_MGR", "FRONT_DESK", "GUEST_SERVICES"]
            }
          }
        }
      },
      include: {
        notificationPreferences: true,
        userProperties: {
          where: { propertyId }
        }
      }
    });

    for (const user of users) {
      const preferences = user.notificationPreferences;
      if (
        !preferences?.eventSubscriptions ||
        !(preferences.eventSubscriptions as Record<string, boolean>)
          .dailySummaries
      ) {
        continue;
      }

      // Map PropertyRole to EmployeeRole
      const propertyRole = user.userProperties[0]?.role;
      const userRole = this.mapPropertyRoleToEmployeeRole(
        propertyRole as string
      );

      await this.sendNotification({
        eventType: NotificationEventType.ROOM_OCCUPANCY_SUMMARY,
        recipientId: user.id,
        recipientRole: userRole,
        propertyId,
        organizationId,
        data: summaryData,
        subject: `Daily Summary - ${summaryData.date}`,
        message: this.generateDailySummaryMessage(summaryData)
      });
    }
  }

  /**
   * Get notification rules for event type and role
   */
  private async getNotificationRules(
    eventType: NotificationEventType,
    recipientRole: EmployeeRole,
    propertyId: string,
    organizationId: string
  ): Promise<NotificationRule[]> {
    const rules = await prisma.notificationRule.findMany({
      where: {
        eventType,
        isActive: true,
        OR: [{ propertyId }, { propertyId: null, organizationId }]
      }
    });

    // Filter rules by target roles
    return rules
      .filter((rule) => {
        const targetRoles = rule.targetRoles as unknown as EmployeeRole[];
        return (
          targetRoles.includes(recipientRole) ||
          targetRoles.includes(EmployeeRole.ADMIN)
        );
      })
      .map((rule) => ({
        id: rule.id,
        eventType: rule.eventType as unknown as NotificationEventType,
        priority: rule.priority as unknown as NotificationPriority,
        targetRoles: rule.targetRoles as unknown as EmployeeRole[],
        channels: rule.channels as unknown as NotificationChannel[],
        isActive: rule.isActive,
        conditions: rule.conditions as unknown as NotificationCondition[],
        template: rule.template as unknown as NotificationTemplate,
        throttling: rule.throttling as unknown as ThrottlingConfig
      }));
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(
    userId: string
  ): Promise<UserNotificationPreferences | null> {
    const preferences = await prisma.userNotificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) return null;

    return {
      userId: preferences.userId,
      channels: preferences.channels as unknown as {
        inApp: boolean;
        email: boolean;
        sms: boolean;
      },
      eventSubscriptions: preferences.eventSubscriptions as unknown as {
        roomRequests: boolean;
        reservationChanges: boolean;
        paymentIssues: boolean;
        serviceRequests: boolean;
        maintenance: boolean;
        dailySummaries: boolean;
      },
      quietHours: preferences.quietHours as unknown as {
        start: string;
        end: string;
        timezone: string;
      },
      phoneNumber: preferences.phoneNumber || undefined,
      isActive: preferences.isActive
    };
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(
    rule: NotificationRule,
    data: Record<string, string | number | boolean | null> | DailySummaryData
  ): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    return rule.conditions.every((condition) => {
      const value = (data as Record<string, unknown>)[condition.field];

      switch (condition.operator) {
        case "equals":
          return value === condition.value;
        case "not_equals":
          return value !== condition.value;
        case "greater_than":
          return Number(value) > Number(condition.value);
        case "less_than":
          return Number(value) < Number(condition.value);
        case "contains":
          return String(value).includes(String(condition.value));
        default:
          return true;
      }
    });
  }

  /**
   * Get enabled channels for user
   */
  private getEnabledChannels(
    ruleChannels: NotificationChannel[],
    preferences: UserNotificationPreferences | null
  ): NotificationChannel[] {
    if (!preferences || !preferences.isActive) {
      return [NotificationChannel.IN_APP]; // Default to in-app only
    }

    return ruleChannels.filter((channel) => {
      switch (channel) {
        case NotificationChannel.IN_APP:
          return preferences.channels.inApp;
        case NotificationChannel.EMAIL:
          return preferences.channels.email;
        case NotificationChannel.SMS:
          return preferences.channels.sms && preferences.phoneNumber;
        default:
          return false;
      }
    });
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(
    preferences: UserNotificationPreferences | null
  ): boolean {
    if (!preferences?.quietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHours.start
      .split(":")
      .map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(":").map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Generate subject from template
   */
  private generateSubject(
    template: NotificationTemplate,
    data: Record<string, string | number | boolean | null> | DailySummaryData
  ): string {
    let subject = template.subject || "Notification";

    template.variables?.forEach((variable: string) => {
      const placeholder = `{{${variable}}}`;
      if (subject.includes(placeholder)) {
        subject = subject.replace(
          placeholder,
          String((data as Record<string, unknown>)[variable] || "")
        );
      }
    });

    return subject;
  }

  /**
   * Generate message from template
   */
  private generateMessage(
    template: NotificationTemplate,
    data: Record<string, string | number | boolean | null> | DailySummaryData
  ): string {
    let message = template.body || "You have a new notification.";

    template.variables?.forEach((variable: string) => {
      const placeholder = `{{${variable}}}`;
      if (message.includes(placeholder)) {
        message = message.replace(
          placeholder,
          String((data as Record<string, unknown>)[variable] || "")
        );
      }
    });

    return message;
  }

  /**
   * Generate daily summary message
   */
  private generateDailySummaryMessage(data: DailySummaryData): string {
    return `
Daily Summary for ${data.date}

📊 Revenue: ₹${data.totalRevenue.toLocaleString()}
🏨 Occupancy: ${data.occupancyRate}% (${data.occupiedRooms}/${
      data.totalRooms
    } rooms)
📋 Bookings: ${data.bookingCount}

✅ Check-ins: ${data.checkIns.completed} completed, ${
      data.checkIns.pending
    } pending
🚪 Check-outs: ${data.checkOuts.onTime} on-time, ${data.checkOuts.late} late

${data.noShows > 0 ? `⚠️ No-shows: ${data.noShows}` : ""}
${
  data.paymentFailures > 0 ? `💳 Payment failures: ${data.paymentFailures}` : ""
}
${
  data.maintenanceRequests > 0
    ? `🔧 Maintenance requests: ${data.maintenanceRequests}`
    : ""
}
    `.trim();
  }

  /**
   * Send notification via specific channel
   */
  private async sendViaChannel(
    payload: Omit<NotificationPayload, "id" | "createdAt">,
    channel: NotificationChannel
  ): Promise<void> {
    // Log the notification
    const notificationLog = await prisma.notificationLog.create({
      data: {
        eventType: payload.eventType,
        priority: payload.priority,
        recipientId: payload.recipientId,
        recipientRole: payload.recipientRole,
        channel,
        subject: payload.subject,
        message: payload.message,
        data: payload.data,
        propertyId: payload.propertyId,
        organizationId: payload.organizationId,
        status: NotificationStatus.PENDING
      }
    });

    try {
      switch (channel) {
        case NotificationChannel.IN_APP:
          await this.sendInAppNotification(payload);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(payload);
          break;
        case NotificationChannel.SMS:
          await this.sendSMSNotification(payload);
          break;
      }

      // Update status to sent
      await prisma.notificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date()
        }
      });
    } catch (error) {
      // Update status to failed
      await prisma.notificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      });

      console.error(`Failed to send ${channel} notification:`, error);
    }
  }

  /**
   * Send in-app notification (WebSocket/SSE)
   */
  private async sendInAppNotification(
    payload: Omit<NotificationPayload, "id" | "createdAt">
  ): Promise<void> {
    const { notificationStreamManager } = await import("./stream-manager");

    // Send real-time notification via SSE
    const sent = await notificationStreamManager.sendToUser(
      payload.recipientId,
      {
        eventType: payload.eventType,
        priority: payload.priority,
        subject: payload.subject,
        message: payload.message,
        data: payload.data,
        organizationId: payload.organizationId,
        propertyId: payload.propertyId
      }
    );

    if (!sent) {
      console.log(
        `User ${payload.recipientId} not connected, notification stored as pending`
      );
    } else {
      console.log(
        `Real-time notification sent to user ${payload.recipientId}: ${payload.subject}`
      );
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    payload: Omit<NotificationPayload, "id" | "createdAt">
  ): Promise<void> {
    try {
      // Get recipient user details
      const user = await prisma.user.findUnique({
        where: { id: payload.recipientId },
        select: { email: true, name: true }
      });

      if (!user?.email) {
        console.error(`User ${payload.recipientId} not found or has no email`);
        return;
      }

      // Import SendGrid email service dynamically to avoid circular dependencies
      const { sendGridEmailService } = await import("./sendgrid-email-service");

      // Send email notification via SendGrid
      const result = await sendGridEmailService.sendNotification(
        payload,
        user.email,
        user.name || undefined
      );

      if (!result.success) {
        console.error(`Failed to send email notification: ${result.error}`);
      } else {
        console.log(
          `Email notification sent to ${user.email}: ${payload.subject}`
        );

        // Store message ID in notification log for delivery tracking
        if (result.messageId) {
          try {
            // Find the most recent notification log entry for this recipient
            const recentLog = await prisma.notificationLog.findFirst({
              where: {
                recipientId: payload.recipientId,
                eventType: payload.eventType,
                subject: payload.subject
              },
              orderBy: { createdAt: "desc" }
            });

            if (recentLog) {
              // Parse existing data as EmailDeliveryMetadata
              const existingData =
                (recentLog.data as EmailDeliveryMetadata) || {};

              await prisma.notificationLog.update({
                where: { id: recentLog.id },
                data: {
                  data: JSON.stringify({
                    ...existingData,
                    messageId: result.messageId,
                    emailSentAt: new Date().toISOString()
                  })
                }
              });
            }
          } catch (error) {
            console.error("Error storing message ID for tracking:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    payload: Omit<NotificationPayload, "id" | "createdAt">
  ): Promise<void> {
    // TODO: Implement Twilio SMS
    console.log("SMS notification:", payload.subject);
  }

  /**
   * Map PropertyRole to EmployeeRole
   */
  private mapPropertyRoleToEmployeeRole(propertyRole: string): EmployeeRole {
    switch (propertyRole) {
      case "PROPERTY_MGR":
        return EmployeeRole.MANAGER;
      case "FRONT_DESK":
        return EmployeeRole.FRONT_DESK;
      case "HOUSEKEEPING":
        return EmployeeRole.HOUSEKEEPING;
      case "MAINTENANCE":
        return EmployeeRole.MAINTENANCE;
      case "GUEST_SERVICES":
        return EmployeeRole.FRONT_DESK; // Map guest services to front desk
      case "SECURITY":
        return EmployeeRole.MAINTENANCE; // Map security to maintenance
      case "ACCOUNTANT":
        return EmployeeRole.ADMIN;
      case "IT_SUPPORT":
        return EmployeeRole.ADMIN;
      default:
        return EmployeeRole.FRONT_DESK; // Default fallback
    }
  }
}

export const notificationService = new NotificationService();
