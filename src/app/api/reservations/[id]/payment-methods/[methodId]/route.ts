import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/reservations/[id]/payment-methods/[methodId]
 * Delete a payment method
 */
export async function DELETE(
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

    // Delete payment method
    await prisma.paymentMethod.delete({
      where: { id: methodId }
    });

    console.log(`✅ Payment method ${methodId} deleted`);

    return NextResponse.json(
      { success: true, message: "Payment method deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}

