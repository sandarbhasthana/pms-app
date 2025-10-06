// File: src/app/api/notifications/stream/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notificationStreamManager } from "@/lib/notifications/stream-manager";

// Types for SSE message data
interface ConnectionMessage {
  type: "connection";
  message: string;
  timestamp: string;
  userId: string;
  organizationId: string | null;
  propertyId: string | null;
}

interface HeartbeatMessage {
  type: "heartbeat";
  timestamp: string;
}

interface NotificationMessage {
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

type SSEMessageData =
  | ConnectionMessage
  | HeartbeatMessage
  | NotificationMessage;

/**
 * GET /api/notifications/stream - Server-Sent Events endpoint for real-time notifications
 *
 * This endpoint establishes a persistent connection for real-time notifications
 * using Server-Sent Events (SSE). It supports:
 * - User-specific notification streams
 * - Organization and property filtering
 * - Connection management and cleanup
 * - Heartbeat to keep connections alive
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organizationId");
    const propertyId = url.searchParams.get("propertyId");

    // Variables for connection management
    let isControllerClosed = false;
    let heartbeatInterval: NodeJS.Timeout;
    let connectionId: string;

    // Set up SSE headers
    const sseHeaders = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin":
        process.env.NODE_ENV === "production" ? "https://pmsbeds.in" : "*",
      "Access-Control-Allow-Headers": "Cache-Control"
    };

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();

        const sendMessage = (data: SSEMessageData, event?: string) => {
          if (isControllerClosed) {
            return; // Don't try to send if controller is closed
          }

          try {
            const message = `${
              event ? `event: ${event}\n` : ""
            }data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error("Failed to send message:", error);
            isControllerClosed = true;
          }
        };

        // Send connection established message
        sendMessage(
          {
            type: "connection",
            message: "Connected to notification stream",
            timestamp: new Date().toISOString(),
            userId,
            organizationId,
            propertyId
          },
          "connected"
        );

        // Register connection with stream manager
        connectionId = notificationStreamManager.addConnection(userId, {
          organizationId: organizationId || undefined,
          propertyId: propertyId || undefined,
          sendMessage,
          controller
        });

        // Set up heartbeat to keep connection alive
        heartbeatInterval = setInterval(() => {
          if (isControllerClosed) {
            clearInterval(heartbeatInterval);
            return;
          }

          sendMessage(
            {
              type: "heartbeat",
              timestamp: new Date().toISOString()
            },
            "heartbeat"
          );
        }, 30000); // Send heartbeat every 30 seconds

        // Send any pending notifications for this user
        notificationStreamManager.sendPendingNotifications(userId);
      },

      cancel() {
        // Connection was closed by client
        console.log(`SSE connection cancelled for user ${userId}`);

        // Cleanup connection
        if (!isControllerClosed) {
          isControllerClosed = true;
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          if (connectionId) {
            notificationStreamManager.removeConnection(connectionId);
          }
        }
      }
    });

    return new Response(stream, {
      headers: sseHeaders
    });
  } catch (error) {
    console.error("SSE stream error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to establish notification stream",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

/**
 * OPTIONS /api/notifications/stream - Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
