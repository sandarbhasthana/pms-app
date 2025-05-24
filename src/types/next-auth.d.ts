// File: src/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

/**
 * Module augmentation to extend NextAuth session and JWT types
 */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
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
    /** Organization ID stored in token */
    orgId?: string;
    /** User role stored in token */
    role?: string;
  }
}
