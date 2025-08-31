// lib/payments/utils.ts
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant";

export async function calculatePaymentStatus(
  reservationId: string,
  orgId?: string
): Promise<"PAID" | "PARTIALLY_PAID" | "UNPAID"> {
  try {
    // If orgId is provided, use tenant context; otherwise use direct prisma
    const getReservation = async () => {
      if (orgId) {
        return await withTenantContext(orgId, async (tx) => {
          return await tx.reservation.findUnique({
            where: { id: reservationId },
            include: {
              room: {
                include: {
                  pricing: true
                }
              },
              payments: true
            }
          });
        });
      } else {
        // Fallback to direct prisma query (for backward compatibility)
        return await prisma.reservation.findUnique({
          where: { id: reservationId },
          include: {
            room: {
              include: {
                pricing: true
              }
            },
            payments: true
          }
        });
      }
    };

    const reservation = await getReservation();

    if (!reservation || !reservation.room || !reservation.room.pricing) {
      return "UNPAID";
    }

    const { checkIn, checkOut, payments: payments, room } = reservation;

    const nights =
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
      (1000 * 60 * 60 * 24);

    const ratePerNight = room.pricing?.basePrice || 2000; // fallback if missing
    const totalDue = ratePerNight * nights;

    const paid = payments.reduce((sum, p) => sum + p.amount, 0);

    if (paid === 0) return "UNPAID";
    if (paid >= totalDue) return "PAID";
    return "PARTIALLY_PAID";
  } catch (error) {
    console.error("Error calculating payment status:", error);
    return "UNPAID";
  }
}
