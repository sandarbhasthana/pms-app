// lib/payments/utils.ts
import { prisma } from "@/lib/prisma";
import { withTenantContext } from "@/lib/tenant";
import {
  PaymentCalculation,
  PaymentBreakdown,
  DepositCalculation,
  AddOnItem,
  Currency
} from "./types";

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

// ============================================================================
// PAYMENT CALCULATION UTILITIES
// ============================================================================

// Default configuration
const DEFAULT_DEPOSIT_PERCENTAGE = 30;
const DEFAULT_CURRENCY: Currency = "USD";
const DEFAULT_TAX_RATE = 0.1; // 10% tax rate

/**
 * Calculate deposit amount based on total room cost
 */
export function calculateDeposit(
  roomRate: number,
  nights: number,
  depositPercentage: number = DEFAULT_DEPOSIT_PERCENTAGE
): DepositCalculation {
  const subtotal = roomRate * nights;
  const depositAmount =
    Math.round(((subtotal * depositPercentage) / 100) * 100) / 100;
  const remainingAmount = subtotal - depositAmount;

  return {
    subtotal,
    depositPercentage,
    depositAmount,
    remainingAmount,
    currency: DEFAULT_CURRENCY
  };
}

/**
 * Calculate total payment breakdown including taxes and fees
 */
export function calculatePaymentBreakdown(
  roomRate: number,
  nights: number,
  addOns: AddOnItem[] = [],
  taxRate: number = DEFAULT_TAX_RATE
): PaymentBreakdown {
  const roomSubtotal = roomRate * nights;
  const addOnsTotal = addOns.reduce(
    (sum, addon) => sum + addon.amount * (addon.quantity || 1),
    0
  );
  const subtotal = roomSubtotal + addOnsTotal;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + taxAmount;

  return {
    roomRate,
    nights,
    roomSubtotal,
    addOns,
    addOnsTotal,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: DEFAULT_CURRENCY
  };
}

/**
 * Calculate payment with deposit and remaining balance
 */
export function calculatePaymentWithDeposit(
  roomRate: number,
  nights: number,
  addOns: AddOnItem[] = [],
  depositPercentage: number = DEFAULT_DEPOSIT_PERCENTAGE,
  taxRate: number = DEFAULT_TAX_RATE
): PaymentCalculation {
  const breakdown = calculatePaymentBreakdown(
    roomRate,
    nights,
    addOns,
    taxRate
  );
  const deposit = calculateDeposit(breakdown.total, 1, depositPercentage);

  return {
    breakdown,
    deposit: {
      subtotal: breakdown.total,
      depositPercentage,
      depositAmount: deposit.depositAmount,
      remainingAmount: deposit.remainingAmount,
      currency: DEFAULT_CURRENCY
    }
  };
}

/**
 * Convert amount to Stripe cents (multiply by 100)
 */
export function toStripeCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert Stripe cents to dollars (divide by 100)
 */
export function fromStripeCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: Currency = DEFAULT_CURRENCY,
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): {
  isValid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { isValid: false, error: "Payment amount must be greater than 0" };
  }

  if (amount > 999999.99) {
    return { isValid: false, error: "Payment amount exceeds maximum limit" };
  }

  const decimalPlaces = (amount.toString().split(".")[1] || "").length;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: "Payment amount cannot have more than 2 decimal places"
    };
  }

  return { isValid: true };
}

/**
 * Generate payment description for Stripe
 */
export function generatePaymentDescription(
  reservationId: string,
  guestName: string,
  checkIn: Date,
  checkOut: Date,
  propertyName?: string
): string {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  const checkInStr = checkIn.toLocaleDateString();
  const checkOutStr = checkOut.toLocaleDateString();

  let description = `Reservation ${reservationId} - ${guestName} - ${nights} night${
    nights > 1 ? "s" : ""
  } (${checkInStr} to ${checkOutStr})`;

  if (propertyName) {
    description += ` at ${propertyName}`;
  }

  return description;
}
