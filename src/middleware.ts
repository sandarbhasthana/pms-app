// File: middleware.ts (at project root)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function middleware(req: NextRequest) {
  console.log("⚙️  Running in NODE_ENV =", process.env.NODE_ENV);
  try {
    const host = req.headers.get("host") || "";
    const subdomain = host.split(".")[0];

    // Bypass for root domain, localhost, or static assets
    if (
      ["localhost", "www", "pms-app"].includes(subdomain) ||
      host.includes("localhost:")
    ) {
      return NextResponse.next();
    }

    // Lookup the organization by its subdomain
    const organization = await prisma.organization.findUnique({
      where: { domain: subdomain },
      select: { id: true }
    });

    if (!organization) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    // Inject orgId into headers & cookie for downstream
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-organization-id", organization.id);
    const response = NextResponse.next({
      request: { headers: requestHeaders }
    });
    response.cookies.set("orgId", organization.id, { path: "/" });

    return response;
  } catch (error) {
    console.error("Tenant middleware error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
