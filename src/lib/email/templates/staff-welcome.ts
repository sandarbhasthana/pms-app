// Welcome email template for staff members

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

export interface StaffWelcomeEmailData {
  staffName: string;
  staffEmail: string;
  temporaryPassword: string;
  organizationName: string;
  organizationRole: string;
  propertyAssignments?: Array<{
    propertyName: string;
    role: string;
    shift?: string;
  }>;
  loginUrl: string;
  inviterName?: string;
}

/**
 * Send welcome email to newly created staff member
 */
export async function sendStaffWelcomeEmail(
  data: StaffWelcomeEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not configured");
      return { success: false, error: "Email service not configured" };
    }

    const subject = `Welcome to ${data.organizationName} - Your Account is Ready`;
    const htmlContent = generateStaffWelcomeEmailHTML(data);
    const textContent = generateStaffWelcomeEmailText(data);

    const emailData = {
      from: EMAIL_CONFIG.from,
      to: data.staffEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: htmlContent,
      text: textContent
    };

    console.log(`📧 Sending staff welcome email to ${data.staffEmail}...`);

    const result = await sgMail.send(emailData);

    const messageId = result[0]?.headers?.["x-message-id"] || "unknown";

    console.log(
      `✅ Staff welcome email sent successfully to ${data.staffEmail} (ID: ${messageId})`
    );
    return { success: true, messageId };
  } catch (error) {
    console.error("Error sending staff welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Generate HTML email content for staff welcome
 */
function generateStaffWelcomeEmailHTML(data: StaffWelcomeEmailData): string {
  const {
    staffName,
    staffEmail,
    temporaryPassword,
    organizationName,
    organizationRole,
    propertyAssignments,
    loginUrl,
    inviterName
  } = data;

  const propertySection =
    propertyAssignments && propertyAssignments.length > 0
      ? `
      <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px; color: #047857;">📍 Your Property Assignments</h4>
        <ul style="margin: 0; padding-left: 20px; color: #065f46;">
          ${propertyAssignments
            .map(
              (p) =>
                `<li><strong>${p.propertyName}</strong> - ${p.role}${
                  p.shift ? ` (${p.shift} shift)` : ""
                }</li>`
            )
            .join("")}
        </ul>
      </div>
    `
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
    <div style="background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">PMS</div>
            <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0;">Welcome to ${organizationName}!</h1>
            <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0;">Your account has been created</p>
        </div>

        <div style="margin: 30px 0;">
            <p>Hello ${staffName},</p>
            
            <p>${
              inviterName
                ? `<strong>${inviterName}</strong> has added you`
                : "You have been added"
            } to <strong>${organizationName}</strong> as a <strong>${organizationRole.replace(
    "_",
    " "
  )}</strong> in our Property Management System.</p>

            <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Your Login Credentials</h3>
                <div style="margin: 10px 0;">
                    <span style="font-weight: 600; color: #374151; display: inline-block; width: 80px;">Email:</span>
                    <code style="font-family: monospace; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db; color: #1f2937;">${staffEmail}</code>
                </div>
                <div style="margin: 10px 0;">
                    <span style="font-weight: 600; color: #374151; display: inline-block; width: 80px;">Password:</span>
                    <code style="font-family: monospace; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db; color: #1f2937;">${temporaryPassword}</code>
                </div>
            </div>

            ${propertySection}

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 5px;">🔒 Security Notice</div>
                <div style="color: #b45309; font-size: 14px;">
                    This is a temporary password. Please change it after your first login in Profile Settings for security purposes.
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0;">Login to Your Account</a>
            </div>

            <p>If you have any questions, please contact your administrator.</p>
            <p><strong>The PMS Team</strong></p>
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>This email was sent to ${staffEmail} because an account was created for you at ${organizationName}.</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content for staff welcome
 */
function generateStaffWelcomeEmailText(data: StaffWelcomeEmailData): string {
  const {
    staffName,
    staffEmail,
    temporaryPassword,
    organizationName,
    organizationRole,
    propertyAssignments,
    loginUrl,
    inviterName
  } = data;

  const propertySection =
    propertyAssignments && propertyAssignments.length > 0
      ? `
YOUR PROPERTY ASSIGNMENTS:
${propertyAssignments
  .map(
    (p) =>
      `- ${p.propertyName} - ${p.role}${p.shift ? ` (${p.shift} shift)` : ""}`
  )
  .join("\n")}
`
      : "";

  return `
Welcome to ${organizationName}!

Hello ${staffName},

${
  inviterName ? `${inviterName} has added you` : "You have been added"
} to ${organizationName} as a ${organizationRole.replace(
    "_",
    " "
  )} in our Property Management System.

YOUR LOGIN CREDENTIALS:
Email: ${staffEmail}
Temporary Password: ${temporaryPassword}
${propertySection}
SECURITY NOTICE:
This is a temporary password. Please change it after your first login in Profile Settings for security purposes.

LOGIN URL: ${loginUrl}

If you have any questions, please contact your administrator.

The PMS Team

---
This email was sent to ${staffEmail} because an account was created for you at ${organizationName}.
  `;
}
