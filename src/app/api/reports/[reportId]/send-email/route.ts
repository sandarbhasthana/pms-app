/**
 * API Route: Send Report via Email
 * POST /api/reports/[reportId]/send-email
 *
 * Send report file to user's email
 */

import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant";
import { getReportDownloadUrl } from "@/lib/reports/s3-utils";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    // Get user session to get email
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 401 }
      );
    }

    // Parse request body to get email option
    const body = await req.json();
    const { emailOption, customEmail } = body;

    console.log("📧 Email request body:", { emailOption, customEmail });

    // Determine recipient email
    let recipientEmail = session.user.email;
    if (emailOption === "custom") {
      if (!customEmail) {
        return NextResponse.json(
          { error: "Custom email is required when emailOption is 'custom'" },
          { status: 400 }
        );
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customEmail)) {
        return NextResponse.json(
          { error: "Invalid email address format" },
          { status: 400 }
        );
      }
      recipientEmail = customEmail;
    }

    console.log("📧 Sending email to:", recipientEmail);

    const { reportId } = await params;

    return await withTenantContext(orgId, async (tx) => {
      // Fetch report from database
      const report = await tx.reportHistory.findFirst({
        where: {
          id: reportId,
          organizationId: orgId
        },
        select: {
          id: true,
          name: true,
          type: true,
          format: true,
          status: true,
          s3Key: true,
          expiresAt: true,
          generatedAt: true,
          property: {
            select: {
              name: true
            }
          }
        }
      });

      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      if (report.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "Report is not ready to send", status: report.status },
          { status: 400 }
        );
      }

      if (!report.s3Key) {
        return NextResponse.json(
          { error: "Report file not found" },
          { status: 404 }
        );
      }

      // Check if report has expired
      if (report.expiresAt && new Date(report.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Report has expired and been deleted" },
          { status: 410 } // 410 Gone
        );
      }

      // Generate presigned URL (valid for 7 days to match report expiry)
      const downloadUrl = await getReportDownloadUrl(report.s3Key, 604800); // 7 days in seconds

      // Format report type
      const reportType = report.type
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");

      // Format date
      const generatedDate = report.generatedAt
        ? new Date(report.generatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "N/A";

      // Send email
      const emailResult = await sendEmail({
        to: recipientEmail,
        subject: `Your ${reportType} Report is Ready`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7210a2;">Report Ready for Download</h2>
            
            <p>Hello ${session.user.name || "there"},</p>
            
            <p>Your requested report is ready for download.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Report Type:</strong> ${reportType}</p>
              <p style="margin: 5px 0;"><strong>Format:</strong> ${
                report.format
              }</p>
              ${
                report.property
                  ? `<p style="margin: 5px 0;"><strong>Property:</strong> ${report.property.name}</p>`
                  : ""
              }
              <p style="margin: 5px 0;"><strong>Generated:</strong> ${generatedDate}</p>
            </div>
            
            <p>
              <a href="${downloadUrl}" 
                 style="display: inline-block; background-color: #7210a2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Download Report
              </a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Note:</strong> This download link will expire in 7 days. The report will be automatically deleted from our servers after this period.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              This is an automated email from your Property Management System. Please do not reply to this email.
            </p>
          </div>
        `
      });

      // Check if email was sent successfully
      if (!emailResult.success) {
        console.error("Failed to send email:", emailResult.error);

        // Provide helpful error messages
        let errorMessage = emailResult.error || "Failed to send email";
        let errorDetails = emailResult.error;

        if (emailResult.error === "Email service not configured") {
          errorDetails =
            "Please configure SENDGRID_API_KEY in environment variables";
        } else if (
          emailResult.error?.includes("API key is invalid") ||
          emailResult.error?.includes("SendGrid Error")
        ) {
          errorMessage = "Email service configuration error";
          errorDetails = emailResult.error;
        }

        return NextResponse.json(
          {
            error: errorMessage,
            details: errorDetails
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Report sent to your email successfully",
        messageId: emailResult.messageId
      });
    });
  } catch (error) {
    console.error("Error sending report via email:", error);
    return NextResponse.json(
      {
        error: "Failed to send report via email",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
