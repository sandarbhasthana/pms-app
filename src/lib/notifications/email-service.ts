// File: src/lib/notifications/email-service.ts

import { Resend } from "resend";
import {
  NotificationPayload,
  NotificationPriority
} from "@/types/notifications";
import { getEmailTemplate, replaceTemplateVariables } from "./email-templates";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

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
 * NotificationEmailService handles sending email notifications
 * with proper templates and delivery tracking
 */
export class NotificationEmailService {
  /**
   * Send email notification using the notification payload
   */
  async sendNotification(
    payload: Omit<NotificationPayload, "id" | "createdAt">,
    recipientEmail: string,
    recipientName?: string
  ): Promise<EmailDeliveryResult> {
    try {
      // Validate email service configuration
      if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not configured");
        return { success: false, error: "Email service not configured" };
      }

      // Generate email template based on event type
      const template = this.generateEmailTemplate(payload, recipientName);

      const emailData = {
        from: EMAIL_CONFIG.from,
        to: recipientEmail,
        replyTo: EMAIL_CONFIG.replyTo,
        subject: template.subject,
        html: template.html,
        text: template.text,
        // Add tracking headers
        headers: {
          "X-Notification-ID": `${payload.eventType}-${Date.now()}`,
          "X-Priority": this.getPriorityHeader(payload.priority),
          "X-Organization-ID": payload.organizationId,
          "X-Property-ID": payload.propertyId
        }
      };

      console.log(
        `📧 Sending notification email to ${recipientEmail}: ${template.subject}`
      );

      const result = await resend.emails.send(emailData);

      if (result.error) {
        console.error("Failed to send notification email:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log(
        `✅ Notification email sent successfully to ${recipientEmail} (ID: ${result.data?.id})`
      );

      // Store message ID for delivery tracking
      if (result.data?.id) {
        console.log(
          `📧 Email message ID: ${result.data.id} ready for tracking`
        );
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error("Error sending notification email:", error);
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

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { sent, failed, results };
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
    <title>Notification</title>
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
        return "#3b82f6"; // blue
      default:
        return "#6b7280"; // gray
    }
  }

  /**
   * Get priority header for email tracking
   */
  private getPriorityHeader(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.IMMEDIATE:
        return "1 (Highest)";
      case NotificationPriority.DAILY_SUMMARY:
        return "2 (Summary)";
      default:
        return "3 (Normal)";
    }
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<EmailDeliveryResult> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "RESEND_API_KEY is not configured" };
      }

      console.log("✅ Email service configuration is valid");
      return { success: true };
    } catch (error) {
      console.error("Email configuration test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

// Export singleton instance
export const notificationEmailService = new NotificationEmailService();
