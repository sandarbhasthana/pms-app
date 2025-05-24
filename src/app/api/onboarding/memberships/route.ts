// File: src/app/api/onboarding/memberships/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch all UserOrg memberships for this user
  const memberships = await prisma.userOrg.findMany({
    where: { user: { email: session.user.email } },
    include: {
      organization: {
        select: { id: true, name: true }
      }
    }
  });

  // Map to the shape expected by the onboarding page
  const formatted = memberships.map((m) => ({
    organizationId: m.organization.id,
    organizationName: m.organization.name
  }));

  return NextResponse.json({ memberships: formatted });
}
