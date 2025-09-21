// API endpoint for organization onboarding

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

import { completeOnboardingSchema } from "@/lib/validations/organization-onboarding";
import { ActivityTracker } from "@/lib/services/activity-tracker";
import { sendWelcomeEmail } from "@/lib/email/templates/org-admin-welcome";
import { generateSecurePassword } from "@/lib/utils/password-generator";

/**
 * POST /api/admin/organizations/onboard
 * Create a new organization with admin user
 * Access: SUPER_ADMIN only
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - SUPER_ADMIN access required" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = completeOnboardingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { organizationDetails, adminUserDetails } = validation.data;

    // Double-check domain availability
    const existingOrg = await prisma.organization.findUnique({
      where: { domain: organizationDetails.domain }
    });

    if (existingOrg) {
      return NextResponse.json(
        {
          success: false,
          error: "Domain already exists",
          details: `Domain "${organizationDetails.domain}" is already taken`
        },
        { status: 409 }
      );
    }

    // Double-check email availability
    const existingUser = await prisma.user.findUnique({
      where: { email: adminUserDetails.email }
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already exists",
          details: `Email "${adminUserDetails.email}" is already registered`
        },
        { status: 409 }
      );
    }

    // Generate secure temporary password
    const temporaryPassword = generateSecurePassword();
    const hashedPassword = await hash(temporaryPassword, 12);

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationDetails.name,
          domain: organizationDetails.domain,
          industry: organizationDetails.industry,
          size: organizationDetails.size,
          contactPhone: organizationDetails.contactInfo?.phone,
          contactAddress: organizationDetails.contactInfo?.address,
          isActive: true
        }
      });

      // 2. Create admin user
      const adminUser = await tx.user.create({
        data: {
          name: adminUserDetails.name,
          email: adminUserDetails.email,
          phone: adminUserDetails.phone,
          password: hashedPassword,
          isActive: true
        }
      });

      // 3. Create user-organization relationship
      await tx.userOrg.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: UserRole.ORG_ADMIN,
          isActive: true
        }
      });

      // 4. Create onboarding tracking record
      await tx.onboardingTracking.create({
        data: {
          organizationId: organization.id,
          orgDetailsCompleted: true,
          orgDetailsCompletedAt: new Date(),
          adminUserCompleted: true,
          adminUserCompletedAt: new Date(),
          reviewCompleted: true,
          reviewCompletedAt: new Date(),
          completedAt: new Date(),
          timeToComplete: 0 // Will be calculated by frontend
        }
      });

      return { organization, adminUser };
    });

    // 5. Track system activity
    await ActivityTracker.trackActivity("ORGANIZATION_CREATED", {
      organizationId: result.organization.id,
      metadata: {
        organizationName: result.organization.name,
        domain: result.organization.domain,
        industry: result.organization.industry,
        size: result.organization.size,
        adminUserEmail: result.adminUser.email,
        createdBy: session.user.id
      }
    });

    await ActivityTracker.trackActivity("USER_CREATED", {
      organizationId: result.organization.id,
      metadata: {
        userId: result.adminUser.id,
        userEmail: result.adminUser.email,
        userRole: UserRole.ORG_ADMIN,
        createdBy: session.user.id
      }
    });

    // 6. Send welcome email
    const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`;

    const emailResult = await sendWelcomeEmail({
      organizationName: result.organization.name,
      adminName: result.adminUser.name || "Admin User",
      adminEmail: result.adminUser.email,
      temporaryPassword,
      loginUrl,
      organizationId: result.organization.id
    });

    if (emailResult.success) {
      // Track email sent - using SYSTEM_MAINTENANCE as closest available type
      await ActivityTracker.trackActivity("SYSTEM_MAINTENANCE", {
        organizationId: result.organization.id,
        metadata: {
          action: "email_sent",
          emailType: "welcome_admin",
          recipient: result.adminUser.email,
          organizationName: result.organization.name,
          messageId: emailResult.messageId
        }
      });
    } else {
      console.error("Failed to send welcome email:", emailResult.error);

      // Track email failure but don't fail the entire request
      await ActivityTracker.trackActivity("SYSTEM_ERROR", {
        organizationId: result.organization.id,
        metadata: {
          action: "email_failed",
          emailType: "welcome_admin",
          recipient: result.adminUser.email,
          error: emailResult.error || "Unknown error"
        }
      });
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      data: {
        organizationId: result.organization.id,
        adminUserId: result.adminUser.id,
        organizationName: result.organization.name,
        adminEmail: result.adminUser.email,
        temporaryPassword, // Include in response for debugging (remove in production)
        loginUrl
      }
    });
  } catch (error) {
    console.error("Organization onboarding error:", error);

    // Track error
    try {
      await ActivityTracker.trackActivity("SYSTEM_ERROR", {
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    } catch (trackingError) {
      console.error("Failed to track error:", trackingError);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
