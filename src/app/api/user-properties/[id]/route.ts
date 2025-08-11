// File: src/app/api/user-properties/[id]/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user-properties/[id]
 * Get specific user-property assignment details (ORG_ADMIN only)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const userProperty = await prisma.userProperty.findFirst({
      where: {
        id: (await context.params).id,
        property: {
          organizationId: orgId
        }
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
            address: true,
            isDefault: true,
            isActive: true
          }
        }
      }
    });

    if (!userProperty) {
      return new NextResponse("User-property assignment not found", {
        status: 404
      });
    }

    return NextResponse.json(userProperty);
  } catch (error) {
    console.error(
      `GET /api/user-properties/${(await context.params).id} error:`,
      error
    );
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-properties/[id]
 * Update user-property assignment role (ORG_ADMIN only)
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { role: newRole } = await req.json();

    // Validate role
    const validRoles = [
      "PROPERTY_MGR",
      "FRONT_DESK",
      "HOUSEKEEPING",
      "MAINTENANCE"
    ];
    if (!newRole || !validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify the assignment exists and belongs to this organization
    const existingAssignment = await prisma.userProperty.findFirst({
      where: {
        id: (await context.params).id,
        property: {
          organizationId: orgId
        }
      }
    });

    if (!existingAssignment) {
      return new NextResponse("User-property assignment not found", {
        status: 404
      });
    }

    // Update the assignment
    const updatedAssignment = await prisma.userProperty.update({
      where: {
        id: (await context.params).id
      },
      data: {
        role: newRole
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
            address: true,
            isDefault: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error(
      `PUT /api/user-properties/${(await context.params).id} error:`,
      error
    );
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-properties/[id]
 * Delete user-property assignment (ORG_ADMIN only)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Verify the assignment exists and belongs to this organization
    const assignment = await prisma.userProperty.findFirst({
      where: {
        id: (await context.params).id,
        property: {
          organizationId: orgId
        }
      }
    });

    if (!assignment) {
      return new NextResponse("User-property assignment not found", {
        status: 404
      });
    }

    // Delete the assignment
    await prisma.userProperty.delete({
      where: {
        id: (await context.params).id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(
      `DELETE /api/user-properties/${(await context.params).id} error:`,
      error
    );
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
