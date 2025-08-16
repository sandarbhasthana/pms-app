// File: src/lib/property-context.ts
import { prisma } from "./prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PropertyRole } from "@prisma/client";

/**
 * Property role hierarchy (higher number = more permissions)
 */
const PROPERTY_ROLE_HIERARCHY: Record<PropertyRole, number> = {
  GUEST_SERVICES: 1,
  SECURITY: 2,
  MAINTENANCE: 3,
  HOUSEKEEPING: 4,
  IT_SUPPORT: 4,
  ACCOUNTANT: 5,
  FRONT_DESK: 5,
  PROPERTY_MGR: 6
};

/**
 * Check if a role has sufficient permissions compared to required role
 */
export function hasRolePermission(
  userRole: PropertyRole,
  requiredRole: PropertyRole
): boolean {
  return (
    PROPERTY_ROLE_HIERARCHY[userRole] >= PROPERTY_ROLE_HIERARCHY[requiredRole]
  );
}

/**
 * Get all roles that have at least the specified permission level
 */
export function getRolesWithPermission(
  requiredRole: PropertyRole
): PropertyRole[] {
  const requiredLevel = PROPERTY_ROLE_HIERARCHY[requiredRole];
  return Object.entries(PROPERTY_ROLE_HIERARCHY)
    .filter(([, level]) => level >= requiredLevel)
    .map(([role]) => role as PropertyRole);
}

/**
 * Validate role hierarchy for property access
 */
export function validateRoleHierarchy(
  userRole: PropertyRole,
  requiredRole: PropertyRole
): { valid: boolean; message?: string } {
  if (!userRole || !requiredRole) {
    return { valid: false, message: "Invalid role provided" };
  }

  const hasPermission = hasRolePermission(userRole, requiredRole);
  if (!hasPermission) {
    return {
      valid: false,
      message: `Insufficient permissions. Required: ${requiredRole}, User has: ${userRole}`
    };
  }

  return { valid: true };
}

/**
 * Execute queries within a property context
 * This function provides property-level data isolation
 */
export async function withPropertyContext<T>(
  propertyId: string,
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  // Set property context for RLS (Row Level Security)
  await prisma.$executeRawUnsafe(`SET app.property_id = '${propertyId}'`);
  // Run the user's queries under that property context
  return fn(prisma);
}

/**
 * Get property ID from request headers, cookies, or query params
 */
export function getPropertyIdFromRequest(req: Request): string | null {
  const url = new URL(req.url);

  // Try different sources in order of preference
  const propertyIdHeader = req.headers.get("x-property-id");
  const propertyIdQuery = url.searchParams.get("propertyId");

  // Check cookies for propertyId
  const cookieHeader = req.headers.get("cookie");
  let propertyIdCookie = null;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const propertyIdCookieEntry = cookies.find((c) =>
      c.startsWith("propertyId=")
    );
    if (propertyIdCookieEntry) {
      propertyIdCookie = propertyIdCookieEntry.split("=")[1];
    }
  }

  const finalPropertyId =
    propertyIdHeader || propertyIdQuery || propertyIdCookie || null;

  // Debug: Log property ID resolution
  console.log(`🔍 Property ID resolution:`, {
    header: propertyIdHeader,
    query: propertyIdQuery,
    cookie: propertyIdCookie,
    final: finalPropertyId,
    cookieHeader: cookieHeader
  });

  return finalPropertyId;
}

/**
 * Validate user has access to the specified property with role hierarchy support
 */
export async function hasPropertyAccess(
  userId: string,
  propertyId: string,
  requiredRole?: PropertyRole
): Promise<boolean> {
  try {
    // Check organization-level access first (SUPER_ADMIN, ORG_ADMIN)
    const orgAccess = await prisma.userOrg.findFirst({
      where: {
        userId: userId,
        role: { in: ["SUPER_ADMIN", "ORG_ADMIN"] },
        organization: {
          properties: {
            some: { id: propertyId }
          }
        }
      }
    });

    if (orgAccess) {
      return true; // Organization-level access grants access to all properties
    }

    // Check property-level access
    const propertyAccess = await prisma.userProperty.findFirst({
      where: {
        userId: userId,
        propertyId: propertyId
      }
    });

    if (!propertyAccess) {
      return false; // No access to this property
    }

    // If no specific role is required, any access is sufficient
    if (!requiredRole) {
      return true;
    }

    // Check role hierarchy - user's role must have sufficient permissions
    return hasRolePermission(propertyAccess.role, requiredRole);
  } catch (error) {
    console.error("Error checking property access:", error);
    return false;
  }
}

/**
 * Get user's role for a specific property (enhanced version)
 */
export async function getUserPropertyRole(
  userId: string,
  propertyId: string
): Promise<{
  role: PropertyRole | string | null;
  accessType: "organization" | "property" | null;
}> {
  try {
    // Check organization-level access first
    const orgAccess = await prisma.userOrg.findFirst({
      where: {
        userId: userId,
        role: { in: ["SUPER_ADMIN", "ORG_ADMIN"] },
        organization: {
          properties: {
            some: { id: propertyId }
          }
        }
      }
    });

    if (orgAccess) {
      return { role: orgAccess.role, accessType: "organization" };
    }

    // Check property-level access
    const propertyAccess = await prisma.userProperty.findFirst({
      where: {
        userId: userId,
        propertyId: propertyId
      }
    });

    if (propertyAccess) {
      return { role: propertyAccess.role, accessType: "property" };
    }

    return { role: null, accessType: null };
  } catch (error) {
    console.error("Error getting user property role:", error);
    return { role: null, accessType: null };
  }
}

/**
 * Get all properties accessible to a user
 */
export async function getUserProperties(userId: string) {
  try {
    // Get organization-level access
    const orgMemberships = await prisma.userOrg.findMany({
      where: { userId: userId },
      include: {
        organization: {
          include: {
            properties: true
          }
        }
      }
    });

    // Get property-level access
    const propertyAccess = await prisma.userProperty.findMany({
      where: { userId: userId },
      include: {
        property: true
      }
    });

    // Combine and deduplicate properties
    const allProperties = new Map();

    // Add properties from organization access
    orgMemberships.forEach((membership) => {
      membership.organization.properties.forEach((property) => {
        allProperties.set(property.id, {
          ...property,
          accessType: "organization",
          role: membership.role
        });
      });
    });

    // Add properties from direct property access
    propertyAccess.forEach((access) => {
      if (!allProperties.has(access.propertyId)) {
        allProperties.set(access.propertyId, {
          ...access.property,
          accessType: "property",
          role: access.role
        });
      }
    });

    return Array.from(allProperties.values());
  } catch (error) {
    console.error("Error getting user properties:", error);
    return [];
  }
}

/**
 * Get users with access to a specific property
 */
export async function getPropertyUsers(propertyId: string) {
  try {
    // Get property details to find organization
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { organization: true }
    });

    if (!property) {
      return [];
    }

    // Get organization-level users
    const orgUsers = await prisma.userOrg.findMany({
      where: { organizationId: property.organizationId },
      include: { user: true }
    });

    // Get property-level users
    const propertyUsers = await prisma.userProperty.findMany({
      where: { propertyId: propertyId },
      include: { user: true }
    });

    // Combine and deduplicate users
    const allUsers = new Map();

    // Add organization-level users
    orgUsers.forEach((membership) => {
      allUsers.set(membership.userId, {
        ...membership.user,
        accessType: "organization",
        role: membership.role
      });
    });

    // Add property-level users
    propertyUsers.forEach((access) => {
      if (!allUsers.has(access.userId)) {
        allUsers.set(access.userId, {
          ...access.user,
          accessType: "property",
          role: access.role
        });
      }
    });

    return Array.from(allUsers.values());
  } catch (error) {
    console.error("Error getting property users:", error);
    return [];
  }
}

/**
 * Middleware to validate property access for API routes
 */
export async function validatePropertyAccess(
  req: Request,
  requiredRole?: PropertyRole
): Promise<{
  success: boolean;
  propertyId?: string;
  userId?: string;
  error?: string;
}> {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get property ID from request (cookie/header/query)
    let propertyId = getPropertyIdFromRequest(req);

    // If no property ID in request, fallback to session (for backward compatibility)
    if (!propertyId && session.user.currentPropertyId) {
      propertyId = session.user.currentPropertyId;
      console.log(`⚠️ Using session fallback property ID: ${propertyId}`);
    }

    if (!propertyId) {
      return { success: false, error: "Property context missing" };
    }

    console.log(`🎯 Final property ID for validation: ${propertyId}`);

    // Check access
    const hasAccess = await hasPropertyAccess(
      session.user.id,
      propertyId,
      requiredRole
    );
    if (!hasAccess) {
      return {
        success: false,
        error: "Forbidden - insufficient property access"
      };
    }

    return { success: true, propertyId, userId: session.user.id };
  } catch (error) {
    console.error("Error validating property access:", error);
    return { success: false, error: "Internal server error" };
  }
}
