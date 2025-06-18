// lib/payments/utils.ts
import { prisma } from "@/lib/prisma";

export async function calculatePaymentStatus(reservationId: string): Promise<"PAID" | "PARTIALLY_PAID" | "UNPAID"> {
  const payments = await prisma.payment.findMany({
    where: { reservationId, status: "succeeded" }
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { roomId: true, checkIn: true, checkOut: true }
  });

  if (!reservation) return "UNPAID";

  const numNights = Math.ceil(
    (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  const nightlyRate = 2000; // 💡 placeholder – later: fetch from room/plan
  const expectedTotal = numNights * nightlyRate;

  if (totalPaid === 0) return "UNPAID";
  if (totalPaid < expectedTotal) return "PARTIALLY_PAID";
  return "PAID";
}
