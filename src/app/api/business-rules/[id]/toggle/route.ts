import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/business-rules/[id]/toggle
 * Toggle a business rule active/inactive
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { isActive } = body;

    if (isActive === undefined) {
      return NextResponse.json(
        { error: "isActive is required" },
        { status: 400 }
      );
    }

    // Verify rule exists
    const existingRule = await prisma.businessRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Update rule
    const updatedRule = await prisma.businessRule.update({
      where: { id },
      data: {
        isActive,
        updatedBy: session.user.id,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("POST /api/business-rules/[id]/toggle error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

