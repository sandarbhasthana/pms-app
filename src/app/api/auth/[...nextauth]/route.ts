// File: src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

// App Router requires named exports for HTTP methods
const handler = NextAuth(authOptions);

// Explicitly typed route handlers without any casts
// Align with Next.js generated types: Request | NextRequest and RouteContext with params as Promise
type AppRouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};
export type AppRouteHandler = (
  request: NextRequest,
  context: AppRouteContext
) => Promise<Response>;

export const GET: AppRouteHandler = handler as unknown as AppRouteHandler;
export const POST: AppRouteHandler = handler as unknown as AppRouteHandler;
