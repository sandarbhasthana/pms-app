// File: src/app/api/properties/[id]/set-default/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPropertyAccess } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/properties/[id]/set-default
 * Set property as default for the organization (ORG_ADMIN only)
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const propertyId = id;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session?.user || role !== "ORG_ADMIN") {
      return new NextResponse("Forbidden - ORG_ADMIN required", {
        status: 403
      });
    }

    // Check if user has access to this property
    const hasAccess = await hasPropertyAccess(session.user.id, propertyId);
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // First, unset current default property in the organization
      await tx.property.updateMany({
        where: {
          organizationId: property.organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      // Then set the new property as default
      const updatedProperty = await tx.property.update({
        where: { id: propertyId },
        data: {
          isDefault: true
        }
      });

      return updatedProperty;
    });

    return NextResponse.json({
      message: "Property set as default successfully",
      property: result
    });
  } catch (error) {
    console.error(
      `POST /api/properties/${propertyId}/set-default error:`,
      error
    );
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
