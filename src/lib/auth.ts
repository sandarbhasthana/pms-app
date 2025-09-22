// File: src/lib/auth.ts

import type { AuthOptions, User as NextAuthUser, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
// Commented imports for future Firebase integration:
// import type { Profile } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { getUserProperties } from "@/lib/property-context";

/* ========================================
 * FIREBASE OAUTH INTEGRATION (FUTURE)
 * ========================================
 *
 * This Firebase provider is commented out but preserved for future use.
 * It maintains the admin-controlled user creation policy - users must be
 * invited by admins before they can sign in via Firebase OAuth.
 *
 * To enable Firebase:
 * 1. Add environment variables to .env:
 *    FIREBASE_CLIENT_ID="your-client-id"
 *    FIREBASE_CLIENT_SECRET="your-client-secret"
 *    FIREBASE_ISSUER_URL="https://securetoken.google.com/your-project"
 *
 * 2. Uncomment the FirebaseProfile interface and FirebaseProvider function
 * 3. Add FirebaseProvider to the providers array
 * 4. Add Profile import back to the imports
 * ======================================== */

/*
interface FirebaseProfile extends Profile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

function FirebaseProvider(options: {
  clientId: string;
  clientSecret: string;
  issuer: string;
}) {
  return {
    id: "firebase",
    name: "Firebase",
    type: "oauth" as const,
    wellKnown: `${options.issuer}/.well-known/openid-configuration`,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: { params: { scope: "openid email profile" } },
    async profile(profile: FirebaseProfile) {
      // 1. lookup user by email
      const user = await prisma.user.findUnique({
        where: { email: profile.email }
      });
      if (!user) {
        throw new Error(
          "User not found. Please contact your administrator for an invitation."
        );
      }

      // 2. fetch user's organization membership
      const membership = await prisma.userOrg.findFirst({
        where: { userId: user.id }
      });
      if (!membership) {
        throw new Error(
          "User has no organization membership. Please contact your administrator."
        );
      }

      // 3. fetch user's available properties
      const availableProperties = await getUserProperties(user.id);

      // 4. determine default property
      const defaultProperty =
        availableProperties.find((p) => p.isDefault) || availableProperties[0];

      // 5. return the shape NextAuth expects with our custom fields
      return {
        id: user.id,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
        orgId: membership.organizationId,
        role: membership.role,
        currentPropertyId: defaultProperty?.id,
        availableProperties,
        defaultProperty
      };
    }
  };
}
*/

// Helper function to build user session (shared between providers)
async function buildUserSession(user: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}) {
  // Check if user has any organization memberships
  const membership = await prisma.userOrg.findFirst({
    where: { userId: user.id }
  });

  // SUPER_ADMIN users might not have organization memberships
  // They should access the platform dashboard, not organization context
  if (!membership) {
    // Return minimal session for SUPER_ADMIN or users without org memberships
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      orgId: null,
      role: "SUPER_ADMIN", // Assume SUPER_ADMIN if no org membership
      currentPropertyId: null,
      availableProperties: [],
      defaultProperty: null,
      propertyCount: 0
    } as never;
  }

  // For users with organization memberships (regular org users)
  // Fetch user's available properties
  const availableProperties = await getUserProperties(user.id);

  // Determine default property
  const defaultProperty =
    availableProperties.find((p) => p.isDefault) || availableProperties[0];

  // Return the shape NextAuth expects
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    orgId: membership.organizationId,
    role: membership.role,
    currentPropertyId: defaultProperty?.id,
    availableProperties,
    defaultProperty,
    propertyCount: availableProperties.length
  } as never;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // Dev Login Provider (email-only, unchanged)
    CredentialsProvider({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "org_admin@example.com"
        }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // 1. lookup user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        if (!user) return null;

        // 2. build and return user session
        return await buildUserSession(user);
      }
    }),

    // Password Login Provider (email + password)
    CredentialsProvider({
      id: "password-login",
      name: "Password Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@example.com"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1. lookup user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        if (!user || !user.password) return null;

        // 2. verify password
        const isValidPassword = await compare(
          credentials.password,
          user.password
        );
        if (!isValidPassword) return null;

        // 3. build and return user session
        return await buildUserSession(user);
      }
    })

    /* Uncomment when Firebase is needed:
    FirebaseProvider({
      clientId: process.env.FIREBASE_CLIENT_ID!,
      clientSecret: process.env.FIREBASE_CLIENT_SECRET!,
      issuer: process.env.FIREBASE_ISSUER_URL!
    })
    */
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as NextAuthUser;
        token.userId = u.id as string;
        token.orgId = u.orgId;
        token.role = u.role;
        token.currentPropertyId = u.currentPropertyId;
        token.availableProperties = u.availableProperties;
        token.defaultProperty = u.defaultProperty;
        token.propertyCount = u.propertyCount;
      }

      if (trigger === "update" && session?.currentPropertyId) {
        token.currentPropertyId = session.currentPropertyId;
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.userId) session.user.id = token.userId as string;
      if (token.orgId) session.user.orgId = token.orgId as string;
      if (token.role) session.user.role = token.role as string;
      if (token.currentPropertyId)
        session.user.currentPropertyId = token.currentPropertyId as string;
      if (token.availableProperties)
        session.user.availableProperties = token.availableProperties;
      if (token.defaultProperty)
        session.user.defaultProperty = token.defaultProperty;
      if (typeof token.propertyCount === "number")
        session.user.propertyCount = token.propertyCount;
      return session;
    }
  }
};
