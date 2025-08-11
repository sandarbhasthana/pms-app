// File: src/app/api/user-properties/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user-properties
 * List user-property assignments (ORG_ADMIN only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session?.user || role !== "ORG_ADMIN") {
      return new NextResponse("Forbidden - ORG_ADMIN required", {
        status: 403
      });
    }

    const url = new URL(req.url);
    const propertyId = url.searchParams.get("propertyId");
    const userId = url.searchParams.get("userId");

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Build query filters
    const whereClause: {
      property: { organizationId: string };
      propertyId?: string;
      userId?: string;
    } = {
      property: {
        organizationId: orgId
      }
    };

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    const userProperties = await prisma.userProperty.findMany({
      where: whereClause,
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
      },
      orderBy: [{ property: { name: "asc" } }, { user: { name: "asc" } }]
    });

    return NextResponse.json(userProperties);
  } catch (error) {
    console.error("GET /api/user-properties error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-properties
 * Create user-property assignment (ORG_ADMIN only)
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

    const { userId, propertyId, role: userRole } = await req.json();

    // Validate required fields
    if (!userId || !propertyId || !userRole) {
      return NextResponse.json(
        { error: "userId, propertyId, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = [
      "PROPERTY_MGR",
      "FRONT_DESK",
      "HOUSEKEEPING",
      "MAINTENANCE"
    ];
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify user exists and belongs to organization
    const user = await prisma.userOrg.findFirst({
      where: {
        userId: userId,
        organizationId: orgId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in this organization" },
        { status: 404 }
      );
    }

    // Verify property exists and belongs to organization
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: orgId
      }
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found in this organization" },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userProperty.findFirst({
      where: {
        userId: userId,
        propertyId: propertyId
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "User is already assigned to this property" },
        { status: 409 }
      );
    }

    // Create the assignment
    const userProperty = await prisma.userProperty.create({
      data: {
        userId: userId,
        propertyId: propertyId,
        role: userRole
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
    });

    return NextResponse.json(userProperty, { status: 201 });
  } catch (error) {
    console.error("POST /api/user-properties error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-properties
 * Remove user-property assignment (ORG_ADMIN only)
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

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const propertyId = url.searchParams.get("propertyId");

    if (!userId || !propertyId) {
      return NextResponse.json(
        { error: "userId and propertyId are required" },
        { status: 400 }
      );
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
        userId: userId,
        propertyId: propertyId,
        property: {
          organizationId: orgId
        }
      }
    });

    if (!assignment) {
      return new NextResponse("Assignment not found", { status: 404 });
    }

    // Delete the assignment
    await prisma.userProperty.delete({
      where: {
        id: assignment.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/user-properties error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
