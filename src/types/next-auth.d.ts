// File: src/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

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
      /** User role set in JWT */
      role: string;
    };
  }

  interface User extends DefaultUser {
    /** Organization ID set in JWT */
    orgId: string;
    /** User role set in JWT */
    role: string;
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
  }
}
