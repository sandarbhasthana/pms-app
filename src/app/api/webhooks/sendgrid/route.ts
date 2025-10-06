// File: src/app/api/webhooks/sendgrid/route.ts

import { NextRequest, NextResponse } from "next/server";
import { emailDeliveryTracker } from "@/lib/notifications/email-delivery-tracker";
import { NotificationStatus } from "@/types/notifications";
import crypto from "crypto";

/**
 * SendGrid webhook event types
 */
type SendGridEventType =
  | "delivered"
  | "open"
  | "click"
  | "bounce"
  | "dropped"
  | "deferred"
  | "processed"
  | "spam_report"
  | "unsubscribe";

/**
 * SendGrid webhook event interface
 * Based on SendGrid Event Webhook documentation
 */
interface SendGridWebhookEvent {
  event: SendGridEventType;
  sg_message_id: string;
  email: string;
  timestamp: number;
  url?: string; // Present for click events
  reason?: string; // Present for bounce, dropped, deferred events
  bounce_classification?: "hard" | "soft"; // Present for bounce events
  "notification-id"?: string; // Custom arg we set when sending emails
  [key: string]: string | number | boolean | undefined; // For additional custom args and optional fields
}

/**
 * SendGrid Webhook Handler
 * Handles delivery events from SendGrid for email tracking
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/sendgrid
 *
 * Events handled:
 * - delivered: Email was delivered successfully
 * - open: Email was opened by recipient
 * - click: Link in email was clicked
 * - bounce: Email bounced
 * - dropped: Email was dropped by SendGrid
 * - deferred: Email delivery was deferred
 * - processed: Email was processed by SendGrid
 */

export async function POST(req: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await req.text();

    // Verify webhook signature for security (optional but recommended)
    if (!verifyWebhookSignature(req, body)) {
      console.warn("SendGrid webhook signature verification failed");
      return NextResponse.json(
        { error: "Unauthorized: Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Parse the events from the body
    const events = JSON.parse(body);

    console.log(`📧 Received ${events.length} SendGrid webhook events`);

    // Process each event
    for (const event of events) {
      await processWebhookEvent(event);
    }

    return NextResponse.json({
      message: `Processed ${events.length} events successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("SendGrid webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook events",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * Process individual SendGrid webhook event
 */
async function processWebhookEvent(event: SendGridWebhookEvent) {
  try {
    const {
      event: eventType,
      sg_message_id: messageId,
      email,
      timestamp,
      url,
      reason,
      bounce_classification,
      ...customArgs
    } = event;

    console.log(
      `📧 Processing SendGrid event: ${eventType} for ${email} (${messageId})`
    );

    // Log custom arguments if present for debugging
    if (Object.keys(customArgs).length > 0) {
      console.log(`📧 Custom args:`, customArgs);
    }

    switch (eventType) {
      case "delivered":
        await emailDeliveryTracker.trackDelivery(
          getNotificationId(event),
          messageId,
          NotificationStatus.DELIVERED,
          {
            deliveredAt: new Date(timestamp * 1000).toISOString(),
            email,
            provider: "sendgrid"
          }
        );
        break;

      case "open":
        await emailDeliveryTracker.trackOpen(messageId);
        console.log(`📧 Email opened: ${email} (${messageId})`);
        break;

      case "click":
        await emailDeliveryTracker.trackClick(messageId, url || "");
        console.log(
          `📧 Email link clicked: ${email} -> ${
            url || "unknown"
          } (${messageId})`
        );
        break;

      case "bounce":
        const bounceType = bounce_classification === "hard" ? "hard" : "soft";
        await emailDeliveryTracker.trackBounce(
          messageId,
          bounceType,
          reason || "Unknown reason"
        );
        console.log(
          `📧 Email bounced: ${email} - ${bounceType} bounce: ${
            reason || "Unknown reason"
          } (${messageId})`
        );
        break;

      case "dropped":
        await emailDeliveryTracker.trackDelivery(
          getNotificationId(event),
          messageId,
          NotificationStatus.FAILED,
          {
            droppedAt: new Date(timestamp * 1000).toISOString(),
            reason,
            email,
            provider: "sendgrid"
          }
        );
        console.log(`📧 Email dropped: ${email} - ${reason} (${messageId})`);
        break;

      case "deferred":
        console.log(`📧 Email deferred: ${email} - ${reason} (${messageId})`);
        // Don't update status for deferred, just log it
        break;

      case "processed":
        await emailDeliveryTracker.trackDelivery(
          getNotificationId(event),
          messageId,
          NotificationStatus.SENT,
          {
            processedAt: new Date(timestamp * 1000).toISOString(),
            email,
            provider: "sendgrid"
          }
        );
        console.log(`📧 Email processed: ${email} (${messageId})`);
        break;

      case "spam_report":
        console.log(`📧 Email marked as spam: ${email} (${messageId})`);
        // Could track this as a special status if needed
        break;

      case "unsubscribe":
        console.log(`📧 User unsubscribed: ${email} (${messageId})`);
        // Could update user preferences here
        break;

      default:
        console.log(
          `📧 Unhandled SendGrid event: ${eventType} for ${email} (${messageId})`
        );
    }
  } catch (error) {
    console.error(`Error processing SendGrid event:`, error);
  }
}

/**
 * Extract notification ID from SendGrid event
 * This uses the custom args we set when sending the email
 */
function getNotificationId(event: SendGridWebhookEvent): string {
  // Try to get from custom args first
  if (event["notification-id"]) {
    return event["notification-id"];
  }

  // Fallback to message ID
  return event.sg_message_id || `unknown-${Date.now()}`;
}

function verifyWebhookSignature(req: NextRequest, body: string): boolean {
  try {
    const signature = req.headers.get("X-Twilio-Email-Event-Webhook-Signature");
    const timestamp = req.headers.get("X-Twilio-Email-Event-Webhook-Timestamp");

    if (!signature || !timestamp) {
      console.warn("Missing SendGrid webhook signature headers");
      return false;
    }

    // In production, require signing key for security. In development, allow without verification
    const signingKey = process.env.SENDGRID_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "SENDGRID_WEBHOOK_SIGNING_KEY is required in production for security"
        );
        return false;
      } else {
        console.warn(
          "SENDGRID_WEBHOOK_SIGNING_KEY not configured, skipping signature verification (development mode)"
        );
        return true;
      }
    }

    // Verify the signature using the webhook signing key and request body
    const expectedSignature = crypto
      .createHmac("sha256", signingKey)
      .update(timestamp + body)
      .digest("base64");

    const isValid = signature === expectedSignature;

    if (!isValid) {
      console.error("SendGrid webhook signature verification failed", {
        expected: expectedSignature,
        received: signature,
        timestamp,
        bodyLength: body.length
      });
    }

    return isValid;
  } catch (error) {
    console.error("Error verifying SendGrid webhook signature:", error);
    return false;
  }
}

/**
 * GET handler for webhook verification (SendGrid may send GET requests to verify the endpoint)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "SendGrid webhook endpoint is active",
    timestamp: new Date().toISOString(),
    url: req.url
  });
}
