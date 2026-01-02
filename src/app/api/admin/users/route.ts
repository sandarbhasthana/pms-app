// File: src/app/api/admin/users/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PropertyRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { sendStaffWelcomeEmail } from "@/lib/email/templates/staff-welcome";

/**
 * GET /api/admin/users
 * List all users in organization with their roles and property assignments
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    // Check if user has permission to manage users
    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ORG_ADMIN,
      UserRole.PROPERTY_MGR
    ];
    if (!session?.user || !role || !allowedRoles.includes(role as UserRole)) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    console.log("🔍 GET /api/admin/users - orgIdHeader:", orgIdHeader);
    console.log("🔍 GET /api/admin/users - orgIdCookie:", orgIdCookie);
    console.log("🔍 GET /api/admin/users - final orgId:", orgId);

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Get query parameters for filtering
    const url = new URL(req.url);
    const roleFilter = url.searchParams.get("role");
    const propertyFilter = url.searchParams.get("propertyId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build where clause for filtering
    // Exclude SUPER_ADMIN users from organization staff list (they are system-level, not org staff)
    const whereClause = {
      organizationId: orgId,
      role: roleFilter
        ? (roleFilter as UserRole)
        : { not: UserRole.SUPER_ADMIN }
    };

    console.log("🔍 GET /api/admin/users - whereClause:", whereClause);

    // Get users with their organization membership and property assignments
    const users = await prisma.userOrg.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            updatedAt: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: offset,
      take: limit
    });

    console.log("📊 GET /api/admin/users - Found users:", users.length);

    // Get property assignments for each user
    const userIds = users.map((u) => u.user.id);
    const propertyAssignments = await prisma.userProperty.findMany({
      where: {
        userId: { in: userIds },
        ...(propertyFilter && { propertyId: propertyFilter })
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            shortName: true,
            settings: {
              select: {
                propertyType: true
              }
            }
          }
        }
      }
    });

    // Group property assignments by user
    interface PropertyAssignment {
      propertyId: string;
      propertyName: string;
      propertyShortName: string | null;
      propertyType: string | null;
      role: PropertyRole;
      shift: string | null;
      createdAt: Date;
    }

    const propertyAssignmentsByUser = propertyAssignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.userId]) {
          acc[assignment.userId] = [];
        }
        acc[assignment.userId].push({
          propertyId: assignment.propertyId,
          propertyName: assignment.property.name,
          propertyShortName: assignment.property.shortName,
          propertyType: assignment.property.settings?.propertyType || null,
          role: assignment.role,
          shift: assignment.shift,
          createdAt: assignment.createdAt
        });
        return acc;
      },
      {} as Record<string, PropertyAssignment[]>
    );

    // Format response
    const formattedUsers = users.map((userOrg) => ({
      id: userOrg.user.id,
      name: userOrg.user.name,
      email: userOrg.user.email,
      phone: "", // TODO: Add phone field to User model
      image: userOrg.user.image,
      organizationRole: userOrg.role,
      propertyAssignments: propertyAssignmentsByUser[userOrg.user.id] || [],
      createdAt: userOrg.createdAt,
      updatedAt: userOrg.user.updatedAt
    }));

    // Get total count for pagination
    const totalCount = await prisma.userOrg.count({
      where: whereClause
    });

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user (for internal use, typically called after invitation acceptance)
 * Access: SUPER_ADMIN, ORG_ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    // Allow SUPER_ADMIN, ORG_ADMIN, and PROPERTY_MGR to create users directly
    const allowedCreateRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ORG_ADMIN,
      UserRole.PROPERTY_MGR
    ];
    if (
      !session?.user ||
      !role ||
      !allowedCreateRoles.includes(role as UserRole)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie (same as GET endpoint)
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    console.log("🆕 POST /api/admin/users - orgIdHeader:", orgIdHeader);
    console.log("🆕 POST /api/admin/users - orgIdCookie:", orgIdCookie);
    console.log("🆕 POST /api/admin/users - final orgId:", orgId);

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    // Verify organization exists and user has access to it
    const userId = session.user.id;
    const userOrgMembership = await prisma.userOrg.findUnique({
      where: {
        userId_organizationId: {
          userId: userId,
          organizationId: orgId
        }
      },
      include: {
        organization: true
      }
    });

    if (!userOrgMembership) {
      console.error("🚫 User not member of organization:", { userId, orgId });

      // Get user's actual organizations for helpful error message
      const userOrgs = await prisma.userOrg.findMany({
        where: { userId },
        include: { organization: { select: { id: true, name: true } } }
      });

      const orgNames = userOrgs.map((uo) => uo.organization.name).join(", ");

      return NextResponse.json(
        {
          error: "Organization access error",
          message: `You don't have access to this organization. Your organizations: ${
            orgNames || "None"
          }. Please log out and log back in to refresh your session.`
        },
        { status: 403 }
      );
    }

    const organization = userOrgMembership.organization;
    console.log("✅ Organization verified:", organization.name);

    const {
      email,
      name,
      phone,
      password,
      sendWelcomeEmail = true,
      organizationRole,
      propertyAssignments = []
    } = await req.json();

    // Validate required fields
    if (!email || !name || !phone || !password || !organizationRole) {
      return NextResponse.json(
        {
          error:
            "Email, name, phone, password, and organization role are required"
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Validate organization role
    const validOrgRoles = Object.values(UserRole);
    if (!validOrgRoles.includes(organizationRole)) {
      return NextResponse.json(
        {
          error: `Invalid organization role. Must be one of: ${validOrgRoles.join(
            ", "
          )}`
        },
        { status: 400 }
      );
    }

    // Check if user already exists (include password to check if they need one)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true }
    });

    if (existingUser) {
      // Check if user is already in this organization
      const existingMembership = await prisma.userOrg.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: orgId
          }
        }
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 409 }
        );
      }
    }

    // Hash the admin-provided password
    const hashedPassword = await hash(password, 12);
    console.log("🔐 Using admin-provided password for new user");

    // Get the current user's ID to track who created this user
    const createdByUserId = session.user.id;

    // Create or update user (with password for new users)
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        phone,
        password: hashedPassword,
        createdByUserId: createdByUserId // Track who created this user
      },
      update: {
        name,
        phone,
        // Update password if user exists but doesn't have one
        ...(existingUser && !existingUser.password
          ? { password: hashedPassword }
          : {})
      }
    });

    // Create organization membership
    console.log("✨ Creating UserOrg with:", {
      userId: user.id,
      organizationId: orgId,
      role: organizationRole
    });

    const newUserOrg = await prisma.userOrg.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: organizationRole
      }
    });

    console.log("✅ UserOrg created successfully:", {
      id: newUserOrg.id,
      userId: newUserOrg.userId,
      organizationId: newUserOrg.organizationId,
      role: newUserOrg.role
    });

    // Create property assignments if provided
    interface PropertyAssignmentInput {
      propertyId: string;
      role: PropertyRole;
      shift?: string | null;
    }

    let propertyAssignmentDetails: Array<{
      propertyName: string;
      role: string;
      shift?: string;
    }> = [];

    if (propertyAssignments.length > 0) {
      const propertyAssignmentData = propertyAssignments.map(
        (assignment: PropertyAssignmentInput) => ({
          userId: user.id,
          propertyId: assignment.propertyId,
          role: assignment.role,
          shift: assignment.shift || null
        })
      );

      await prisma.userProperty.createMany({
        data: propertyAssignmentData,
        skipDuplicates: true
      });

      // Get property names for email
      const propertyIds = propertyAssignments.map(
        (a: PropertyAssignmentInput) => a.propertyId
      );
      const properties = await prisma.property.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, name: true }
      });

      const propertyMap = new Map(properties.map((p) => [p.id, p.name]));
      propertyAssignmentDetails = propertyAssignments.map(
        (a: PropertyAssignmentInput) => ({
          propertyName: propertyMap.get(a.propertyId) || "Unknown Property",
          role: a.role,
          shift: a.shift || undefined
        })
      );
    }

    // Send welcome email with credentials (if requested)
    let emailSent = false;

    if (sendWelcomeEmail) {
      // Get the inviter's name
      const inviter = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true }
      });

      const loginUrl = `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/auth/signin`;

      const emailResult = await sendStaffWelcomeEmail({
        staffName: name,
        staffEmail: email,
        temporaryPassword: password, // Use admin-provided password
        organizationName: organization.name,
        organizationRole,
        propertyAssignments:
          propertyAssignmentDetails.length > 0
            ? propertyAssignmentDetails
            : undefined,
        loginUrl,
        inviterName: inviter?.name || undefined
      });

      if (!emailResult.success) {
        console.error(
          `⚠️ Failed to send welcome email to ${email}:`,
          emailResult.error
        );
        // Note: We don't fail the API call if email fails - user is still created
      } else {
        console.log(`✅ Welcome email sent to ${email}`);
        emailSent = true;
      }
    } else {
      console.log(`📧 Welcome email skipped for ${email} (admin opted out)`);
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        emailSent,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          organizationRole: newUserOrg.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
