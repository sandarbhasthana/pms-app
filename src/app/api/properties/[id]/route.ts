// File: src/app/api/properties/[id]/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPropertyAccess } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/properties/[id]
 * Get specific property details
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const propertyId = id;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has access to this property
    const hasAccess = await hasPropertyAccess(session.user.id, propertyId);
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        organization: {
          select: { id: true, name: true, domain: true }
        },
        _count: {
          select: {
            roomTypes: true,
            rooms: true,
            reservations: true,
            userProperties: true
          }
        }
      }
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error(`GET /api/properties/${propertyId} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/properties/[id]
 * Update property details (ORG_ADMIN only)
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const propertyId = id;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session?.user || role !== "ORG_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - ORG_ADMIN required" },
        { status: 403 }
      );
    }

    // Check if user has access to this property
    const hasAccess = await hasPropertyAccess(session.user.id, propertyId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - You don't have access to this property" },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log(`🔍 PUT /api/properties/${propertyId} - Request body:`, body);

    const {
      name,
      phone,
      email,
      timezone,
      currency,
      isActive,
      // Address components
      suite,
      street,
      city,
      state,
      zipCode,
      country
      // website, // Not stored in current schema
      // description // Not stored in current schema
    } = body;

    console.log(`🔍 Extracted name field: "${name}"`);
    console.log(`🔍 Property ID to update: ${propertyId}`);

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Property name is required" },
        { status: 400 }
      );
    }

    // Get current property to check organization
    const currentProperty = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!currentProperty) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Check if name conflicts with other properties in same organization
    const existingProperty = await prisma.property.findFirst({
      where: {
        organizationId: currentProperty.organizationId,
        name: name,
        id: { not: propertyId } // Exclude current property
      }
    });

    if (existingProperty) {
      return NextResponse.json(
        { error: "Property name already exists in this organization" },
        { status: 400 }
      );
    }

    // Update property with separate address fields
    // Format: Apt/Suite #, Street, City, State, Zip, Country
    const fullAddress = [suite, street, city, state, zipCode, country]
      .filter(Boolean)
      .join(", ");

    const updateData = {
      name,
      suite: suite || null,
      street: street || null,
      city: city || null,
      state: state || null,
      zipCode: zipCode || null,
      country: country || null,
      address: fullAddress || null, // Keep for backward compatibility
      phone: phone || null,
      email: email || null,
      timezone: timezone || "UTC",
      currency: currency || "USD",
      isActive: isActive !== undefined ? isActive : true
    };

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: updateData
    });

    const response = NextResponse.json(updatedProperty);
    // Add cache-busting headers to ensure fresh data
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error(`PUT /api/properties/${propertyId} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/properties/[id]
 * Partially update property (e.g., businessRulesEnabled)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const propertyId = id;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has access to this property
    const hasAccess = await hasPropertyAccess(session.user.id, propertyId);
    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { businessRulesEnabled } = body;

    // Update only the fields provided
    const updateData: Record<string, unknown> = {};
    if (businessRulesEnabled !== undefined) {
      updateData.businessRulesEnabled = businessRulesEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: updateData
    });

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error(`PATCH /api/properties/${propertyId} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/properties/[id]
 * Delete property (ORG_ADMIN only, cannot delete default property)
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const propertyId = id;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session?.user || role !== "ORG_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - ORG_ADMIN required" },
        { status: 403 }
      );
    }

    // Check if user has access to this property
    const hasAccess = await hasPropertyAccess(session.user.id, propertyId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden - You don't have access to this property" },
        { status: 403 }
      );
    }

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        _count: {
          select: {
            roomTypes: true,
            rooms: true,
            reservations: true
          }
        }
      }
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Cannot delete default property
    if (property.isDefault) {
      return NextResponse.json(
        {
          error:
            "Cannot delete default property. Set another property as default first."
        },
        { status: 400 }
      );
    }

    // Cannot delete property with existing data
    if (
      property._count.roomTypes > 0 ||
      property._count.rooms > 0 ||
      property._count.reservations > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete property with existing room types, rooms, or reservations"
        },
        { status: 400 }
      );
    }

    // Delete property
    await prisma.property.delete({
      where: { id: propertyId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`DELETE /api/properties/${propertyId} error:`, error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
