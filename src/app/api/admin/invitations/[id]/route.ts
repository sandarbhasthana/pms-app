// File: src/app/api/admin/invitations/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * GET /api/admin/invitations/[id]
 * Get specific invitation details
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await context.params;

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (
      !session?.user ||
      !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(role)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    const invitation = await prisma.invitationToken.findFirst({
      where: {
        id: invitationId,
        organizationId: orgId
      },
      include: {
        organization: {
          select: {
            name: true
          }
        },
        property: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!invitation) {
      return new NextResponse("Invitation not found", { status: 404 });
    }

    const formattedInvitation = {
      id: invitation.id,
      email: invitation.email,
      phone: invitation.phone,
      organizationRole: invitation.role,
      propertyRole: invitation.propertyRole,
      shift: invitation.shift,
      status: invitation.used
        ? "used"
        : invitation.expiresAt < new Date()
        ? "expired"
        : "pending",
      organizationName: invitation.organization.name,
      propertyName: invitation.property?.name,
      createdBy: invitation.creator.name,
      createdByEmail: invitation.creator.email,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt
    };

    return NextResponse.json(formattedInvitation);
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * PATCH /api/admin/invitations/[id]
 * Resend invitation (generates new token and extends expiry)
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await context.params;

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (
      !session?.user ||
      !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(role)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    const { action } = await req.json();

    if (action !== "resend") {
      return NextResponse.json(
        { error: "Invalid action. Only 'resend' is supported" },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitationToken.findFirst({
      where: {
        id: invitationId,
        organizationId: orgId
      },
      include: {
        organization: {
          select: {
            name: true
          }
        },
        property: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!invitation) {
      return new NextResponse("Invitation not found", { status: 404 });
    }

    // Check if invitation is already used
    if (invitation.used) {
      return NextResponse.json(
        { error: "Cannot resend a used invitation" },
        { status: 400 }
      );
    }

    // Check if user already exists in organization
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      include: {
        memberships: {
          where: { organizationId: orgId }
        }
      }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const updatedInvitation = await prisma.invitationToken.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        createdBy: session.user.id, // Update to current user who resent
        createdAt: new Date() // Update creation time
      },
      include: {
        organization: {
          select: {
            name: true
          }
        },
        property: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Send new invitation email
    const emailResult = await sendInvitationEmail({
      email: updatedInvitation.email,
      phone: updatedInvitation.phone || "",
      organizationName: updatedInvitation.organization.name,
      organizationRole: updatedInvitation.role,
      propertyName: updatedInvitation.property?.name,
      propertyRole: updatedInvitation.propertyRole || undefined,
      shift: updatedInvitation.shift || undefined,
      inviterName: updatedInvitation.creator.name || "System Administrator",
      inviterEmail: updatedInvitation.creator.email,
      token: newToken,
      expiresAt: updatedInvitation.expiresAt
    });

    if (!emailResult.success) {
      console.error(
        `Failed to resend invitation email to ${invitation.email}:`,
        emailResult.error
      );
      // Note: We don't fail the API call if email fails, just log it
    }

    return NextResponse.json({
      message: "Invitation resent successfully",
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        phone: updatedInvitation.phone,
        organizationRole: updatedInvitation.role,
        propertyRole: updatedInvitation.propertyRole,
        shift: updatedInvitation.shift,
        expiresAt: updatedInvitation.expiresAt,
        organizationName: updatedInvitation.organization.name,
        propertyName: updatedInvitation.property?.name
      }
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/admin/invitations/[id]
 * Cancel pending invitation
 * Access: SUPER_ADMIN, ORG_ADMIN, PROPERTY_MGR
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await context.params;

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    if (
      !session?.user ||
      !["SUPER_ADMIN", "ORG_ADMIN", "PROPERTY_MGR"].includes(role)
    ) {
      return new NextResponse("Forbidden - Admin access required", {
        status: 403
      });
    }

    // Get organization ID from header or cookie
    const orgIdHeader = req.headers.get("x-organization-id");
    const orgIdCookie = req.cookies.get("orgId")?.value;
    const orgId = orgIdHeader || orgIdCookie;

    if (!orgId) {
      return new NextResponse("Organization context missing", { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.invitationToken.findFirst({
      where: {
        id: invitationId,
        organizationId: orgId
      }
    });

    if (!invitation) {
      return new NextResponse("Invitation not found", { status: 404 });
    }

    // Check if invitation is already used
    if (invitation.used) {
      return NextResponse.json(
        { error: "Cannot cancel a used invitation" },
        { status: 400 }
      );
    }

    // Delete the invitation
    await prisma.invitationToken.delete({
      where: { id: invitationId }
    });

    return NextResponse.json({
      message: "Invitation cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
