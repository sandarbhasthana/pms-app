// File: src/app/api/auth/set-cookies/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to set orgId and propertyId cookies client-side
 * This is used as a workaround for middleware cookie setting issues
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const propertyId = searchParams.get("propertyId");
  const redirect = searchParams.get("redirect") || "/dashboard";

  console.log("🍪 Setting cookies via API:", { orgId, propertyId, redirect });

  if (!orgId || !propertyId) {
    return new NextResponse("Missing orgId or propertyId", { status: 400 });
  }

  // Create response with redirect
  const response = NextResponse.redirect(new URL(redirect, req.url));

  // Set cookies with proper options
  const cookieOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax" as const,
    httpOnly: false // Allow client-side access
  };

  response.cookies.set("orgId", orgId, cookieOptions);
  response.cookies.set("propertyId", propertyId, cookieOptions);

  console.log("✅ Cookies set, redirecting to:", redirect);

  return response;
}

