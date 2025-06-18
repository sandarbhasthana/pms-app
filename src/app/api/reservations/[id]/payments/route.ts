import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params {
  params: { id: string };
}

export async function GET(req: Request, { params }: Params) {
  try {
    const payments = await prisma.payment.findMany({
      where: { reservationId: params.id },
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
