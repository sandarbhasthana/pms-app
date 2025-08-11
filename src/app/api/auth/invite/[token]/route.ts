// File: src/app/api/auth/invite/[token]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * GET /api/auth/invite/[token]
 * Process magic link invitation and create user account
 * Public endpoint - no authentication required
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Find the invitation token
    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        },
        property: {
          select: {
            id: true,
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

    // Validate invitation
    if (!invitation) {
      console.log(`❌ Invalid invitation token: ${token}`);
      return redirect("/auth/signin?error=InvalidInvitation&message=Invitation not found");
    }

    if (invitation.used) {
      console.log(`❌ Invitation already used: ${token}`);
      return redirect("/auth/signin?error=InvalidInvitation&message=Invitation has already been used");
    }

    if (invitation.expiresAt < new Date()) {
      console.log(`❌ Invitation expired: ${token}`);
      return redirect("/auth/signin?error=InvalidInvitation&message=Invitation has expired");
    }

    // Check if user already exists in this organization
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      include: {
        memberships: {
          where: { organizationId: invitation.organizationId }
        }
      }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      console.log(`❌ User already exists in organization: ${invitation.email}`);
      return redirect("/auth/signin?error=InvalidInvitation&message=User is already a member of this organization");
    }

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: invitation.email },
      create: {
        email: invitation.email,
        name: "", // Will be filled during onboarding
        phone: invitation.phone
      },
      update: {
        phone: invitation.phone // Update phone if user exists
      }
    });

    console.log(`✅ User created/updated: ${user.email} (ID: ${user.id})`);

    // Create organization membership
    const userOrg = await prisma.userOrg.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role
      }
    });

    console.log(`✅ Organization membership created: ${user.email} -> ${invitation.organization.name} (Role: ${invitation.role})`);

    // Create property assignment if specified
    if (invitation.propertyId && invitation.propertyRole) {
      await prisma.userProperty.create({
        data: {
          userId: user.id,
          propertyId: invitation.propertyId,
          role: invitation.propertyRole,
          shift: invitation.shift
        }
      });

      console.log(`✅ Property assignment created: ${user.email} -> ${invitation.property?.name} (Role: ${invitation.propertyRole}, Shift: ${invitation.shift})`);
    }

    // Mark invitation as used
    await prisma.invitationToken.update({
      where: { id: invitation.id },
      data: { 
        used: true, 
        usedAt: new Date() 
      }
    });

    console.log(`✅ Invitation marked as used: ${token}`);

    // Redirect to onboarding/signin with success message
    const redirectUrl = `/auth/signin?email=${encodeURIComponent(invitation.email)}&invitation=accepted&org=${encodeURIComponent(invitation.organization.name)}`;
    
    return redirect(redirectUrl);

  } catch (error) {
    console.error("Error processing invitation:", error);
    return redirect("/auth/signin?error=InvitationProcessingError&message=An error occurred while processing your invitation");
  }
}

/**
 * POST /api/auth/invite/[token]
 * Complete user onboarding after invitation acceptance
 * Public endpoint - no authentication required
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const { name, password } = await req.json();

    // Validate input
    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Find the invitation token
    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Validate invitation
    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    if (!invitation.used) {
      return NextResponse.json(
        { error: "Invitation has not been accepted yet" },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: invitation.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user with name and password
    // Note: In a real implementation, you would hash the password
    // For now, we'll just store the name since we're using NextAuth
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim()
      }
    });

    console.log(`✅ User onboarding completed: ${user.email} (Name: ${name})`);

    return NextResponse.json({
      message: "Onboarding completed successfully",
      user: {
        id: user.id,
        name: name.trim(),
        email: user.email,
        organizationName: invitation.organization.name
      }
    });

  } catch (error) {
    console.error("Error completing onboarding:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
