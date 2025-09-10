// File: src/app/api/debug/reservations/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { validatePropertyAccess, getPropertyIdFromRequest } from "@/lib/property-context";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 DEBUG: Starting reservation debug check");
    
    // Check session
    const session = await getServerSession(authOptions);
    console.log("🔍 DEBUG: Session exists:", !!session);
    console.log("🔍 DEBUG: User ID:", session?.user?.id);
    console.log("🔍 DEBUG: User email:", session?.user?.email);
    console.log("🔍 DEBUG: Current property ID:", session?.user?.currentPropertyId);
    
    // Check property ID from request
    const propertyIdFromRequest = getPropertyIdFromRequest(req);
    console.log("🔍 DEBUG: Property ID from request:", propertyIdFromRequest);
    
    // Check cookies
    const cookieHeader = req.headers.get("cookie");
    console.log("🔍 DEBUG: Cookie header:", cookieHeader);
    
    // Parse cookies manually
    let propertyIdCookie = null;
    let orgIdCookie = null;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      const propertyIdCookieEntry = cookies.find((c) => c.startsWith("propertyId="));
      const orgIdCookieEntry = cookies.find((c) => c.startsWith("orgId="));
      
      if (propertyIdCookieEntry) {
        propertyIdCookie = propertyIdCookieEntry.split("=")[1];
      }
      if (orgIdCookieEntry) {
        orgIdCookie = orgIdCookieEntry.split("=")[1];
      }
    }
    
    console.log("🔍 DEBUG: Property ID from cookie:", propertyIdCookie);
    console.log("🔍 DEBUG: Org ID from cookie:", orgIdCookie);
    
    // Test property access validation
    const validation = await validatePropertyAccess(req);
    console.log("🔍 DEBUG: Property validation result:", validation);
    
    if (!validation.success) {
      return NextResponse.json({
        error: "Property validation failed",
        debug: {
          session: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          sessionPropertyId: session?.user?.currentPropertyId,
          requestPropertyId: propertyIdFromRequest,
          cookiePropertyId: propertyIdCookie,
          orgIdCookie: orgIdCookie,
          validationError: validation.error,
          cookies: cookieHeader
        }
      }, { status: 400 });
    }
    
    const { propertyId } = validation;
    console.log("🔍 DEBUG: Validated property ID:", propertyId);
    
    // Try to fetch reservations directly
    const reservations = await prisma.reservation.findMany({
      where: {
        propertyId: propertyId
      },
      select: {
        id: true,
        guestName: true,
        checkIn: true,
        checkOut: true,
        status: true,
        propertyId: true,
        organizationId: true,
        roomId: true
      },
      take: 5 // Just get 5 for debugging
    });
    
    console.log("🔍 DEBUG: Found reservations:", reservations.length);
    
    // Also check if there are ANY reservations in the database
    const totalReservations = await prisma.reservation.count();
    console.log("🔍 DEBUG: Total reservations in database:", totalReservations);
    
    // Check reservations for this specific property
    const propertyReservations = await prisma.reservation.count({
      where: { propertyId: propertyId }
    });
    console.log("🔍 DEBUG: Reservations for this property:", propertyReservations);
    
    return NextResponse.json({
      success: true,
      debug: {
        session: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionPropertyId: session?.user?.currentPropertyId,
        requestPropertyId: propertyIdFromRequest,
        cookiePropertyId: propertyIdCookie,
        orgIdCookie: orgIdCookie,
        validatedPropertyId: propertyId,
        reservationsFound: reservations.length,
        totalReservationsInDB: totalReservations,
        propertyReservationsCount: propertyReservations,
        cookies: cookieHeader
      },
      reservations: reservations
    });
    
  } catch (error) {
    console.error("🔍 DEBUG: Error in debug route:", error);
    return NextResponse.json({
      error: "Debug route failed",
      message: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
