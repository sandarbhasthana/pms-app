// File: src/app/api/admin/test-email/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendInvitationEmail, testEmailConfiguration } from "@/lib/email";

/**
 * POST /api/admin/test-email
 * Test email service configuration and send a test invitation email
 * Access: SUPER_ADMIN, ORG_ADMIN only (for testing purposes)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    // Only allow SUPER_ADMIN and ORG_ADMIN to test emails
    if (
      !session?.user ||
      !role ||
      !["SUPER_ADMIN", "ORG_ADMIN"].includes(role)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    const { testEmail, testType = "config" } = await req.json();

    if (testType === "config") {
      // Test email configuration only
      const configResult = await testEmailConfiguration();

      return NextResponse.json({
        success: configResult.success,
        message: configResult.success
          ? "Email service configuration is valid"
          : "Email service configuration failed",
        error: configResult.error
      });
    }

    if (testType === "send") {
      // Send a test invitation email
      if (!testEmail) {
        return NextResponse.json(
          { error: "Test email address is required for send test" },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Create test invitation data
      const testInvitationData = {
        email: testEmail,
        phone: "+1 (555) 123-4567",
        organizationName: "Test Organization",
        organizationRole: "PROPERTY_MGR",
        propertyName: "Test Property",
        propertyRole: "FRONT_DESK",
        shift: "MORNING",
        inviterName: session.user.name || "Test Administrator",
        inviterEmail: session.user.email || "admin@test.com",
        token: "test-token-" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        message:
          "This is a test invitation email sent from the PMS system. Please ignore this email if you received it by mistake."
      };

      const emailResult = await sendInvitationEmail(testInvitationData);

      return NextResponse.json({
        success: emailResult.success,
        message: emailResult.success
          ? `Test email sent successfully to ${testEmail}`
          : "Failed to send test email",
        messageId: emailResult.messageId,
        error: emailResult.error
      });
    }

    return NextResponse.json(
      { error: "Invalid test type. Use 'config' or 'send'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error testing email service:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * GET /api/admin/test-email
 * Get email service status and configuration info
 * Access: SUPER_ADMIN, ORG_ADMIN only
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    // Only allow SUPER_ADMIN and ORG_ADMIN to check email status
    if (
      !session?.user ||
      !role ||
      !["SUPER_ADMIN", "ORG_ADMIN"].includes(role)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    const configResult = await testEmailConfiguration();

    const status = {
      configured: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.EMAIL_FROM || "Not configured",
      emailReplyTo: process.env.EMAIL_REPLY_TO || "Not configured",
      baseUrl: process.env.NEXTAUTH_URL || "Not configured",
      serviceStatus: configResult.success ? "Ready" : "Error",
      error: configResult.error
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking email service status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
