// File: src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

/**
 * Minimal shape for Firebase OIDC
 */
interface FirebaseProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

/**
 * Custom OAuth provider for Firebase Auth
 */
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
    profile(profile: FirebaseProfile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture
      };
    }
  };
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "org_admin@example.com"
        }
      },
      // ← note the two params—credentials + _req—to match NextAuth’s types
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // 1. lookup user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        if (!user) return null;

        // 2. fetch ALL memberships if you’d like, but for the JWT we only need one:
        const membership = await prisma.userOrg.findFirst({
          where: { userId: user.id }
        });
        if (!membership) return null;

        // 3. return the shape NextAuth expects — cast to `any` to avoid TS excess-property checks
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          // custom props for our callbacks
          orgId: membership.organizationId,
          role: membership.role
        } as never;
      }
    }),

    // @ts-expect-error custom shape
    FirebaseProvider({
      clientId: process.env.FIREBASE_CLIENT_ID!,
      clientSecret: process.env.FIREBASE_CLIENT_SECRET!,
      issuer: process.env.FIREBASE_ISSUER_URL!
    })
  ],

  callbacks: {
    // stash orgId & role on the token when they first sign in
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.orgId = user.orgId;
        token.role = user.role;
      }
      return token;
    },
    // expose them via session.user
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      if (token.orgId) session.user.orgId = token.orgId as string;
      if (token.role) session.user.role = token.role as string;
      return session;
    }
  }
};

// App Router requires named exports for HTTP methods
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
