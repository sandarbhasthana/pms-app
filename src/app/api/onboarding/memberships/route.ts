// File: src/app/api/onboarding/memberships/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching properties for user:", session.user.email);

    // Get user's available properties through organization memberships
    const memberships = await prisma.userOrg.findMany({
      where: {
        user: {
          email: session.user.email || ""
        }
      },
      include: {
        organization: {
          include: {
            properties: true
          }
        }
      }
    });

    // Flatten all properties from all organizations
    const allProperties: Array<{
      propertyId: string;
      propertyName: string;
      organizationId: string;
      organizationName: string;
      isDefault: boolean;
    }> = [];
    memberships.forEach((membership) => {
      membership.organization.properties.forEach((property) => {
        allProperties.push({
          propertyId: property.id,
          propertyName: property.name,
          organizationId: property.organizationId,
          organizationName: membership.organization.name,
          isDefault: property.isDefault
        });
      });
    });

    console.log("Found properties:", allProperties.length);

    // Sort properties so default ones appear first
    allProperties.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.propertyName.localeCompare(b.propertyName);
    });

    return NextResponse.json({ properties: allProperties });
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
