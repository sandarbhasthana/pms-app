// API endpoint to check domain availability for organization onboarding

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

// Request validation schema
const domainCheckSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain must be at least 3 characters")
    .max(50, "Domain must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
      "Domain can only contain letters, numbers, and hyphens"
    )
    .toLowerCase()
    .trim(),
});

/**
 * GET /api/admin/organizations/check-domain?domain=example
 * Check if a domain is available for organization creation
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

    // Get domain from query parameters
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    // Validate domain format
    const validation = domainCheckSchema.safeParse({ domain });
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid domain format",
          details: validation.error.errors[0]?.message 
        },
        { status: 400 }
      );
    }

    const validatedDomain = validation.data.domain;

    // Check if domain already exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { domain: validatedDomain },
      select: { id: true, name: true },
    });

    const isAvailable = !existingOrganization;

    // Generate domain suggestions if not available
    let suggestions: string[] = [];
    if (!isAvailable) {
      suggestions = await generateDomainSuggestions(validatedDomain);
    }

    return NextResponse.json({
      available: isAvailable,
      domain: validatedDomain,
      ...(suggestions.length > 0 && { suggestions }),
    });

  } catch (error) {
    console.error("Domain check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate alternative domain suggestions
 */
async function generateDomainSuggestions(domain: string): Promise<string[]> {
  const suggestions: string[] = [];
  const baseDomain = domain.replace(/[-\d]+$/, ''); // Remove trailing numbers/hyphens
  
  // Generate numbered variations
  for (let i = 1; i <= 5; i++) {
    const suggestion = `${baseDomain}${i}`;
    const exists = await prisma.organization.findUnique({
      where: { domain: suggestion },
      select: { id: true },
    });
    
    if (!exists) {
      suggestions.push(suggestion);
    }
    
    // Stop if we have 3 suggestions
    if (suggestions.length >= 3) break;
  }
  
  // Generate suffix variations if we need more suggestions
  if (suggestions.length < 3) {
    const suffixes = ['hq', 'group', 'hotels', 'hospitality', 'properties'];
    
    for (const suffix of suffixes) {
      const suggestion = `${baseDomain}-${suffix}`;
      const exists = await prisma.organization.findUnique({
        where: { domain: suggestion },
        select: { id: true },
      });
      
      if (!exists) {
        suggestions.push(suggestion);
      }
      
      // Stop if we have 3 suggestions
      if (suggestions.length >= 3) break;
    }
  }
  
  return suggestions;
}

/**
 * POST /api/admin/organizations/check-domain
 * Alternative endpoint for checking domain availability via POST
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
    
    // Validate domain format
    const validation = domainCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid domain format",
          details: validation.error.errors[0]?.message 
        },
        { status: 400 }
      );
    }

    const { domain } = validation.data;

    // Check if domain already exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { domain },
      select: { id: true, name: true },
    });

    const isAvailable = !existingOrganization;

    // Generate domain suggestions if not available
    let suggestions: string[] = [];
    if (!isAvailable) {
      suggestions = await generateDomainSuggestions(domain);
    }

    return NextResponse.json({
      available: isAvailable,
      domain,
      ...(suggestions.length > 0 && { suggestions }),
    });

  } catch (error) {
    console.error("Domain check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
