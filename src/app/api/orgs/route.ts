// File: src/app/api/orgs/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch memberships by user email
  const memberships = await prisma.userOrg.findMany({
    where: {
      user: { email: session.user.email }
    },
    include: {
      organization: {
        select: { id: true, name: true, domain: true }
      }
    }
  });

  const orgs = memberships.map((m) => m.organization);
  return NextResponse.json(orgs);
}
