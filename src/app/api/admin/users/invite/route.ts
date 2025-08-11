// File: src/app/api/admin/users/invite/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PropertyRole, ShiftType } from "@prisma/client";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * POST /api/admin/users/invite
 * Send invitation to a new user with role and property assignments
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR (with role hierarchy restrictions)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role;

    // Check if user has permission to invite users
    if (
      !session?.user ||
      !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    const {
      email,
      phone,
      organizationRole,
      propertyId,
      propertyRole,
      shift,
      message
    } = await req.json();

    // Validate required fields
    if (!email || !phone || !organizationRole) {
      return NextResponse.json(
        { error: "Email, phone, and organization role are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Role hierarchy validation - users can only invite equal or lower roles
    const roleHierarchy = {
      SUPER_ADMIN: 5,
      ORG_ADMIN: 4,
      PROPERTY_MGR: 3,
      FRONT_DESK: 2,
      HOUSEKEEPING: 1,
      MAINTENANCE: 1,
      ACCOUNTANT: 2,
      OWNER: 4,
      IT_SUPPORT: 2
    };

    const inviterLevel =
      roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const inviteeLevel =
      roleHierarchy[organizationRole as keyof typeof roleHierarchy] || 0;

    if (inviterLevel < inviteeLevel) {
      return NextResponse.json(
        {
          error: "You cannot invite users with higher privileges than your own"
        },
        { status: 403 }
      );
    }

    // Validate property role if provided
    if (propertyRole) {
      const validPropertyRoles = Object.values(PropertyRole);
      if (!validPropertyRoles.includes(propertyRole)) {
        return NextResponse.json(
          {
            error: `Invalid property role. Must be one of: ${validPropertyRoles.join(
              ", "
            )}`
          },
          { status: 400 }
        );
      }
    }

    // Validate shift if provided
    if (shift) {
      const validShifts = Object.values(ShiftType);
      if (!validShifts.includes(shift)) {
        return NextResponse.json(
          { error: `Invalid shift. Must be one of: ${validShifts.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate property exists if propertyId is provided
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          organizationId: orgId
        }
      });

      if (!property) {
        return NextResponse.json(
          { error: "Property not found or not accessible" },
          { status: 404 }
        );
      }
    }

    // Check if user already exists in the organization
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { organizationId: orgId }
        }
      }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitationToken.findFirst({
      where: {
        email,
        organizationId: orgId,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation token
    const invitation = await prisma.invitationToken.create({
      data: {
        email,
        phone,
        organizationId: orgId,
        role: organizationRole,
        propertyId: propertyId || null,
        propertyRole: propertyRole || null,
        shift: shift || null,
        token,
        expiresAt,
        createdBy: session.user.id
      },
      include: {
        organization: {
          select: {
            name: true
          }
        },
        property: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      email: invitation.email,
      phone: invitation.phone || "",
      organizationName: invitation.organization.name,
      organizationRole: invitation.role,
      propertyName: invitation.property?.name,
      propertyRole: invitation.propertyRole || undefined,
      shift: invitation.shift || undefined,
      inviterName: invitation.creator.name || "System Administrator",
      inviterEmail: invitation.creator.email,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      message: message || undefined
    });

    if (!emailResult.success) {
      console.error(
        `Failed to send invitation email to ${email}:`,
        emailResult.error
      );
      // Note: We don't fail the API call if email fails, just log it
      // The invitation is still created and can be resent later
    }

    return NextResponse.json(
      {
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          phone: invitation.phone,
          organizationRole: invitation.role,
          propertyRole: invitation.propertyRole,
          shift: invitation.shift,
          expiresAt: invitation.expiresAt,
          organizationName: invitation.organization.name,
          propertyName: invitation.property?.name
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * GET /api/admin/users/invite
 * List pending invitations
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (
      !session?.user ||
      !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(role)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending"; // pending, used, expired, all
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      organizationId: orgId
    };

    if (status === "pending") {
      whereClause.used = false;
      whereClause.expiresAt = { gt: new Date() };
    } else if (status === "used") {
      whereClause.used = true;
    } else if (status === "expired") {
      whereClause.used = false;
      whereClause.expiresAt = { lte: new Date() };
    }
    // "all" status doesn't add additional filters

    const invitations = await prisma.invitationToken.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            name: true
          }
        },
        property: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.invitationToken.count({
      where: whereClause
    });

    const formattedInvitations = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      phone: inv.phone,
      organizationRole: inv.role,
      propertyRole: inv.propertyRole,
      shift: inv.shift,
      status: inv.used
        ? "used"
        : inv.expiresAt < new Date()
        ? "expired"
        : "pending",
      organizationName: inv.organization.name,
      propertyName: inv.property?.name,
      createdBy: inv.creator.name,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt
    }));

    return NextResponse.json({
      invitations: formattedInvitations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
