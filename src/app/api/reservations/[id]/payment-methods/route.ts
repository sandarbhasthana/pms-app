import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

interface SavePaymentMethodRequest {
  stripePaymentMethodId: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  saveCard?: boolean;
  setAsDefault?: boolean;
  cardholderName?: string;
}

/**
 * POST /api/reservations/[id]/payment-methods
 * Save a payment method for a reservation
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId } = await context.params;
    const {
      stripePaymentMethodId,
      cardBrand,
      cardLast4,
      cardExpMonth,
      cardExpYear,
      saveCard = false,
      setAsDefault = false,
      cardholderName = ""
    }: SavePaymentMethodRequest = await req.json();

    if (!saveCard || !stripePaymentMethodId) {
      return NextResponse.json(
        { error: "Card save not requested or missing payment method ID" },
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
      return NextResponse.json(
        { error: "Access denied to this reservation" },
        { status: 403 }
      );
    }

    // Get Stripe payment method details if not provided
    let paymentMethodDetails = {
      brand: cardBrand,
      last4: cardLast4,
      expMonth: cardExpMonth,
      expYear: cardExpYear
    };

    if (!cardBrand || !cardLast4) {
      try {
        const stripePaymentMethod = await stripe.paymentMethods.retrieve(
          stripePaymentMethodId
        );

        if (stripePaymentMethod.type === "card" && stripePaymentMethod.card) {
          paymentMethodDetails = {
            brand: stripePaymentMethod.card.brand,
            last4: stripePaymentMethod.card.last4,
            expMonth: stripePaymentMethod.card.exp_month,
            expYear: stripePaymentMethod.card.exp_year
          };
        }
      } catch (error) {
        console.error("Error fetching Stripe payment method:", error);
        // Continue with provided details
      }
    }

    // Check if this is the first card for this customer
    const existingCards = await prisma.paymentMethod.findMany({
      where: { customerId: session.user.email }
    });

    const isFirstCard = existingCards.length === 0;
    const shouldSetAsDefault = setAsDefault || isFirstCard;

    // If setting as default, unset other cards
    if (shouldSetAsDefault) {
      await prisma.paymentMethod.updateMany({
        where: { customerId: session.user.email },
        data: { isDefault: false }
      });
    }

    // Calculate gradient index for new card (based on number of existing cards)
    const nextGradientIndex = existingCards.length;

    // Create or update payment method
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: { stripePaymentMethodId },
      update: {
        cardBrand: paymentMethodDetails.brand,
        cardLast4: paymentMethodDetails.last4,
        cardExpMonth: paymentMethodDetails.expMonth,
        cardExpYear: paymentMethodDetails.expYear,
        cardholderName: cardholderName || undefined,
        isDefault: shouldSetAsDefault
      },
      create: {
        customerId: session.user.email,
        stripePaymentMethodId,
        type: "card",
        cardBrand: paymentMethodDetails.brand,
        cardLast4: paymentMethodDetails.last4,
        cardExpMonth: paymentMethodDetails.expMonth,
        cardExpYear: paymentMethodDetails.expYear,
        cardholderName: cardholderName || undefined,
        isDefault: shouldSetAsDefault,
        gradientIndex: nextGradientIndex
      }
    });

    console.log(`✅ Payment method saved for reservation ${reservationId}`);

    return NextResponse.json(
      {
        success: true,
        paymentMethod: {
          id: paymentMethod.id,
          brand: paymentMethod.cardBrand,
          last4: paymentMethod.cardLast4,
          expMonth: paymentMethod.cardExpMonth,
          expYear: paymentMethod.cardExpYear,
          cardholderName: paymentMethod.cardholderName,
          isDefault: paymentMethod.isDefault,
          createdAt: paymentMethod.createdAt
        },
        isFirstCard
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving payment method:", error);
    return NextResponse.json(
      { error: "Failed to save payment method" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservations/[id]/payment-methods
 * Get all payment methods for a reservation
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId } = await context.params;

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

    // Verify user has access
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId: reservation.property.organization.id
      }
    });

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get payment methods for this customer (user)
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { customerId: session.user.email },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    console.log(
      `📋 Fetching payment methods for ${session.user.email}:`,
      paymentMethods.map((pm) => ({ id: pm.id, isDefault: pm.isDefault }))
    );

    const formattedMethods = paymentMethods.map((pm) => ({
      id: pm.id,
      brand: pm.cardBrand,
      last4: pm.cardLast4,
      expMonth: pm.cardExpMonth,
      expYear: pm.cardExpYear,
      isDefault: pm.isDefault,
      gradientIndex: pm.gradientIndex,
      createdAt: pm.createdAt
    }));

    return NextResponse.json(
      { paymentMethods: formattedMethods },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}
