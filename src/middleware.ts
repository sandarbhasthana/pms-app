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
      if (token.role === "SUPER_ADMIN") {
        console.log("🔄 Middleware: SUPER_ADMIN -> /admin/organizations");
        return NextResponse.redirect(new URL("/admin/organizations", req.url));
      }

      // For ORG_ADMIN and other roles, check if they have completed property selection
      const propertyIdCookie = req.cookies.get("propertyId")?.value;
      const orgIdCookie = req.cookies.get("orgId")?.value;

      console.log("🔄 Middleware: Dashboard access check", {
        role: token.role,
        sessionOrgId: token.orgId,
        sessionPropertyId: token.currentPropertyId,
        propertyCount: token.propertyCount,
        cookieOrgId: orgIdCookie,
        cookiePropertyId: propertyIdCookie,
        pathname,
        // Additional debugging
        hasPropertyCount: typeof token.propertyCount !== "undefined",
        propertyCountType: typeof token.propertyCount,
        shouldShowSelector: token.propertyCount !== 1
      });

      // Handle single-property organizations: auto-select and allow dashboard access
      if (token.propertyCount === 1 && token.currentPropertyId && token.orgId) {
        console.log(
          "✅ Middleware: Single property org, auto-allowing dashboard access",
          {
            propertyId: token.currentPropertyId,
            orgId: token.orgId
          }
        );

        // Set cookies for consistency with property selector flow
        const response = NextResponse.next();
        response.cookies.set("orgId", token.orgId, { path: "/" });
        response.cookies.set("propertyId", token.currentPropertyId, {
          path: "/"
        });
        return response;
      }

      // For multi-property orgs, check if user has made an explicit selection
      // We need both orgId and propertyId cookies to be set by the property selector
      if (token.propertyCount && token.propertyCount > 1) {
        // Multi-property org: require explicit selection (both cookies must be set)
        if (propertyIdCookie && orgIdCookie) {
          console.log(
            "✅ Middleware: Multi-property org with explicit selection, allowing dashboard access",
            {
              propertyIdCookie,
              orgIdCookie,
              sessionPropertyId: token.currentPropertyId,
              orgId: token.orgId
            }
          );
          return NextResponse.next();
        } else {
          console.log(
            "🔄 Middleware: Multi-property org needs explicit selection -> /onboarding/select-organization",
            {
              propertyIdCookie: !!propertyIdCookie,
              orgIdCookie: !!orgIdCookie,
              propertyCount: token.propertyCount
            }
          );
          return NextResponse.redirect(
            new URL("/onboarding/select-organization", req.url)
          );
        }
      }

      // Fallback: if user has orgId but we couldn't determine property count, redirect to selector
      if (token.orgId || orgIdCookie) {
        console.log(
          "🔄 Middleware: Unknown property count, redirecting to selector"
        );
        return NextResponse.redirect(
          new URL("/onboarding/select-organization", req.url)
        );
      }

      // If user has no orgId, they need to select organization first
      console.log(
        "🔄 Middleware: No organization context -> /onboarding/select-organization"
      );
      return NextResponse.redirect(
        new URL("/onboarding/select-organization", req.url)
      );
    }
    // Not authenticated, redirect to signin
    else {
      console.log("🔄 Middleware: Not authenticated -> /auth/signin");
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
