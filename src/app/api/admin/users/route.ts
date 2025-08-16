// File: src/app/api/admin/users/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PropertyRole } from "@prisma/client";

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
    const whereClause = {
      organizationId: orgId,
      ...(roleFilter && { role: roleFilter as UserRole })
    };

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
            name: true
          }
        }
      }
    });

    // Group property assignments by user
    interface PropertyAssignment {
      propertyId: string;
      propertyName: string;
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
    return new NextResponse("Internal Server Error", { status: 500 });
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

    // Only SUPER_ADMIN and ORG_ADMIN can create users directly
    const allowedCreateRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ORG_ADMIN
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

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    const {
      email,
      name,
      phone,
      organizationRole,
      propertyAssignments = []
    } = await req.json();

    // Validate required fields
    if (!email || !name || !phone || !organizationRole) {
      return NextResponse.json(
        { error: "Email, name, phone, and organization role are required" },
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
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

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        phone
      },
      update: {
        name,
        phone
      }
    });

    // Create organization membership
    const userOrg = await prisma.userOrg.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: organizationRole
      }
    });

    // Create property assignments if provided
    if (propertyAssignments.length > 0) {
      interface PropertyAssignmentInput {
        propertyId: string;
        role: PropertyRole;
        shift?: string | null;
      }

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
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          organizationRole: userOrg.role
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
