import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPropertyContext } from "@/lib/property-context";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearReservationsCacheForProperty } from "@/lib/reservations/cache";

interface PaymentRequestBody {
  amount: number;
  paymentMethod: "card" | "cash" | "bank_transfer";
  creditCard?: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    paymentMethodId: string;
    paymentIntentId?: string;
    stripePaymentIntentId?: string;
  };
  saveCard?: boolean;
  setAsDefault?: boolean;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔵 Payment API called");

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error("❌ Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId } = await context.params;
    console.log(`📝 Reservation ID: ${reservationId}`);

    const {
      amount,
      paymentMethod,
      creditCard,
      saveCard = false,
      setAsDefault = false
    }: PaymentRequestBody = await req.json();

    console.log(`💰 Payment Request:`, {
      amount,
      paymentMethod,
      hasCard: !!creditCard
    });

    if (!reservationId || !amount || !paymentMethod) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      console.error("❌ Invalid amount");
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Fetch the reservation
    console.log("🔍 Fetching reservation...");
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        room: {
          include: {
            pricing: true,
            roomType: true
          }
        },
        property: true,
        payments: true
      }
    });

    if (!reservation) {
      console.error(`❌ Reservation not found: ${reservationId}`);
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Reservation found:`, {
      id: reservation.id,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      paidAmount: reservation.paidAmount
    });

    // Verify user has access to this property
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        user: { email: session.user.email },
        organizationId: reservation.property.organizationId
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: "Access denied to this property" },
        { status: 403 }
      );
    }

    // Process payment within property context
    const result = await withPropertyContext(
      reservation.propertyId,
      async (tx) => {
        let paymentMethodRecord = null;
        let stripePaymentIntentId = null;

        // Handle card payment
        if (paymentMethod === "card" && creditCard) {
          if (!creditCard.paymentMethodId) {
            throw new Error("Card payment requires payment method ID");
          }

          // Store payment method if requested
          if (saveCard) {
            paymentMethodRecord = await tx.paymentMethod.upsert({
              where: { stripePaymentMethodId: creditCard.paymentMethodId },
              update: {
                cardBrand: creditCard.brand,
                cardLast4: creditCard.last4,
                cardExpMonth: creditCard.expiryMonth,
                cardExpYear: creditCard.expiryYear,
                isDefault: setAsDefault
              },
              create: {
                customerId: session.user.email as string,
                stripePaymentMethodId: creditCard.paymentMethodId,
                type: "card",
                cardBrand: creditCard.brand,
                cardLast4: creditCard.last4,
                cardExpMonth: creditCard.expiryMonth,
                cardExpYear: creditCard.expiryYear,
                isDefault: setAsDefault
              }
            });

            // If setting as default, unset other defaults
            if (setAsDefault) {
              await tx.paymentMethod.updateMany({
                where: {
                  customerId: session.user.email as string,
                  id: { not: paymentMethodRecord.id }
                },
                data: { isDefault: false }
              });
            }
          }

          stripePaymentIntentId = creditCard.stripePaymentIntentId;
        }

        // Calculate total reservation amount based on room pricing and nights
        const checkIn = new Date(reservation.checkIn);
        const checkOut = new Date(reservation.checkOut);
        const nights = Math.max(
          1,
          Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        // Get total reservation amount from depositAmount (which stores the total quoted amount)
        // If not available, calculate from room pricing
        console.log(`🔍 Getting reservation total amount`);
        console.log(`   Reservation Data:`, {
          depositAmount: reservation.depositAmount,
          amountCaptured: reservation.amountCaptured,
          amountHeld: reservation.amountHeld
        });

        let totalReservationAmount = 0;

        try {
          // First priority: Use depositAmount if available (this is the actual quoted amount)
          if (reservation.depositAmount && reservation.depositAmount > 0) {
            totalReservationAmount = reservation.depositAmount / 100; // Convert from cents
            console.log(
              `   ✅ Using Deposit Amount: ₹${totalReservationAmount}`
            );
          } else {
            // Fallback: Calculate from room pricing
            console.log(
              `   ⚠️ Deposit Amount not available, calculating from room pricing...`
            );
            const roomPricing = reservation.room?.pricing;
            const basePricePerNight =
              roomPricing?.basePrice ||
              reservation.room?.roomType?.basePrice ||
              0;

            console.log(
              `   Room Pricing Base Price: ₹${roomPricing?.basePrice || "N/A"}`
            );
            console.log(
              `   Room Type Base Price: ₹${
                reservation.room?.roomType?.basePrice || "N/A"
              }`
            );
            console.log(`   Using Base Price: ₹${basePricePerNight}`);

            const basePrice = basePricePerNight * nights;
            totalReservationAmount = basePrice;
            console.log(
              `   Calculated Base Price (${nights} nights): ₹${basePrice}`
            );
          }

          if (totalReservationAmount <= 0) {
            throw new Error(
              `Invalid total reservation amount: ₹${totalReservationAmount}`
            );
          }

          console.log(`💳 Payment Processing:`);
          console.log(
            `   Total Reservation Amount: ₹${totalReservationAmount}`
          );
        } catch (error) {
          console.error(`❌ Error calculating total amount:`, error);
          throw error;
        }

        // Calculate new payment status
        const totalPaid = reservation.payments.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const newTotalPaid = totalPaid + amount;

        console.log(`   Current Paid: ₹${totalPaid}`);
        console.log(`   New Payment: ₹${amount}`);
        console.log(`   New Total Paid: ₹${newTotalPaid}`);

        // Validate that payment doesn't exceed total reservation amount
        if (newTotalPaid > totalReservationAmount) {
          console.error(
            `❌ Overpayment rejected: ${newTotalPaid} > ${totalReservationAmount}`
          );
          throw new Error(
            `Payment amount exceeds reservation total. Total due: ₹${totalReservationAmount.toFixed(
              2
            )}, Already paid: ₹${totalPaid.toFixed(2)}, Remaining: ₹${(
              totalReservationAmount - totalPaid
            ).toFixed(2)}`
          );
        }
        const newPaymentStatus =
          newTotalPaid >= totalReservationAmount
            ? "PAID"
            : newTotalPaid > 0
            ? "PARTIALLY_PAID"
            : "UNPAID";

        console.log(`   New Payment Status: ${newPaymentStatus}`);

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            reservationId,
            type: "payment",
            method: paymentMethod,
            status: paymentMethod === "card" ? "COMPLETED" : "PENDING",
            amount,
            currency: "INR",
            paymentMethodId: paymentMethodRecord?.id,
            description: `Payment for reservation ${reservationId}`,
            processedAt: paymentMethod === "card" ? new Date() : null,
            gatewayTxId: stripePaymentIntentId
          }
        });

        // Update reservation status and payment status
        const newStatus =
          newPaymentStatus === "PAID" &&
          reservation.status === "CONFIRMATION_PENDING"
            ? "CONFIRMED"
            : reservation.status;

        console.log(`   Current Status: ${reservation.status}`);
        console.log(`   New Status: ${newStatus}`);
        console.log(`   Auto-confirm: ${newStatus === "CONFIRMED"}`);

        console.log(`📝 Updating reservation with:`, {
          paymentStatus: newPaymentStatus,
          status: newStatus,
          paidAmount: newTotalPaid
        });

        const updatedReservation = await tx.reservation.update({
          where: { id: reservationId },
          data: {
            paymentStatus: newPaymentStatus,
            status: newStatus,
            paidAmount: newTotalPaid
          },
          include: {
            room: true,
            property: true,
            payments: true
          }
        });

        console.log(`✅ Reservation updated:`, {
          id: updatedReservation.id,
          status: updatedReservation.status,
          paymentStatus: updatedReservation.paymentStatus,
          paidAmount: updatedReservation.paidAmount
        });

        return { payment, reservation: updatedReservation };
      }
    );

    if ("payment" in result) {
      console.log(`✅ Payment API returning success:`, {
        paymentId: result.payment.id,
        reservationStatus: result.reservation.status,
        paymentStatus: result.reservation.paymentStatus
      });

      // Clear cache for this property so the calendar gets fresh data
      clearReservationsCacheForProperty(reservation.propertyId);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("❌ Payment processing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process payment"
      },
      { status: 500 }
    );
  }
}
