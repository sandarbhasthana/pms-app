// File: src/lib/session-utils.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPropertyAccess } from "@/lib/property-context";
import { PropertyRole } from "@prisma/client";

/**
 * Get the current session with property context
 */
export async function getSessionWithPropertyContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return {
    ...session,
    user: {
      ...session.user,
      // Ensure we have default values
      availableProperties: session.user.availableProperties || [],
      currentPropertyId:
        session.user.currentPropertyId || session.user.defaultProperty?.id
    }
  };
}

/**
 * Get the current property ID from session or fallback to default
 */
export async function getCurrentPropertyId(): Promise<string | null> {
  const session = await getSessionWithPropertyContext();

  if (!session?.user) {
    return null;
  }

  // Return current property or default property
  return (
    session.user.currentPropertyId || session.user.defaultProperty?.id || null
  );
}

/**
 * Validate that the current user has access to a specific property
 */
export async function validateCurrentUserPropertyAccess(
  propertyId: string,
  requiredRole?: PropertyRole
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const session = await getSessionWithPropertyContext();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user has access to this property
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

  return { success: true, userId: session.user.id };
}

/**
 * Get user's available properties from database (fresh data)
 */
export async function getUserAvailableProperties() {
  const session = await getSessionWithPropertyContext();

  if (!session?.user?.id) {
    return [];
  }

  // Fetch fresh data from database instead of using cached session data
  const { getUserProperties } = await import("@/lib/property-context");
  return await getUserProperties(session.user.id);
}

/**
 * Check if user has organization-level access (SUPER_ADMIN, ORG_ADMIN)
 */
export async function hasOrganizationLevelAccess(): Promise<boolean> {
  const session = await getSessionWithPropertyContext();

  if (!session?.user?.role) {
    return false;
  }

  return ["SUPER_ADMIN", "ORG_ADMIN"].includes(session.user.role);
}

/**
 * Get user's role for a specific property
 */
export async function getUserPropertyRole(
  propertyId: string
): Promise<string | null> {
  const session = await getSessionWithPropertyContext();

  if (!session?.user) {
    return null;
  }

  // Check if user has organization-level access first
  if (await hasOrganizationLevelAccess()) {
    return session.user.role; // Return organization-level role
  }

  // Find property-specific role
  const property = session.user.availableProperties?.find(
    (p) => p.id === propertyId
  );
  return property?.role || null;
}

/**
 * Check if current user can access multiple properties
 */
export async function isMultiPropertyUser(): Promise<boolean> {
  const session = await getSessionWithPropertyContext();

  if (!session?.user) {
    return false;
  }

  // Organization-level users can access all properties
  if (await hasOrganizationLevelAccess()) {
    return true;
  }

  // Check if user has access to more than one property
  return (session.user.availableProperties?.length || 0) > 1;
}

/**
 * Get property context for API requests
 * This is a server-side utility for API routes
 */
export async function getPropertyContextFromSession(): Promise<{
  propertyId: string | null;
  userId: string | null;
  orgId: string | null;
  role: string | null;
}> {
  const session = await getSessionWithPropertyContext();

  if (!session?.user) {
    return {
      propertyId: null,
      userId: null,
      orgId: null,
      role: null
    };
  }

  return {
    propertyId:
      session.user.currentPropertyId ||
      session.user.defaultProperty?.id ||
      null,
    userId: session.user.id,
    orgId: session.user.orgId,
    role: session.user.role
  };
}

/**
 * Middleware helper for API routes that need property context
 */
export async function withSessionPropertyContext<T>(
  fn: (context: {
    propertyId: string;
    userId: string;
    orgId: string;
    role: string;
  }) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  try {
    const context = await getPropertyContextFromSession();

    if (!context.userId) {
      return { success: false, error: "Unauthorized", status: 401 };
    }

    if (!context.propertyId) {
      return {
        success: false,
        error: "No property context available",
        status: 400
      };
    }

    const data = await fn({
      propertyId: context.propertyId,
      userId: context.userId,
      orgId: context.orgId!,
      role: context.role!
    });

    return { success: true, data };
  } catch (error) {
    console.error("Session property context error:", error);
    return {
      success: false,
      error: (error as Error).message,
      status: 500
    };
  }
}
