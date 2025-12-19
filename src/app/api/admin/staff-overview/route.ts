// File: src/app/api/admin/staff-overview/route.ts
// ✅ PERFORMANCE: Combined endpoint for staff members and invitations
// Reduces API calls from 2 to 1 for the StaffManagement component

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PropertyRole, Prisma } from "@prisma/client";

/**
 * GET /api/admin/staff-overview
 * Combined endpoint returning both staff members and pending invitations
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    // Check permissions
    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ORG_ADMIN,
      UserRole.PROPERTY_MGR
    ];
    if (!session?.user || !role || !allowedRoles.includes(role as UserRole)) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Run both queries in parallel for better performance
    const [usersResult, invitationsResult] = await Promise.all([
      fetchStaffMembers(orgId),
      fetchInvitations(orgId)
    ]);

    return NextResponse.json({
      users: usersResult.users,
      invitations: invitationsResult.invitations,
      counts: {
        totalStaff: usersResult.users.length,
        pendingInvitations: invitationsResult.invitations.length
      }
    });
  } catch (error) {
    console.error("Error fetching staff overview:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Helper: Fetch staff members
async function fetchStaffMembers(orgId: string) {
  const users = await prisma.userOrg.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Get property assignments
  const userIds = users.map((u) => u.user.id);
  const propertyAssignments = await prisma.userProperty.findMany({
    where: { userId: { in: userIds } },
    include: {
      property: {
        select: { id: true, name: true }
      }
    }
  });

  // Group by user
  const assignmentsByUser = propertyAssignments.reduce((acc, a) => {
    if (!acc[a.userId]) acc[a.userId] = [];
    acc[a.userId].push({
      propertyId: a.propertyId,
      propertyName: a.property.name,
      role: a.role,
      shift: a.shift,
      createdAt: a.createdAt
    });
    return acc;
  }, {} as Record<string, Array<{ propertyId: string; propertyName: string; role: PropertyRole; shift: string | null; createdAt: Date }>>);

  const formattedUsers = users.map((userOrg) => ({
    id: userOrg.user.id,
    name: userOrg.user.name,
    email: userOrg.user.email,
    phone: userOrg.user.phone || "",
    image: userOrg.user.image,
    organizationRole: userOrg.role,
    propertyAssignments: assignmentsByUser[userOrg.user.id] || [],
    createdAt: userOrg.createdAt,
    updatedAt: userOrg.user.updatedAt
  }));

  return { users: formattedUsers };
}

// Helper: Fetch pending invitations
async function fetchInvitations(orgId: string) {
  const whereClause: Prisma.InvitationTokenWhereInput = {
    organizationId: orgId,
    used: false,
    expiresAt: { gt: new Date() }
  };

  const invitations = await prisma.invitationToken.findMany({
    where: whereClause,
    include: {
      organization: { select: { name: true } },
      property: { select: { name: true } },
      creator: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const formattedInvitations = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    phone: inv.phone,
    organizationRole: inv.role,
    propertyRole: inv.propertyRole,
    shift: inv.shift,
    status: "pending" as const,
    organizationName: inv.organization.name,
    propertyName: inv.property?.name,
    createdBy: inv.creator.name,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt
  }));

  return { invitations: formattedInvitations };
}

