// File: src/app/api/admin/users/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PropertyRole, ShiftType } from "@prisma/client";

/**
 * GET /api/admin/users/[id]
 * Get specific user details with property assignments
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params;
    
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    
    if (!session?.user || !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(role)) {
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

    // Get user with organization membership
    const userOrg = await prisma.userOrg.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
      }
    });

    if (!userOrg) {
      return new NextResponse("User not found in organization", { status: 404 });
    }

    // Get property assignments
    const propertyAssignments = await prisma.userProperty.findMany({
      where: {
        userId
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        }
      }
    });

    // Filter property assignments to only include properties in the current organization
    const orgPropertyAssignments = propertyAssignments.filter(
      assignment => assignment.property.organizationId === orgId
    );

    const formattedUser = {
      id: userOrg.user.id,
      name: userOrg.user.name,
      email: userOrg.user.email,
      phone: userOrg.user.phone,
      image: userOrg.user.image,
      organizationRole: userOrg.role,
      propertyAssignments: orgPropertyAssignments.map(assignment => ({
        propertyId: assignment.propertyId,
        propertyName: assignment.property.name,
        role: assignment.role,
        shift: assignment.shift,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
      })),
      createdAt: userOrg.createdAt,
      updatedAt: userOrg.user.updatedAt
    };

    return NextResponse.json(formattedUser);

  } catch (error) {
    console.error("Error fetching user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user details, role, and property assignments
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR (with role hierarchy restrictions)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params;
    
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role;
    
    if (!session?.user || !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(userRole)) {
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
      name, 
      phone, 
      organizationRole, 
      propertyAssignments = [] 
    } = await req.json();

    // Verify user exists in organization
    const existingUserOrg = await prisma.userOrg.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId
        }
      }
    });

    if (!existingUserOrg) {
      return new NextResponse("User not found in organization", { status: 404 });
    }

    // Role hierarchy validation if organizationRole is being updated
    if (organizationRole) {
      const roleHierarchy = {
        "SUPER_ADMIN": 5,
        "ORG_ADMIN": 4,
        "PROPERTY_MGR": 3,
        "FRONT_DESK": 2,
        "HOUSEKEEPING": 1,
        "MAINTENANCE": 1,
        "ACCOUNTANT": 2,
        "OWNER": 4,
        "IT_SUPPORT": 2
      };

      const updaterLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const newRoleLevel = roleHierarchy[organizationRole as keyof typeof roleHierarchy] || 0;
      const currentRoleLevel = roleHierarchy[existingUserOrg.role as keyof typeof roleHierarchy] || 0;

      // Check if updater can assign the new role
      if (updaterLevel < newRoleLevel) {
        return NextResponse.json(
          { error: "You cannot assign roles higher than your own" },
          { status: 403 }
        );
      }

      // Check if updater can modify the current user's role
      if (updaterLevel < currentRoleLevel) {
        return NextResponse.json(
          { error: "You cannot modify users with higher privileges than your own" },
          { status: 403 }
        );
      }

      // Validate organization role
      const validOrgRoles = Object.values(UserRole);
      if (!validOrgRoles.includes(organizationRole)) {
        return NextResponse.json(
          { error: `Invalid organization role. Must be one of: ${validOrgRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Update user basic info
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    // Update organization role if provided
    if (organizationRole) {
      await prisma.userOrg.update({
        where: {
          userId_organizationId: {
            userId,
            organizationId: orgId
          }
        },
        data: {
          role: organizationRole
        }
      });
    }

    // Update property assignments if provided
    if (propertyAssignments.length >= 0) {
      // Remove existing property assignments for this organization
      const orgProperties = await prisma.property.findMany({
        where: { organizationId: orgId },
        select: { id: true }
      });
      
      const orgPropertyIds = orgProperties.map(p => p.id);
      
      await prisma.userProperty.deleteMany({
        where: {
          userId,
          propertyId: { in: orgPropertyIds }
        }
      });

      // Create new property assignments
      if (propertyAssignments.length > 0) {
        const validAssignments = [];
        
        for (const assignment of propertyAssignments) {
          // Validate property exists in organization
          const property = await prisma.property.findFirst({
            where: {
              id: assignment.propertyId,
              organizationId: orgId
            }
          });

          if (!property) {
            return NextResponse.json(
              { error: `Property ${assignment.propertyId} not found or not accessible` },
              { status: 400 }
            );
          }

          // Validate property role
          const validPropertyRoles = Object.values(PropertyRole);
          if (!validPropertyRoles.includes(assignment.role)) {
            return NextResponse.json(
              { error: `Invalid property role: ${assignment.role}` },
              { status: 400 }
            );
          }

          // Validate shift if provided
          if (assignment.shift) {
            const validShifts = Object.values(ShiftType);
            if (!validShifts.includes(assignment.shift)) {
              return NextResponse.json(
                { error: `Invalid shift: ${assignment.shift}` },
                { status: 400 }
              );
            }
          }

          validAssignments.push({
            userId,
            propertyId: assignment.propertyId,
            role: assignment.role,
            shift: assignment.shift || null
          });
        }

        if (validAssignments.length > 0) {
          await prisma.userProperty.createMany({
            data: validAssignments,
            skipDuplicates: true
          });
        }
      }
    }

    return NextResponse.json({
      message: "User updated successfully"
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Remove user from organization (soft delete - removes organization membership)
 * Access: SUPER_ADMIN, ORG_ADMIN
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params;
    
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role;
    
    // Only SUPER_ADMIN and ORG_ADMIN can remove users
    if (!session?.user || !["SUPER_ADMIN", "ORG_ADMIN"].includes(userRole)) {
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

    // Verify user exists in organization
    const userOrg = await prisma.userOrg.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId
        }
      }
    });

    if (!userOrg) {
      return new NextResponse("User not found in organization", { status: 404 });
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    // Role hierarchy check - can't remove users with higher or equal privileges
    const roleHierarchy = {
      "SUPER_ADMIN": 5,
      "ORG_ADMIN": 4,
      "PROPERTY_MGR": 3,
      "FRONT_DESK": 2,
      "HOUSEKEEPING": 1,
      "MAINTENANCE": 1,
      "ACCOUNTANT": 2,
      "OWNER": 4,
      "IT_SUPPORT": 2
    };

    const removerLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const targetLevel = roleHierarchy[userOrg.role as keyof typeof roleHierarchy] || 0;

    if (removerLevel <= targetLevel && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You cannot remove users with equal or higher privileges" },
        { status: 403 }
      );
    }

    // Remove property assignments for this organization
    const orgProperties = await prisma.property.findMany({
      where: { organizationId: orgId },
      select: { id: true }
    });
    
    const orgPropertyIds = orgProperties.map(p => p.id);
    
    await prisma.userProperty.deleteMany({
      where: {
        userId,
        propertyId: { in: orgPropertyIds }
      }
    });

    // Remove organization membership
    await prisma.userOrg.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId
        }
      }
    });

    return NextResponse.json({
      message: "User removed from organization successfully"
    });

  } catch (error) {
    console.error("Error removing user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
