/**
 * Report Generated Email Template
 *
 * Sends notification when a report has been generated and is ready for download
 */

import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
  replyTo: process.env.EMAIL_REPLY_TO || "support@yourdomain.com"
};

export interface ReportGeneratedEmailData {
  recipientEmail: string;
  recipientName: string;
  reportName: string;
  reportType: string;
  format: string;
  downloadUrl: string;
  expiresAt: Date;
  organizationName: string;
  propertyName?: string;
  generatedAt: Date;
}

/**
 * Send report generated notification email
 */
export async function sendReportGeneratedEmail(
  data: ReportGeneratedEmailData
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const htmlContent = generateReportEmailHTML(data);
    const textContent = generateReportEmailText(data);

    const emailData = {
      from: EMAIL_CONFIG.from,
      to: data.recipientEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `📊 Your ${data.reportName} is Ready`,
      html: htmlContent,
      text: textContent
    };

    console.log(
      `📧 Sending report notification email to ${data.recipientEmail}...`
    );

    if (!process.env.SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not configured");
      return { success: false, error: "Email service not configured" };
    }

    const result = await sgMail.send(emailData);

    const messageId = result[0]?.headers?.["x-message-id"] || "unknown";

    console.log(
      `✅ Report notification email sent successfully to ${data.recipientEmail} (ID: ${messageId})`
    );

    return { success: true, messageId };
  } catch (error) {
    console.error("Error sending report notification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Generate HTML email content
 */
function generateReportEmailHTML(data: ReportGeneratedEmailData): string {
  const {
    recipientName,
    reportName,
    reportType,
    format,
    downloadUrl,
    expiresAt,
    organizationName,
    propertyName,
    generatedAt
  } = data;

  // Calculate time until deletion
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeUntilDeletion =
    diffDays > 0
      ? `${diffDays} day${diffDays > 1 ? "s" : ""}`
      : "less than 1 day";

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Ready - ${reportName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7210a2 0%, #5a0880 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📊 Report Ready</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hello ${recipientName},</p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Your <strong>${reportName}</strong> has been generated and is ready for download.
            </p>

            <!-- Report Details Box -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin-top: 0; color: #7210a2; font-size: 18px;">Report Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Organization:</td>
                        <td style="padding: 8px 0; color: #374151;">${organizationName}</td>
                    </tr>
                    ${
                      propertyName
                        ? `
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Property:</td>
                        <td style="padding: 8px 0; color: #374151;">${propertyName}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Report Type:</td>
                        <td style="padding: 8px 0; color: #374151;">${reportType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Format:</td>
                        <td style="padding: 8px 0; color: #374151;">${format.toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Generated:</td>
                        <td style="padding: 8px 0; color: #374151;">${generatedAt.toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <!-- Download Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}" style="display: inline-block; background-color: #7210a2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Download Report
                </a>
            </div>

            <!-- Expiry Warning -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⏰ Important:</strong> This report will be automatically deleted in <strong>${timeUntilDeletion}</strong>. Please download it before ${expiresAt.toLocaleDateString()}.
                </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you have any questions or need assistance, please contact our support team.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This email was sent to ${
                  data.recipientEmail
                } because a report was generated for your account.
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content
 */
function generateReportEmailText(data: ReportGeneratedEmailData): string {
  const {
    recipientName,
    reportName,
    reportType,
    format,
    downloadUrl,
    expiresAt,
    organizationName,
    propertyName,
    generatedAt
  } = data;

  const diffMs = expiresAt.getTime() - new Date().getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeUntilDeletion =
    diffDays > 0
      ? `${diffDays} day${diffDays > 1 ? "s" : ""}`
      : "less than 1 day";

  return `
📊 REPORT READY

Hello ${recipientName},

Your ${reportName} has been generated and is ready for download.

REPORT DETAILS:
Organization: ${organizationName}
${propertyName ? `Property: ${propertyName}\n` : ""}Report Type: ${reportType}
Format: ${format.toUpperCase()}
Generated: ${generatedAt.toLocaleString()}

DOWNLOAD LINK:
${downloadUrl}

⏰ IMPORTANT: This report will be automatically deleted in ${timeUntilDeletion}. Please download it before ${expiresAt.toLocaleDateString()}.

If you have any questions or need assistance, please contact our support team.

---
This email was sent to ${
    data.recipientEmail
  } because a report was generated for your account.
  `;
}
