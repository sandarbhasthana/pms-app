/**
 * User Search API
 *
 * GET /api/users/search - Search users in an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search
 * Search users by name or email within an organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const organizationId = searchParams.get("organizationId");

    if (!query || !organizationId) {
      return NextResponse.json(
        { error: "Query (q) and organizationId are required" },
        { status: 400 }
      );
    }

    // Search users in the organization
    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId
          }
        },
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive"
            }
          },
          {
            email: {
              contains: query,
              mode: "insensitive"
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      take: 10 // Limit results
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
