// API endpoint for fetching organizations list

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/admin/organizations
 * Fetch all organizations with basic info
 * Access: SUPER_ADMIN only
 */
export async function GET() {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - SUPER_ADMIN access required" },
        { status: 403 }
      );
    }

    // Fetch organizations with related data
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        industry: true,
        size: true,
        contactPhone: true,
        contactAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
        stripeOnboardingComplete: true,
        _count: {
          select: {
            users: true,
            properties: true,
            reservations: true
          }
        },
        users: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            role: true,
            isActive: true
          },
          where: {
            role: UserRole.ORG_ADMIN,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Transform data for frontend
    const transformedOrganizations = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      domain: org.domain,
      industry: org.industry,
      size: org.size,
      contactPhone: org.contactPhone,
      contactAddress: org.contactAddress,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      stripeStatus: {
        accountId: org.stripeAccountId,
        chargesEnabled: org.stripeChargesEnabled,
        onboardingComplete: org.stripeOnboardingComplete
      },
      stats: {
        totalUsers: org._count.users,
        totalProperties: org._count.properties,
        totalReservations: org._count.reservations
      },
      adminUsers: org.users.map((userOrg) => ({
        id: userOrg.user.id,
        name: userOrg.user.name,
        email: userOrg.user.email,
        role: userOrg.role,
        isActive: userOrg.isActive
      }))
    }));

    return NextResponse.json({
      success: true,
      organizations: transformedOrganizations,
      total: transformedOrganizations.length
    });
  } catch (error) {
    console.error("Organizations fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
