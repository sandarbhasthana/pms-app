// File: src/app/api/properties/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant";
import { getUserAvailableProperties } from "@/lib/session-utils";

/**
 * GET /api/properties
 * List properties accessible to the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get user's accessible properties from database (fresh data)
    const properties = await getUserAvailableProperties();
    console.log(
      "🔍 GET /api/properties - Fresh properties from DB:",
      properties
    );

    const response = NextResponse.json(properties);
    // Add cache-busting headers to ensure fresh data
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Create a new property (ORG_ADMIN only)
 */
export async function POST(req: NextRequest) {
  try {
    // Access control: only ORG_ADMIN can create properties
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

    const body = await req.json();
    const {
      name,
      address,
      phone,
      email,
      timezone,
      currency,
      isActive,
      // Note: Additional form fields like city, state, zipCode, country, website, description
      // are not stored in the current database schema but could be added to address field
      city,
      state,
      zipCode,
      country
      //website: _website, // Not stored in current schema
      //description: _description // Not stored in current schema
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Property name is required" },
        { status: 400 }
      );
    }

    // Create property within organization context
    const property = await withTenantContext(orgId, async (tx) => {
      // Check if property name already exists in organization
      const existingProperty = await tx.property.findFirst({
        where: {
          organizationId: orgId,
          name: name
        }
      });

      if (existingProperty) {
        throw new Error("Property name already exists in this organization");
      }

      // Create the property
      // Combine address fields into a single address string
      const fullAddress = [address, city, state, zipCode, country]
        .filter(Boolean)
        .join(", ");

      return await tx.property.create({
        data: {
          organizationId: orgId,
          name,
          address: fullAddress || address || null,
          phone: phone || null,
          email: email || null,
          timezone: timezone || "UTC",
          currency: currency || "USD",
          isActive: isActive !== undefined ? isActive : true,
          isDefault: false // New properties are not default by default
        }
      });
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
