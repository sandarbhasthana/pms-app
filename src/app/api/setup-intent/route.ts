import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil"
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { error: "Reservation ID is required" },
        { status: 400 }
      );
    }

    // Verify reservation exists and user has access
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { property: { include: { organization: true } } }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this reservation's organization
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId: reservation.property.organization.id
      }
    });

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create a SetupIntent for card collection without payment
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        reservationId,
        userId: session.user.id
      }
    });

    return NextResponse.json(
      { clientSecret: setupIntent.client_secret },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating setup intent:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create setup intent: ${errorMessage}` },
      { status: 500 }
    );
  }
}
