// File: middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Simulated org lookup table (replace with fetch or internal cache later)
const ORG_DOMAINS: Record<string, string> = {
  acme: "org_acme_id",
  demo: "org_demo_id",
  test: "org_test_id"
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];

  if (
    ["localhost", "www", "pms-app"].includes(subdomain) ||
    host.includes("localhost:")
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
