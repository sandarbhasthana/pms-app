// File: src/app/api/webhooks/twilio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { NotificationStatus } from "@/types/notifications";

// Twilio webhook event types
interface TwilioWebhookEvent {
  MessageSid: string;
  MessageStatus:
    | "queued"
    | "sent"
    | "received"
    | "delivered"
    | "undelivered"
    | "failed";
  To: string;
  From: string;
  Body?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  AccountSid: string;
  ApiVersion: string;
  SmsSid: string;
  SmsStatus: string;
  NumSegments?: string;
  Price?: string;
  PriceUnit?: string;
}

/**
 * Map Twilio status to our notification status
 */
function mapTwilioStatusToNotificationStatus(
  twilioStatus: string
): NotificationStatus {
  switch (twilioStatus.toLowerCase()) {
    case "queued":
    case "sent":
      return NotificationStatus.SENT;
    case "delivered":
    case "received":
      return NotificationStatus.DELIVERED;
    case "undelivered":
    case "failed":
      return NotificationStatus.FAILED;
    default:
      return NotificationStatus.PENDING;
  }
}

/**
 * Get notification ID from Twilio message SID
 * This is a helper function to map Twilio SIDs to our notification system
 */
function getNotificationIdFromEvent(event: TwilioWebhookEvent): string {
  // For now, we'll use the MessageSid as the notification ID
  // In a production system, you might want to store this mapping in the database
  return `sms-${event.MessageSid}`;
}

/**
 * Twilio Webhook Handler
 * Processes delivery status updates from Twilio
 */
export async function POST(req: NextRequest) {
  try {
    console.log("📱 Twilio webhook received");

    // Parse form data (Twilio sends webhooks as form-encoded data)
    const formData = await req.formData();
    const event: Partial<TwilioWebhookEvent> = {};

    // Convert FormData to object with proper typing
    for (const [key, value] of formData.entries()) {
      const stringValue = value as string;

      // Type-safe assignment based on known TwilioWebhookEvent properties
      switch (key) {
        case "MessageSid":
          event.MessageSid = stringValue;
          break;
        case "MessageStatus":
          const validStatuses: TwilioWebhookEvent["MessageStatus"][] = [
            "queued",
            "sent",
            "received",
            "delivered",
            "undelivered",
            "failed"
          ];
          if (
            validStatuses.includes(
              stringValue as TwilioWebhookEvent["MessageStatus"]
            )
          ) {
            event.MessageStatus =
              stringValue as TwilioWebhookEvent["MessageStatus"];
          }
          break;
        case "To":
          event.To = stringValue;
          break;
        case "From":
          event.From = stringValue;
          break;
        case "Body":
          event.Body = stringValue;
          break;
        case "ErrorCode":
          event.ErrorCode = stringValue;
          break;
        case "ErrorMessage":
          event.ErrorMessage = stringValue;
          break;
        case "AccountSid":
          event.AccountSid = stringValue;
          break;
        case "ApiVersion":
          event.ApiVersion = stringValue;
          break;
        case "SmsSid":
          event.SmsSid = stringValue;
          break;
        case "SmsStatus":
          event.SmsStatus = stringValue;
          break;
        case "NumSegments":
          event.NumSegments = stringValue;
          break;
        case "Price":
          event.Price = stringValue;
          break;
        case "PriceUnit":
          event.PriceUnit = stringValue;
          break;
        // Ignore unknown properties to maintain type safety
        default:
          console.log(`Unknown Twilio webhook property: ${key}`);
          break;
      }
    }

    console.log("📱 Twilio event:", {
      MessageSid: event.MessageSid,
      MessageStatus: event.MessageStatus,
      To: event.To,
      ErrorCode: event.ErrorCode,
      ErrorMessage: event.ErrorMessage
    });

    // Validate required fields
    if (!event.MessageSid || !event.MessageStatus) {
      console.error("❌ Invalid Twilio webhook: missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Import delivery tracker dynamically to avoid circular dependencies
    const { smsDeliveryTracker } = await import(
      "@/lib/notifications/sms-delivery-tracker"
    );

    const notificationId = getNotificationIdFromEvent(
      event as TwilioWebhookEvent
    );
    const notificationStatus = mapTwilioStatusToNotificationStatus(
      event.MessageStatus
    );

    // Track delivery status
    await smsDeliveryTracker.trackDelivery(
      notificationId,
      event.MessageSid!,
      notificationStatus,
      {
        twilioStatus: event.MessageStatus,
        recipientPhone: event.To,
        errorCode: event.ErrorCode,
        errorMessage: event.ErrorMessage,
        numSegments: event.NumSegments
          ? parseInt(event.NumSegments)
          : undefined,
        price: event.Price,
        priceUnit: event.PriceUnit,
        timestamp: new Date().toISOString()
      }
    );

    // Handle specific status types
    switch (event.MessageStatus) {
      case "delivered":
        console.log(`✅ SMS delivered successfully: ${event.MessageSid}`);
        break;

      case "undelivered":
      case "failed":
        console.error(`❌ SMS delivery failed: ${event.MessageSid}`, {
          errorCode: event.ErrorCode,
          errorMessage: event.ErrorMessage,
          to: event.To
        });

        // You could implement retry logic here
        // await retrySMSDelivery(event.MessageSid);
        break;

      case "sent":
        console.log(`📤 SMS sent: ${event.MessageSid}`);
        break;

      case "queued":
        console.log(`⏳ SMS queued: ${event.MessageSid}`);
        break;
    }

    return NextResponse.json({
      message: "Webhook processed successfully",
      messageId: event.MessageSid,
      status: event.MessageStatus
    });
  } catch (error) {
    console.error("❌ Twilio webhook error:", error);

    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (for webhook verification)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get("challenge");

  if (challenge) {
    // Webhook verification challenge
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return NextResponse.json({
    message: "Twilio webhook endpoint",
    status: "active",
    timestamp: new Date().toISOString()
  });
}
