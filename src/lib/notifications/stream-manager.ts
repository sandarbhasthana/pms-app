// File: src/lib/notifications/stream-manager.ts

import { prisma } from "@/lib/prisma";
import { NotificationStatus, NotificationChannel } from "@/types/notifications";
import { redisConnection } from "@/lib/queue/redis";

export interface NotificationMessage {
  type: "notification";
  id: string;
  eventType: string;
  priority: string;
  subject: string;
  message: string;
  data: Record<string, string | number | boolean | null>;
  organizationId?: string;
  propertyId?: string;
  timestamp: string;
}

export interface StreamConnection {
  userId: string;
  organizationId?: string;
  propertyId?: string;
  sendMessage: (data: NotificationMessage, event?: string) => void;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export interface PendingNotification {
  id: string;
  userId: string;
  organizationId?: string;
  propertyId?: string;
  eventType: string;
  priority: string;
  subject: string;
  message: string;
  data: Record<string, string | number | boolean | null>;
  createdAt: Date;
}

/**
 * NotificationStreamManager handles real-time notification delivery
 * via Server-Sent Events (SSE) connections
 */
export class NotificationStreamManager {
  private connections = new Map<string, StreamConnection>();
  private userConnections = new Map<string, Set<string>>();
  private cleanupFunctions = new Map<string, () => void>();
  private pendingNotifications = new Map<string, PendingNotification[]>();

  /**
   * Add a new SSE connection
   */
  addConnection(
    userId: string,
    connectionData: Omit<
      StreamConnection,
      "userId" | "connectedAt" | "lastHeartbeat"
    >
  ): string {
    const connectionId = this.generateConnectionId();
    const now = new Date();

    const connection: StreamConnection = {
      userId,
      ...connectionData,
      connectedAt: now,
      lastHeartbeat: now
    };

    this.connections.set(connectionId, connection);

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    console.log(`✅ SSE connection added: ${connectionId} for user ${userId}`);
    return connectionId;
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { userId } = connection;

    // Remove from connections
    this.connections.delete(connectionId);

    // Remove from user connections
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Clean up any stored cleanup function
    this.cleanupFunctions.delete(connectionId);

    console.log(
      `🔌 SSE connection removed: ${connectionId} for user ${userId}`
    );
  }

  /**
   * Set cleanup function for a connection
   */
  setConnectionCleanup(connectionId: string, cleanup: () => void): void {
    this.cleanupFunctions.set(connectionId, cleanup);
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(
    userId: string,
    notification: {
      eventType: string;
      priority: string;
      subject: string;
      message: string;
      data: Record<string, string | number | boolean | null>;
      organizationId?: string;
      propertyId?: string;
    }
  ): Promise<boolean> {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      // No active connections, store as pending
      await this.storePendingNotification(userId, notification);
      return false;
    }

    let sent = false;
    const now = new Date();

    for (const connectionId of userConnections) {
      const connection = this.connections.get(connectionId);
      if (!connection) continue;

      // Check if notification matches connection filters
      if (
        notification.organizationId &&
        connection.organizationId &&
        notification.organizationId !== connection.organizationId
      ) {
        continue;
      }

      if (
        notification.propertyId &&
        connection.propertyId &&
        notification.propertyId !== connection.propertyId
      ) {
        continue;
      }

      try {
        connection.sendMessage(
          {
            type: "notification",
            id: this.generateNotificationId(),
            eventType: notification.eventType,
            priority: notification.priority,
            subject: notification.subject,
            message: notification.message,
            data: notification.data,
            organizationId: notification.organizationId,
            propertyId: notification.propertyId,
            timestamp: now.toISOString()
          },
          "notification"
        );

        connection.lastHeartbeat = now;
        sent = true;
      } catch (error) {
        console.error(
          `Failed to send notification to connection ${connectionId}:`,
          error
        );
        // Remove failed connection
        this.removeConnection(connectionId);
      }
    }

    return sent;
  }

  /**
   * Send notification to all users in an organization
   */
  async sendToOrganization(
    organizationId: string,
    notification: {
      eventType: string;
      priority: string;
      subject: string;
      message: string;
      data: Record<string, string | number | boolean | null>;
      propertyId?: string;
    }
  ): Promise<number> {
    let sentCount = 0;

    for (const [connectionId, connection] of this.connections) {
      if (connection.organizationId !== organizationId) continue;

      // Check property filter if specified
      if (
        notification.propertyId &&
        connection.propertyId &&
        notification.propertyId !== connection.propertyId
      ) {
        continue;
      }

      try {
        connection.sendMessage(
          {
            type: "notification",
            id: this.generateNotificationId(),
            eventType: notification.eventType,
            priority: notification.priority,
            subject: notification.subject,
            message: notification.message,
            data: notification.data,
            organizationId,
            propertyId: notification.propertyId,
            timestamp: new Date().toISOString()
          },
          "notification"
        );

        connection.lastHeartbeat = new Date();
        sentCount++;
      } catch (error) {
        console.error(
          `Failed to send notification to connection ${connectionId}:`,
          error
        );
        this.removeConnection(connectionId);
      }
    }

    return sentCount;
  }

  /**
   * Send pending notifications to a user when they connect
   */
  async sendPendingNotifications(userId: string): Promise<void> {
    try {
      // Get pending notifications from database
      const pendingNotifications = await prisma.notificationLog.findMany({
        where: {
          recipientId: userId,
          status: NotificationStatus.PENDING,
          channel: NotificationChannel.IN_APP
        },
        orderBy: { createdAt: "asc" },
        take: 50 // Limit to prevent overwhelming the client
      });

      for (const notification of pendingNotifications) {
        await this.sendToUser(userId, {
          eventType: notification.eventType,
          priority: notification.priority,
          subject: notification.subject,
          message: notification.message,
          data:
            (notification.data as Record<
              string,
              string | number | boolean | null
            >) || {},
          organizationId: notification.organizationId || undefined,
          propertyId: notification.propertyId || undefined
        });

        // Mark as sent
        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error("Failed to send pending notifications:", error);
    }
  }

  /**
   * Store notification as pending when user is offline
   */
  private async storePendingNotification(
    userId: string,
    notification: {
      eventType: string;
      priority: string;
      subject: string;
      message: string;
      data: Record<string, string | number | boolean | null>;
      organizationId?: string;
      propertyId?: string;
    }
  ): Promise<void> {
    try {
      // Store in Redis for quick access (optional)
      if (redisConnection) {
        const key = `pending_notifications:${userId}`;
        await redisConnection.lpush(
          key,
          JSON.stringify({
            ...notification,
            timestamp: new Date().toISOString()
          })
        );
        await redisConnection.expire(key, 86400); // Expire after 24 hours
      }
    } catch (error) {
      console.error("Failed to store pending notification in Redis:", error);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeUsers: number;
    connectionsByOrg: Record<string, number>;
  } {
    const connectionsByOrg: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      if (connection.organizationId) {
        connectionsByOrg[connection.organizationId] =
          (connectionsByOrg[connection.organizationId] || 0) + 1;
      }
    }

    return {
      totalConnections: this.connections.size,
      activeUsers: this.userConnections.size,
      connectionsByOrg
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [connectionId, connection] of this.connections) {
      if (now.getTime() - connection.lastHeartbeat.getTime() > staleThreshold) {
        console.log(`Removing stale connection: ${connectionId}`);
        this.removeConnection(connectionId);
      }
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const notificationStreamManager = new NotificationStreamManager();

// Set up periodic cleanup of stale connections
setInterval(() => {
  notificationStreamManager.cleanupStaleConnections();
}, 60000); // Run every minute
