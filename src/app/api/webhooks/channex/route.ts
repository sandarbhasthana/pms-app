/**
 * Channex Webhook Handler
 *
 * Receives booking notifications and updates from Channex.
 * Processes events: booking.created, booking.updated, booking.cancelled
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getReservationSyncService } from "@/lib/channex/reservation-sync-service";
import type {
  ChannexReservation,
  ChannexWebhookEventType
} from "@/lib/channex/types";

export const runtime = "nodejs";

interface ChannexWebhookPayload {
  event: ChannexWebhookEventType;
  timestamp: string;
  property_id?: string;
  data: ChannexReservation | unknown;
}

/**
 * Verify webhook signature using HMAC SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn("Missing signature or secret for webhook verification");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * POST /api/webhooks/channex
 * Main webhook handler for Channex events
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-channex-signature") || "";
    const webhookSecret = process.env.CHANNEX_WEBHOOK_SECRET;

    // Verify signature (skip in development if no secret configured)
    if (webhookSecret && process.env.NODE_ENV === "production") {
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error("Invalid Channex webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event: ChannexWebhookPayload = JSON.parse(rawBody);
    console.log(`📥 Channex webhook received: ${event.event}`);

    // Look up ChannexProperty if property_id provided (for FK constraint)
    let channexPropertyDbId: string | null = null;
    if (event.property_id) {
      const channexProperty = await prisma.channexProperty.findFirst({
        where: { channexPropertyId: event.property_id }
      });
      channexPropertyDbId = channexProperty?.id ?? null;
    }

    // Log the webhook to database
    const webhookLog = await prisma.channexWebhookLog.create({
      data: {
        eventType: event.event,
        channexPropertyId: channexPropertyDbId,
        payload: (event.data as object) ?? {},
        receivedAt: new Date(),
        status: "RECEIVED"
      }
    });

    // Process based on event type
    const syncService = getReservationSyncService();
    let result: {
      success: boolean;
      message: string;
      reservationIds?: string[];
    } = {
      success: true,
      message: "Event received"
    };

    switch (event.event) {
      case "booking":
      case "booking_created": {
        const reservationIds = await syncService.handleNewBooking(
          event.data as ChannexReservation
        );
        result = {
          success: true,
          message: `Created ${reservationIds.length} reservation(s)`,
          reservationIds
        };
        break;
      }

      case "booking_modified":
      case "booking_updated": {
        await syncService.handleModifiedBooking(
          event.data as ChannexReservation
        );
        result = { success: true, message: "Reservation updated" };
        break;
      }

      case "booking_cancelled": {
        await syncService.handleCancelledBooking(
          event.data as ChannexReservation
        );
        result = { success: true, message: "Reservation cancelled" };
        break;
      }

      case "ari_updated":
        console.log("ARI updated event received - no action needed");
        break;

      case "channel_connected":
      case "channel_disconnected":
        await handleChannelStatusChange(event);
        break;

      case "ping":
        console.log("Webhook ping received");
        break;

      default:
        console.log(`Unhandled Channex event type: ${event.event}`);
    }

    // Update webhook log status
    await prisma.channexWebhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date()
      }
    });

    return NextResponse.json({
      received: true,
      ...result,
      processingTimeMs: Date.now() - startTime
    });
  } catch (error) {
    console.error("Channex webhook error:", error);

    // Try to log the error
    try {
      const rawBody = await req.clone().text();
      const event = JSON.parse(rawBody);
      await prisma.channexWebhookLog.updateMany({
        where: {
          eventType: event.event,
          status: "RECEIVED"
        },
        data: {
          status: "FAILED",
          processingError:
            error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date()
        }
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: "Webhook processing failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Handle channel connection status changes
 */
async function handleChannelStatusChange(event: ChannexWebhookPayload) {
  if (!event.property_id) return;

  const isConnected = event.event === "channel_connected";

  await prisma.channexProperty.updateMany({
    where: { channexPropertyId: event.property_id },
    data: {
      syncStatus: isConnected ? "COMPLETED" : "FAILED",
      lastSyncAt: new Date()
    }
  });

  console.log(
    `📺 Channel ${isConnected ? "connected" : "disconnected"} for property ${
      event.property_id
    }`
  );
}

/**
 * GET /api/webhooks/channex
 * Health check endpoint for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "channex-webhook",
    timestamp: new Date().toISOString()
  });
}
