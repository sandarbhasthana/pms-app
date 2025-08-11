// File: src/app/api/onboarding/memberships/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull all org memberships for the logged-in user:
  const memberships = await prisma.userOrg.findMany({
    where: {
      user: {
        email: session.user.email || ""
      }
    },
    include: { organization: true }
  });

  const data = memberships.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organization.name
  }));

  return NextResponse.json({ memberships: data });
}
