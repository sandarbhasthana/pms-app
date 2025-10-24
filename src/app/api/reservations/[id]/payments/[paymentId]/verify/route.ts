import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatePropertyAccess } from "@/lib/property-context";

interface VerifyPaymentRequestBody {
  verificationNotes: string;
}

/**
 * PATCH /api/reservations/[id]/payments/[paymentId]/verify
 * Verify a pending payment (cash/bank transfer) and mark it as completed
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    console.log("🔵 Payment Verification API called");

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error("❌ Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId, paymentId } = await context.params;
    console.log(
      `📝 Reservation ID: ${reservationId}, Payment ID: ${paymentId}`
    );

    const { verificationNotes }: VerifyPaymentRequestBody = await req.json();

    // Validate property access (FRONT_DESK role required)
    const validation = await validatePropertyAccess(req, "FRONT_DESK");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        reservation: {
          select: { id: true, propertyId: true }
        }
      }
    });

    if (!payment) {
      console.error(`❌ Payment not found: ${paymentId}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify payment belongs to the correct reservation
    if (payment.reservationId !== reservationId) {
      console.error(
        `❌ Payment ${paymentId} does not belong to reservation ${reservationId}`
      );
      return NextResponse.json(
        { error: "Payment does not belong to this reservation" },
        { status: 400 }
      );
    }

    // Verify payment belongs to the correct property
    if (payment.reservation.propertyId !== propertyId) {
      console.error(
        `❌ Payment belongs to different property: ${payment.reservation.propertyId}`
      );
      return NextResponse.json(
        { error: "Unauthorized - payment belongs to different property" },
        { status: 403 }
      );
    }

    // Only allow verifying PENDING payments
    if (payment.status !== "PENDING") {
      console.error(`❌ Cannot verify payment with status: ${payment.status}`);
      return NextResponse.json(
        {
          error: `Payment is already ${payment.status}. Only PENDING payments can be verified.`
        },
        { status: 400 }
      );
    }

    // Update payment status to COMPLETED
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        notes: verificationNotes || null
      }
    });

    console.log(`✅ Payment verified:`, {
      id: updatedPayment.id,
      status: updatedPayment.status,
      processedAt: updatedPayment.processedAt,
      notes: updatedPayment.notes
    });

    return NextResponse.json(
      {
        success: true,
        payment: updatedPayment,
        message: "Payment verified successfully"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify payment"
      },
      { status: 500 }
    );
  }
}
