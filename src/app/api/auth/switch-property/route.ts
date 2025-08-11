// File: src/app/api/auth/switch-property/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPropertyAccess } from "@/lib/property-context";

/**
 * POST /api/auth/switch-property
 * Switch user's current property context
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { propertyId } = await req.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this property
    const hasAccess = await hasPropertyAccess(session.user.id, propertyId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this property" },
        { status: 403 }
      );
    }

    // Find the property in user's available properties
    const targetProperty = session.user.availableProperties?.find(
      (p) => p.id === propertyId
    );

    if (!targetProperty) {
      return NextResponse.json(
        { error: "Property not found in your available properties" },
        { status: 404 }
      );
    }

    // Note: The actual session update will be handled by NextAuth's session callback
    // when the client calls update() with the new propertyId
    return NextResponse.json({
      success: true,
      message: "Property switch validated",
      property: targetProperty
    });
  } catch (error) {
    console.error("POST /api/auth/switch-property error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/switch-property
 * Get user's current property context and available properties
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the actual property ID from request (cookie/header/query)
    const { getPropertyIdFromRequest } = await import("@/lib/property-context");
    const actualPropertyId = getPropertyIdFromRequest(req);

    return NextResponse.json({
      currentPropertyId: actualPropertyId || session.user.currentPropertyId,
      sessionPropertyId: session.user.currentPropertyId,
      cookiePropertyId: actualPropertyId,
      availableProperties: session.user.availableProperties || [],
      defaultProperty: session.user.defaultProperty
    });
  } catch (error) {
    console.error("GET /api/auth/switch-property error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
