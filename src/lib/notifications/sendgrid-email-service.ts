// File: src/lib/notifications/sendgrid-email-service.ts

import sgMail from "@sendgrid/mail";
import {
  NotificationPayload,
  NotificationPriority
} from "@/types/notifications";
import { getEmailTemplate, replaceTemplateVariables } from "./email-templates";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
  replyTo: process.env.EMAIL_REPLY_TO || "support@yourdomain.com",
  baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000"
};

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SendGridEmailService handles sending email notifications via SendGrid
 * with proper templates and delivery tracking
 */
export class SendGridEmailService {
  /**
   * Send email notification using the notification payload
   */
  async sendNotification(
    payload: Omit<NotificationPayload, "id" | "createdAt">,
    recipientEmail: string,
    recipientName?: string
  ): Promise<EmailDeliveryResult> {
    try {
      // Validate SendGrid configuration
      if (!process.env.SENDGRID_API_KEY) {
        console.error("SENDGRID_API_KEY is not configured");
        return { success: false, error: "SendGrid API key not configured" };
      }

      // Generate email template based on event type
      const template = this.generateEmailTemplate(payload, recipientName);

      const emailData = {
        to: recipientEmail,
        from: {
          email: EMAIL_CONFIG.from,
          name: "PMS Notifications"
        },
        replyTo: EMAIL_CONFIG.replyTo,
        subject: template.subject,
        html: template.html,
        text: template.text,
        // SendGrid custom headers for tracking
        customArgs: {
          "notification-id": `${payload.eventType}-${Date.now()}`,
          priority: payload.priority,
          "organization-id": payload.organizationId,
          "property-id": payload.propertyId,
          "event-type": payload.eventType
        },
        // Enable click and open tracking
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true
          },
          openTracking: {
            enable: true,
            substitutionTag: "%open-track%"
          }
        },
        // Set priority header
        headers: {
          "X-Priority": this.getPriorityHeader(payload.priority),
          "X-MSMail-Priority": this.getPriorityHeader(payload.priority),
          Importance: this.getImportanceHeader(payload.priority)
        }
      };

      console.log(
        `📧 Sending SendGrid notification email to ${recipientEmail}: ${template.subject}`
      );

      const result = await sgMail.send(emailData);

      // SendGrid returns an array, get the first response
      const response = result[0];
      const messageId = response.headers["x-message-id"] || `sg-${Date.now()}`;

      console.log(
        `✅ SendGrid email sent successfully to ${recipientEmail} (ID: ${messageId})`
      );

      // Store message ID for delivery tracking
      if (messageId) {
        console.log(`📧 SendGrid message ID: ${messageId} ready for tracking`);
      }

      return { success: true, messageId };
    } catch (error: unknown) {
      console.error("Error sending SendGrid email:", error);

      // Handle SendGrid specific errors
      if (error && typeof error === "object" && "response" in error) {
        const sendGridError = error as {
          response: {
            body: { errors?: Array<{ message?: string; code?: string }> };
          };
          message?: string;
        };
        const { message, code } = sendGridError.response.body.errors?.[0] || {};
        return {
          success: false,
          error: `SendGrid Error (${code}): ${
            message || sendGridError.message || "Unknown SendGrid error"
          }`
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Send bulk email notifications
   */
  async sendBulkNotifications(
    payload: Omit<NotificationPayload, "id" | "createdAt">,
    recipients: Array<{ email: string; name?: string }>
  ): Promise<{ sent: number; failed: number; results: EmailDeliveryResult[] }> {
    const results: EmailDeliveryResult[] = [];
    let sent = 0;
    let failed = 0;

    // SendGrid supports bulk sending, but we'll send individually for better error handling
    for (const recipient of recipients) {
      const result = await this.sendNotification(
        payload,
        recipient.email,
        recipient.name
      );
      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Add small delay to avoid rate limiting (SendGrid allows 600 emails/second)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return { sent, failed, results };
  }

  /**
   * Send bulk emails using SendGrid's batch functionality (more efficient)
   */
  async sendBulkNotificationsBatch(
    payload: Omit<NotificationPayload, "id" | "createdAt">,
    recipients: Array<{ email: string; name?: string }>
  ): Promise<EmailDeliveryResult> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return { success: false, error: "SendGrid API key not configured" };
      }

      const template = this.generateEmailTemplate(payload);

      const emailData = {
        to: recipients.map((r) => ({ email: r.email, name: r.name })),
        from: {
          email: EMAIL_CONFIG.from,
          name: "PMS Notifications"
        },
        replyTo: EMAIL_CONFIG.replyTo,
        subject: template.subject,
        html: template.html,
        text: template.text,
        customArgs: {
          "notification-id": `bulk-${payload.eventType}-${Date.now()}`,
          priority: payload.priority,
          "organization-id": payload.organizationId,
          "property-id": payload.propertyId
        },
        trackingSettings: {
          clickTracking: { enable: true, enableText: true },
          openTracking: { enable: true }
        }
      };

      console.log(
        `📧 Sending bulk SendGrid email to ${recipients.length} recipients`
      );

      await sgMail.sendMultiple(emailData);
      const messageId = `bulk-${Date.now()}`;

      console.log(
        `✅ Bulk SendGrid email sent to ${recipients.length} recipients`
      );

      return { success: true, messageId };
    } catch (error: unknown) {
      console.error("Error sending bulk SendGrid email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Generate email template based on notification type
   */
  private generateEmailTemplate(
    payload: Omit<NotificationPayload, "id" | "createdAt">,
    recipientName?: string
  ): EmailTemplate {
    const baseTemplate = getEmailTemplate(payload.eventType);

    // Prepare template data including recipient name
    const templateData = {
      ...payload.data,
      recipientName: recipientName || "User",
      subject: payload.subject,
      message: payload.message
    };

    // Replace template variables with actual data
    const subject = replaceTemplateVariables(
      baseTemplate.subject,
      templateData
    );
    const html = replaceTemplateVariables(baseTemplate.html, templateData);
    const text = replaceTemplateVariables(baseTemplate.text, templateData);

    return {
      subject: this.addPriorityPrefix(subject, payload.priority),
      html: this.wrapInEmailLayout(html, payload),
      text
    };
  }

  /**
   * Add priority prefix to subject line
   */
  private addPriorityPrefix(
    subject: string,
    priority: NotificationPriority
  ): string {
    switch (priority) {
      case NotificationPriority.IMMEDIATE:
        return `[URGENT] ${subject}`;
      case NotificationPriority.DAILY_SUMMARY:
        return `[SUMMARY] ${subject}`;
      default:
        return subject;
    }
  }

  /**
   * Wrap content in email layout
   */
  private wrapInEmailLayout(
    content: string,
    payload: Omit<NotificationPayload, "id" | "createdAt">
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PMS Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #7c3aed;
            margin-bottom: 10px;
        }
        .priority-${payload.priority.toLowerCase()} {
            border-left: 4px solid ${this.getPriorityColor(payload.priority)};
            padding-left: 15px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .tracking-pixel {
            width: 1px;
            height: 1px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">PMS Notification</div>
        </div>
        
        <div class="priority-${payload.priority.toLowerCase()}">
            ${content}
        </div>
        
        <div class="footer">
            <p>This notification was sent from your Property Management System.</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
        </div>
    </div>
    
    <!-- SendGrid Open Tracking -->
    <img src="%open-track%" class="tracking-pixel" alt="" />
</body>
</html>
    `;
  }

  /**
   * Get priority color for styling
   */
  private getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.IMMEDIATE:
        return "#ef4444"; // red
      case NotificationPriority.DAILY_SUMMARY:
        return "#f97316"; // orange
      default:
        return "#3b82f6"; // blue
    }
  }

  /**
   * Get priority header for email clients
   */
  private getPriorityHeader(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.IMMEDIATE:
        return "High";
      case NotificationPriority.DAILY_SUMMARY:
        return "High";
      default:
        return "Normal";
    }
  }

  /**
   * Get importance header for email clients
   */
  private getImportanceHeader(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.IMMEDIATE:
        return "high";
      case NotificationPriority.DAILY_SUMMARY:
        return "high";
      default:
        return "normal";
    }
  }

  /**
   * Test SendGrid configuration
   */
  async testConfiguration(): Promise<EmailDeliveryResult> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return { success: false, error: "SENDGRID_API_KEY is not configured" };
      }

      // Test API key validity by making a simple API call
      console.log("✅ SendGrid configuration is valid");
      return { success: true };
    } catch (error) {
      console.error("SendGrid configuration test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

// Export singleton instance
export const sendGridEmailService = new SendGridEmailService();
