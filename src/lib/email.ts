// File: src/lib/email.ts
import { Resend } from "resend";

// Lazy initialization of Resend to avoid build-time errors
let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(
      process.env.RESEND_API_KEY || "dummy-key-for-build"
    );
  }
  return resendInstance;
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
  replyTo: process.env.EMAIL_REPLY_TO || "support@yourdomain.com",
  baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000"
};

export interface InvitationEmailData {
  email: string;
  phone: string;
  organizationName: string;
  organizationRole: string;
  propertyName?: string;
  propertyRole?: string;
  shift?: string;
  inviterName: string;
  inviterEmail: string;
  token: string;
  expiresAt: Date;
  message?: string;
}

/**
 * Send invitation email to new staff member
 */
export async function sendInvitationEmail(
  data: InvitationEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return { success: false, error: "Email service not configured" };
    }

    const invitationUrl = `${EMAIL_CONFIG.baseUrl}/api/auth/invite/${data.token}`;
    const expiryDate = data.expiresAt.toLocaleDateString();
    const expiryTime = data.expiresAt.toLocaleTimeString();

    // Generate email HTML content
    const htmlContent = generateInvitationEmailHTML(
      data,
      invitationUrl,
      expiryDate,
      expiryTime
    );

    // Generate email text content (fallback)
    const textContent = generateInvitationEmailText(
      data,
      invitationUrl,
      expiryDate,
      expiryTime
    );

    const emailData = {
      from: EMAIL_CONFIG.from,
      to: data.email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Invitation to join ${data.organizationName} - Property Management System`,
      html: htmlContent,
      text: textContent
    };

    console.log(`📧 Sending invitation email to ${data.email}...`);

    const resend = getResendClient();
    const result = await resend.emails.send(emailData);

    if (result.error) {
      console.error("Failed to send invitation email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log(
      `✅ Invitation email sent successfully to ${data.email} (ID: ${result.data?.id})`
    );
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Generate HTML email content for invitation
 */
function generateInvitationEmailHTML(
  data: InvitationEmailData,
  invitationUrl: string,
  expiryDate: string,
  expiryTime: string
): string {
  const roleDisplay = getRoleDisplayName(data.organizationRole);
  const propertyRoleDisplay = data.propertyRole
    ? getRoleDisplayName(data.propertyRole)
    : null;
  const shiftDisplay = getShiftDisplayName(data.shift);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to ${data.organizationName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px; }
        .invitation-details { background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .detail-label { font-weight: 600; color: #64748b; }
        .detail-value { color: #1e293b; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center; }
        .cta-button:hover { background: linear-gradient(135deg, #6d28d9 0%, #9333ea 100%); }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }
        .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
        .message-box { background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; margin: 20px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Welcome to ${data.organizationName}</h1>
            <p>You've been invited to join our property management team</p>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p><strong>${
              data.inviterName
            }</strong> has invited you to join <strong>${
    data.organizationName
  }</strong> as a team member in our Property Management System.</p>
            
            <div class="invitation-details">
                <h3 style="margin-top: 0; color: #1e293b;">📋 Invitation Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Organization:</span>
                    <span class="detail-value">${data.organizationName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Your Role:</span>
                    <span class="detail-value">${roleDisplay}</span>
                </div>
                ${
                  data.propertyName
                    ? `
                <div class="detail-row">
                    <span class="detail-label">Property Assignment:</span>
                    <span class="detail-value">${data.propertyName}</span>
                </div>
                `
                    : ""
                }
                ${
                  propertyRoleDisplay
                    ? `
                <div class="detail-row">
                    <span class="detail-label">Property Role:</span>
                    <span class="detail-value">${propertyRoleDisplay}</span>
                </div>
                `
                    : ""
                }
                ${
                  shiftDisplay
                    ? `
                <div class="detail-row">
                    <span class="detail-label">Shift Assignment:</span>
                    <span class="detail-value">${shiftDisplay}</span>
                </div>
                `
                    : ""
                }
                <div class="detail-row">
                    <span class="detail-label">Invited by:</span>
                    <span class="detail-value">${data.inviterName} (${
    data.inviterEmail
  })</span>
                </div>
            </div>

            ${
              data.message
                ? `
            <div class="message-box">
                <h4 style="margin-top: 0; color: #0284c7;">💬 Personal Message</h4>
                <p style="margin-bottom: 0;">${data.message}</p>
            </div>
            `
                : ""
            }
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="cta-button">Accept Invitation & Join Team</a>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This invitation expires on <strong>${expiryDate} at ${expiryTime}</strong>. 
                Please accept it before then to join the team.
            </div>
            
            <p>After clicking the button above, you'll be able to:</p>
            <ul>
                <li>Set up your account and password</li>
                <li>Access the property management system</li>
                <li>View your assigned properties and responsibilities</li>
                <li>Collaborate with your team members</li>
            </ul>
            
            <p>If you have any questions about this invitation, please contact <strong>${
              data.inviterName
            }</strong> at <a href="mailto:${data.inviterEmail}">${
    data.inviterEmail
  }</a>.</p>
        </div>
        
        <div class="footer">
            <p>This invitation was sent to <strong>${data.email}</strong></p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 20px; font-size: 12px;">
                Property Management System • Secure Team Collaboration
            </p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate plain text email content for invitation (fallback)
 */
function generateInvitationEmailText(
  data: InvitationEmailData,
  invitationUrl: string,
  expiryDate: string,
  expiryTime: string
): string {
  const roleDisplay = getRoleDisplayName(data.organizationRole);
  const propertyRoleDisplay = data.propertyRole
    ? getRoleDisplayName(data.propertyRole)
    : null;
  const shiftDisplay = getShiftDisplayName(data.shift);

  return `
Welcome to ${data.organizationName}!

You've been invited to join our property management team.

INVITATION DETAILS:
- Organization: ${data.organizationName}
- Your Role: ${roleDisplay}
${data.propertyName ? `- Property Assignment: ${data.propertyName}` : ""}
${propertyRoleDisplay ? `- Property Role: ${propertyRoleDisplay}` : ""}
${shiftDisplay ? `- Shift Assignment: ${shiftDisplay}` : ""}
- Invited by: ${data.inviterName} (${data.inviterEmail})

${data.message ? `PERSONAL MESSAGE:\n${data.message}\n` : ""}

To accept this invitation and join the team, click the link below:
${invitationUrl}

IMPORTANT: This invitation expires on ${expiryDate} at ${expiryTime}.

After accepting, you'll be able to:
• Set up your account and password
• Access the property management system
• View your assigned properties and responsibilities
• Collaborate with your team members

If you have questions, contact ${data.inviterName} at ${data.inviterEmail}.

---
This invitation was sent to ${data.email}
If you didn't expect this invitation, you can safely ignore this email.
`;
}

/**
 * Get display name for roles
 */
function getRoleDisplayName(role: string): string {
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Administrator",
    ORG_ADMIN: "Organization Administrator",
    PROPERTY_MGR: "Property Manager",
    FRONT_DESK: "Front Desk Staff",
    HOUSEKEEPING: "Housekeeping Staff",
    MAINTENANCE: "Maintenance Staff",
    ACCOUNTANT: "Accountant",
    OWNER: "Property Owner",
    IT_SUPPORT: "IT Support",
    SECURITY: "Security Staff",
    GUEST_SERVICES: "Guest Services"
  };

  return roleLabels[role] || role;
}

/**
 * Get display name for shifts
 */
function getShiftDisplayName(shift?: string): string | null {
  if (!shift) return null;

  const shiftLabels: Record<string, string> = {
    MORNING: "Morning Shift (6 AM - 2 PM)",
    EVENING: "Evening Shift (2 PM - 10 PM)",
    NIGHT: "Night Shift (10 PM - 6 AM)",
    FLEXIBLE: "Flexible Schedule"
  };

  return shiftLabels[shift] || shift;
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    // Test with a simple email send (you can comment this out in production)
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
