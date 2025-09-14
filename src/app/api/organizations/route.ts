// src/app/api/organizations/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizations where user is a member
    const userOrgs = await prisma.userOrg.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
            stripeChargesEnabled: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        organization: {
          name: 'asc',
        },
      },
    });

    const organizations = userOrgs.map(userOrg => ({
      id: userOrg.organization.id,
      name: userOrg.organization.name,
      domain: userOrg.organization.domain,
      stripeAccountId: userOrg.organization.stripeAccountId,
      stripeOnboardingComplete: userOrg.organization.stripeOnboardingComplete,
      stripeChargesEnabled: userOrg.organization.stripeChargesEnabled,
      userRole: userOrg.role,
      createdAt: userOrg.organization.createdAt.toISOString(),
    }));

    return NextResponse.json({ 
      organizations,
      total: organizations.length,
    });

  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
