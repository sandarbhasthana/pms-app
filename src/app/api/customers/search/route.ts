import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust if you're using Firestore

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  try {
    const results = await prisma.reservation.findMany({
      where: {
        OR: [
          { guestName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { idNumber: { contains: query, mode: "insensitive" } }
        ]
      },
      take: 5,
      distinct: ["email"],
      orderBy: { checkIn: "desc" }
    });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Customer search failed:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
