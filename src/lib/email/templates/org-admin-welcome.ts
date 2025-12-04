// Welcome email template for organization admin users

import sgMail from "@sendgrid/mail";
import { WelcomeEmailData } from "@/lib/types/organization-onboarding";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
  replyTo: process.env.EMAIL_REPLY_TO || "support@yourdomain.com"
};

/**
 * Send welcome email to newly created organization admin
 */
export async function sendWelcomeEmail(
  data: WelcomeEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not configured");
      return { success: false, error: "Email service not configured" };
    }

    const subject = `Welcome to ${data.organizationName} - Your Admin Account is Ready`;
    const htmlContent = generateWelcomeEmailHTML(data);
    const textContent = generateWelcomeEmailText(data);

    const emailData = {
      from: EMAIL_CONFIG.from,
      to: data.adminEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html: htmlContent,
      text: textContent
    };

    console.log(`📧 Sending welcome email to ${data.adminEmail}...`);

    const result = await sgMail.send(emailData);

    const messageId = result[0]?.headers?.["x-message-id"] || "unknown";

    console.log(
      `✅ Welcome email sent successfully to ${data.adminEmail} (ID: ${messageId})`
    );
    return { success: true, messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Generate HTML email content
 */
function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  const {
    organizationName,
    adminName,
    adminEmail,
    temporaryPassword,
    loginUrl
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${organizationName}</title>
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
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            border-radius: 12px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        .title {
            color: #1f2937;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin: 8px 0 0;
        }
        .content {
            margin: 30px 0;
        }
        .credentials-box {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            margin: 10px 0;
        }
        .credential-label {
            font-weight: 600;
            color: #374151;
            display: inline-block;
            width: 80px;
        }
        .credential-value {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: white;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            color: #1f2937;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background: linear-gradient(135deg, #6d28d9, #9333ea);
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 5px;
        }
        .warning-text {
            color: #b45309;
            font-size: 14px;
        }
        .next-steps {
            background: #ecfdf5;
            border: 1px solid #10b981;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .next-steps-title {
            font-weight: 600;
            color: #047857;
            margin-bottom: 10px;
        }
        .next-steps ul {
            margin: 0;
            padding-left: 20px;
            color: #065f46;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
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
            <div class="logo">PMS</div>
            <h1 class="title">Welcome to ${organizationName}!</h1>
            <p class="subtitle">Your organization admin account has been created</p>
        </div>

        <div class="content">
            <p>Hello ${adminName},</p>
            
            <p>Congratulations! Your organization <strong>${organizationName}</strong> has been successfully set up in our Property Management System. You have been designated as the Organization Administrator with full access to manage your properties, users, and system settings.</p>

            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #374151;">Your Login Credentials</h3>
                <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <code class="credential-value">${adminEmail}</code>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Password:</span>
                    <code class="credential-value">${temporaryPassword}</code>
                </div>
            </div>

            <div class="warning">
                <div class="warning-title">🔒 Security Notice</div>
                <div class="warning-text">
                    This is a temporary password. You will be required to change it on your first login for security purposes. Please keep this email secure and delete it after changing your password.
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Login to Your Account</a>
            </div>

            <div class="next-steps">
                <div class="next-steps-title">🚀 Next Steps</div>
                <ul>
                    <li>Log in using the credentials above</li>
                    <li>Change your temporary password</li>
                    <li>Complete your profile information</li>
                    <li>Set up your first property</li>
                    <li>Invite team members to join your organization</li>
                    <li>Explore the dashboard and available features</li>
                </ul>
            </div>

            <p>If you have any questions or need assistance getting started, please don't hesitate to contact our support team.</p>

            <p>Welcome aboard!</p>
            <p><strong>The PMS Team</strong></p>
        </div>

        <div class="footer">
            <p>This email was sent to ${adminEmail} because an admin account was created for ${organizationName}.</p>
            <p>If you did not expect this email, please contact our support team immediately.</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content
 */
function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const {
    organizationName,
    adminName,
    adminEmail,
    temporaryPassword,
    loginUrl
  } = data;

  return `
Welcome to ${organizationName}!

Hello ${adminName},

Congratulations! Your organization "${organizationName}" has been successfully set up in our Property Management System. You have been designated as the Organization Administrator with full access to manage your properties, users, and system settings.

YOUR LOGIN CREDENTIALS:
Email: ${adminEmail}
Temporary Password: ${temporaryPassword}

SECURITY NOTICE:
This is a temporary password. You will be required to change it on your first login for security purposes. Please keep this email secure and delete it after changing your password.

LOGIN URL: ${loginUrl}

NEXT STEPS:
1. Log in using the credentials above
2. Change your temporary password
3. Complete your profile information
4. Set up your first property
5. Invite team members to join your organization
6. Explore the dashboard and available features

If you have any questions or need assistance getting started, please don't hesitate to contact our support team.

Welcome aboard!
The PMS Team

---
This email was sent to ${adminEmail} because an admin account was created for ${organizationName}.
If you did not expect this email, please contact our support team immediately.
  `;
}
