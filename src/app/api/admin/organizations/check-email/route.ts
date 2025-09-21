// API endpoint to check email availability for organization onboarding

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

// Request validation schema
const emailCheckSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim()
});

/**
 * GET /api/admin/organizations/check-email?email=admin@example.com
 * Check if an email is available for admin user creation
 * Access: SUPER_ADMIN only
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - SUPER_ADMIN access required" },
        { status: 403 }
      );
    }

    // Get email from query parameters
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const validation = emailCheckSchema.safeParse({ email });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid email format",
          details: validation.error.errors[0]?.message
        },
        { status: 400 }
      );
    }

    const validatedEmail = validation.data.email;

    // Check if email domain is valid (security check)
    if (!isValidEmailDomain(validatedEmail)) {
      return NextResponse.json(
        {
          error: "Invalid email domain",
          message:
            "Please use a valid business email address. Disposable email providers are not allowed.",
          suggestions: generateEmailSuggestions(validatedEmail)
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedEmail },
      select: {
        id: true,
        name: true,
        memberships: {
          include: {
            organization: {
              select: { name: true }
            }
          }
        }
      }
    });

    const isAvailable = !existingUser;

    // If email exists, provide context about the existing user
    let existingUserInfo = null;
    if (existingUser) {
      existingUserInfo = {
        name: existingUser.name,
        organizations: existingUser.memberships.map(
          (membership) => membership.organization.name
        )
      };
    }

    return NextResponse.json({
      available: isAvailable,
      email: validatedEmail,
      ...(existingUserInfo && { existingUser: existingUserInfo })
    });
  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations/check-email
 * Alternative endpoint for checking email availability via POST
 * Access: SUPER_ADMIN only
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized - SUPER_ADMIN access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate email format
    const validation = emailCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid email format",
          details: validation.error.errors[0]?.message
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Check if email domain is valid (security check)
    if (!isValidEmailDomain(email)) {
      return NextResponse.json(
        {
          error: "Invalid email domain",
          message:
            "Please use a valid business email address. Disposable email providers are not allowed.",
          suggestions: generateEmailSuggestions(email)
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        memberships: {
          include: {
            organization: {
              select: { name: true }
            }
          }
        }
      }
    });

    const isAvailable = !existingUser;

    // If email exists, provide context about the existing user
    let existingUserInfo = null;
    if (existingUser) {
      existingUserInfo = {
        name: existingUser.name,
        organizations: existingUser.memberships.map(
          (membership) => membership.organization.name
        )
      };
    }

    return NextResponse.json({
      available: isAvailable,
      email,
      ...(existingUserInfo && { existingUser: existingUserInfo })
    });
  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if email domain is valid
 * This could be extended to check against a list of disposable email providers
 */
function isValidEmailDomain(email: string): boolean {
  const domain = email.split("@")[1];

  // Basic domain validation
  if (!domain || domain.length < 3) {
    return false;
  }

  // Check for common disposable email domains (security measure)
  const disposableDomains = [
    // Most common temporary email services
    "10minutemail.com",
    "10minutemail.net",
    "tempmail.org",
    "temp-mail.org",
    "guerrillamail.com",
    "guerrillamail.net",
    "mailinator.com",
    "maildrop.cc",
    "throwaway.email",
    "yopmail.com",
    "sharklasers.com",
    "grr.la",
    "pokemail.net",
    "spam4.me",
    "bccto.me",
    "dispostable.com",
    "fakeinbox.com",
    "getnada.com",
    "jetable.org",
    "mytrashmail.com",
    "no-spam.ws",
    "notmailinator.com",
    "oneoffemail.com",
    "receiveemailonline.com",
    "selfdestructingmail.com",
    "spamgourmet.com",
    "tempmailer.com",
    "trashmail.com",
    "trashmail.de",
    "willselfdestruct.com"
    // Add more as needed - this covers the most popular ones
  ];

  return !disposableDomains.includes(domain.toLowerCase());
}

/**
 * Helper function to suggest alternative emails if needed
 */
function generateEmailSuggestions(email: string): string[] {
  const [localPart, domain] = email.split("@");
  const suggestions: string[] = [];

  // Generate numbered variations
  for (let i = 1; i <= 3; i++) {
    suggestions.push(`${localPart}${i}@${domain}`);
  }

  // Generate suffix variations
  const suffixes = ["admin", "manager", "owner"];
  for (const suffix of suffixes) {
    suggestions.push(`${localPart}.${suffix}@${domain}`);
    if (suggestions.length >= 5) break;
  }

  return suggestions;
}
