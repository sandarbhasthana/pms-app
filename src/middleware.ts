// File: middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Simulated org lookup table (replace with fetch or internal cache later)
const ORG_DOMAINS: Record<string, string> = {
  acme: "org_acme_id",
  demo: "org_demo_id",
  test: "org_test_id"
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];
  const pathname = req.nextUrl.pathname;

  // Handle authentication-based redirects
  if (pathname === "/dashboard") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (token) {
      // SUPER_ADMIN goes to platform dashboard
      if (token.role === "SUPER_ADMIN" || !token.orgId) {
        return NextResponse.redirect(new URL("/admin/organizations", req.url));
      }
      // Regular users go to organization selection or their org dashboard
      else {
        return NextResponse.redirect(
          new URL("/onboarding/select-organization", req.url)
        );
      }
    }
    // Not authenticated, redirect to signin
    else {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  }

  // Handle subdomain-based organization routing
  if (
    ["localhost", "www", "pms-app"].includes(subdomain) ||
    host.includes("localhost:") ||
    host.includes("vercel.app") // Allow all Vercel deployment URLs
  ) {
    return NextResponse.next();
  }

  const orgId = ORG_DOMAINS[subdomain];

  if (!orgId) {
    return new NextResponse("Organization not found", { status: 404 });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-organization-id", orgId);

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  response.cookies.set("orgId", orgId, { path: "/" });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
