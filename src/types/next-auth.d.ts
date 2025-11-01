// File: src/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

/**
 * Property information for session
 */
interface PropertyInfo {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  role?: string; // User's role for this specific property
  timezone?: string; // Property timezone (e.g., 'America/New_York')
}

/**
 * Module augmentation to extend NextAuth session and JWT types
 */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      /** User ID from database */
      id: string;
      /** Organization ID set in JWT */
      orgId: string;
      /** User role set in JWT (organization-level) */
      role: string;
      /** Current selected property ID */
      currentPropertyId?: string;
      /** List of properties user has access to */
      availableProperties: PropertyInfo[];
      /** Default property for this user */
      defaultProperty?: PropertyInfo;
      /** Number of properties user has access to */
      propertyCount: number;
    };
  }

  interface User extends DefaultUser {
    /** Organization ID set in JWT */
    orgId: string;
    /** User role set in JWT */
    role: string;
    /** Current selected property ID */
    currentPropertyId?: string;
    /** List of properties user has access to */
    availableProperties?: PropertyInfo[];
    /** Default property for this user */
    defaultProperty?: PropertyInfo;
    /** Number of properties user has access to */
    propertyCount?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** User ID stored in token */
    userId?: string;
    /** Organization ID stored in token */
    orgId?: string;
    /** User role stored in token */
    role?: string;
    /** Current selected property ID */
    currentPropertyId?: string;
    /** List of properties user has access to */
    availableProperties?: PropertyInfo[];
    /** Default property for this user */
    defaultProperty?: PropertyInfo;
    /** Number of properties user has access to */
    propertyCount?: number;
  }
}
