// File: src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

/**
 * Interface matching the OpenID Connect profile returned by Firebase
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
  providers: [
    // @ts-expect-error: NextAuth expects a stricter Provider type here
    FirebaseProvider({
      clientId: process.env.FIREBASE_CLIENT_ID!,
      clientSecret: process.env.FIREBASE_CLIENT_SECRET!,
      issuer: process.env.FIREBASE_ISSUER_URL!
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const membership = await prisma.userOrg.findFirst({
          where: { userId: user.id }
        });
        token.orgId = membership?.organizationId;
        token.role = membership?.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.orgId = token.orgId as string;
      session.user.role = token.role as string;
      return session;
    }
  }
};

export default NextAuth(authOptions);
