// File: src/app/api/user-properties/bulk/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/user-properties/bulk
 * Create multiple user-property assignments (ORG_ADMIN only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session?.user || role !== "ORG_ADMIN") {
      return new NextResponse("Forbidden - ORG_ADMIN required", {
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

    const { assignments } = await req.json();

    // Validate input
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "assignments array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate each assignment
    const validRoles = [
      "PROPERTY_MGR",
      "FRONT_DESK",
      "HOUSEKEEPING",
      "MAINTENANCE"
    ];
    for (const assignment of assignments) {
      if (!assignment.userId || !assignment.propertyId || !assignment.role) {
        return NextResponse.json(
          { error: "Each assignment must have userId, propertyId, and role" },
          { status: 400 }
        );
      }

      if (!validRoles.includes(assignment.role)) {
        return NextResponse.json(
          {
            error: `Invalid role: ${
              assignment.role
            }. Must be one of: ${validRoles.join(", ")}`
          },
          { status: 400 }
        );
      }
    }

    // Verify all users exist and belong to organization
    const userIds = [...new Set(assignments.map((a) => a.userId))];
    const users = await prisma.userOrg.findMany({
      where: {
        userId: { in: userIds },
        organizationId: orgId
      }
    });

    if (users.length !== userIds.length) {
      const foundUserIds = users.map((u) => u.userId);
      const missingUserIds = userIds.filter((id) => !foundUserIds.includes(id));
      return NextResponse.json(
        {
          error: `Users not found in organization: ${missingUserIds.join(", ")}`
        },
        { status: 404 }
      );
    }

    // Verify all properties exist and belong to organization
    const propertyIds = [...new Set(assignments.map((a) => a.propertyId))];
    const properties = await prisma.property.findMany({
      where: {
        id: { in: propertyIds },
        organizationId: orgId
      }
    });

    if (properties.length !== propertyIds.length) {
      const foundPropertyIds = properties.map((p) => p.id);
      const missingPropertyIds = propertyIds.filter(
        (id) => !foundPropertyIds.includes(id)
      );
      return NextResponse.json(
        {
          error: `Properties not found in organization: ${missingPropertyIds.join(
            ", "
          )}`
        },
        { status: 404 }
      );
    }

    // Check for existing assignments
    const existingAssignments = await prisma.userProperty.findMany({
      where: {
        OR: assignments.map((a) => ({
          userId: a.userId,
          propertyId: a.propertyId
        }))
      }
    });

    if (existingAssignments.length > 0) {
      const conflicts = existingAssignments.map(
        (a) => `${a.userId}-${a.propertyId}`
      );
      return NextResponse.json(
        {
          error: "Some user-property assignments already exist",
          conflicts: conflicts
        },
        { status: 409 }
      );
    }

    // Create all assignments in a transaction
    const createdAssignments = await prisma.$transaction(
      assignments.map((assignment) =>
        prisma.userProperty.create({
          data: {
            userId: assignment.userId,
            propertyId: assignment.propertyId,
            role: assignment.role
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            property: {
              select: {
                id: true,
                name: true,
                isDefault: true,
                isActive: true
              }
            }
          }
        })
      )
    );

    return NextResponse.json(
      {
        message: `Successfully created ${createdAssignments.length} user-property assignments`,
        assignments: createdAssignments
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/user-properties/bulk error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-properties/bulk
 * Remove multiple user-property assignments (ORG_ADMIN only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session?.user || role !== "ORG_ADMIN") {
      return new NextResponse("Forbidden - ORG_ADMIN required", {
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

    const { assignmentIds } = await req.json();

    // Validate input
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return NextResponse.json(
        { error: "assignmentIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Verify all assignments exist and belong to this organization
    const assignments = await prisma.userProperty.findMany({
      where: {
        id: { in: assignmentIds },
        property: {
          organizationId: orgId
        }
      }
    });

    if (assignments.length !== assignmentIds.length) {
      const foundIds = assignments.map((a) => a.id);
      const missingIds = assignmentIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Assignments not found: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    // Delete all assignments in a transaction
    const deleteResult = await prisma.userProperty.deleteMany({
      where: {
        id: { in: assignmentIds }
      }
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} user-property assignments`,
      deletedCount: deleteResult.count
    });
  } catch (error) {
    console.error("DELETE /api/user-properties/bulk error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
