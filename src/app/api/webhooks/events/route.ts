// src/app/api/webhooks/events/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent webhook events (last 50)
    const events = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        stripeEventId: true,
        eventType: true,
        processedAt: true,
        createdAt: true,
        error: true
      }
    });

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        stripeEventId: event.stripeEventId,
        type: event.eventType,
        processed: !event.error, // Consider processed if no error
        createdAt: event.createdAt.toISOString(),
        processedAt: event.processedAt.toISOString(),
        hasError: !!event.error
      }))
    });
  } catch (error) {
    console.error("Error fetching webhook events:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook events" },
      { status: 500 }
    );
  }
}
