import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payments = await prisma.payment.findMany({
      where: { reservationId: id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 }
    );
  }
}
