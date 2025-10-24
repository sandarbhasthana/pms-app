import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/reservations/[id]/payment-methods/[methodId]/set-default
 * Set a payment method as default
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; methodId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId, methodId } = await context.params;

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

    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId: reservation.property.organization.id
      }
    });

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the payment method to verify it exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: methodId }
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    console.log(
      `🔄 Setting card ${methodId} as default for customer ${session.user.email}`
    );

    // Unset all other cards as default for this customer
    const unsetResult = await prisma.paymentMethod.updateMany({
      where: { customerId: session.user.email },
      data: { isDefault: false }
    });
    console.log(`📝 Unset ${unsetResult.count} cards as default`);

    // Set this card as default
    const updatedMethod = await prisma.paymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true }
    });

    console.log(
      `✅ Payment method ${methodId} set as default. isDefault=${updatedMethod.isDefault}`
    );

    // Verify the update
    const allCards = await prisma.paymentMethod.findMany({
      where: { customerId: session.user.email }
    });
    console.log(
      `📊 All cards for customer:`,
      allCards.map((c) => ({ id: c.id, isDefault: c.isDefault }))
    );

    return NextResponse.json(
      {
        success: true,
        paymentMethod: {
          id: updatedMethod.id,
          brand: updatedMethod.cardBrand,
          last4: updatedMethod.cardLast4,
          expMonth: updatedMethod.cardExpMonth,
          expYear: updatedMethod.cardExpYear,
          isDefault: updatedMethod.isDefault
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error setting default payment method:", error);
    return NextResponse.json(
      { error: "Failed to set default payment method" },
      { status: 500 }
    );
  }
}
