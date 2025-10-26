// File: src/app/api/reservations/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import {
  ReservationStatus,
  PropertyRole,
  ReservationSource
} from "@prisma/client";
import { logReservationCreated } from "@/lib/audit-log/reservation-audit";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { reservationsCache } from "@/lib/reservations/cache";

// Payment data types
interface PaymentData {
  totalAmount: number;
  paymentMethod: "card" | "cash" | "bank_transfer" | "pay_at_checkin";
  creditCard?: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    paymentMethodId: string;
    paymentIntentId?: string;
    stripePaymentIntentId?: string;
  };
}

// Addons data types
interface AddonsData {
  extraBed: boolean;
  breakfast: boolean;
  customAddons: Array<{
    id: string;
    name: string;
    price: number;
    selected: boolean;
  }>;
}

// Type for the reservation data returned from the database query
type ReservationFromDB = {
  id: string;
  guestName: string | null;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  status: string;
  notes: string | null;
  email: string | null;
  phone: string | null;
  depositAmount: number | null;
  paidAmount: number | null;
  paymentStatus: string | null;
  room: {
    id: string;
    name: string;
    type: string;
    pricing: {
      basePrice: number;
    } | null;
  };
  property: {
    id: string;
    name: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
  addons?: Array<{
    id: string;
    price: number;
    quantity: number | null;
  }>;
};

export async function GET(req: NextRequest) {
  try {
    // console.log("🔍 GET /api/reservations - Starting request");
    // console.log("🔍 Request URL:", req.url);
    // console.log(
    //   "🔍 Request headers:",
    //   Object.fromEntries(req.headers.entries())
    // );

    // Validate property access
    const validation = await validatePropertyAccess(req);
    //console.log("🔍 Property validation result:", validation);

    if (!validation.success) {
      console.error("❌ Property validation failed:", validation.error);
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;
    // console.log("GET /api/reservations, resolved propertyId:", propertyId);

    // Parse query parameters for filtering
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    // Support both parameter names: calendar sends 'start'/'end', others send 'startDate'/'endDate'
    const startDate =
      url.searchParams.get("start") || url.searchParams.get("startDate");
    const endDate =
      url.searchParams.get("end") || url.searchParams.get("endDate");
    const roomId = url.searchParams.get("roomId");

    // console.log("🔍 Query parameters:", { status, startDate, endDate, roomId });

    // OPTIMIZATION: Check cache first (DISABLED for debugging)
    // const cacheKey = `reservations-${propertyId}-${status || "all"}-${
    //   startDate || "all"
    // }-${endDate || "all"}-${roomId || "all"}`;
    // const now = Date.now();
    // const cached = reservationsCache.get(cacheKey);

    // console.log(`🔍 Cache lookup for key: ${cacheKey}`);
    // console.log(`📊 Cache size: ${reservationsCache.size}`);

    // if (cached && now - cached.timestamp < RESERVATIONS_CACHE_DURATION) {
    //   console.log(`📦 Cache hit for reservations: ${cacheKey}`);
    //   const response = NextResponse.json(cached.data);
    //   response.headers.set("X-Cache", "HIT");
    //   return response;
    // }

    // console.log(`❌ Cache miss for reservations: ${cacheKey}`);

    const reservations: ReservationFromDB[] = await withPropertyContext(
      propertyId!,
      (tx) =>
        tx.reservation.findMany({
          where: {
            propertyId: propertyId,
            // Exclude soft-deleted reservations (CANCELLED and NO_SHOW with deletedAt set)
            deletedAt: null,
            ...(status && { status: status as ReservationStatus }),
            ...(roomId && { roomId }),
            ...(startDate &&
              endDate && {
                OR: [
                  {
                    checkIn: {
                      gte: new Date(startDate),
                      lte: new Date(endDate)
                    }
                  },
                  {
                    checkOut: {
                      gte: new Date(startDate),
                      lte: new Date(endDate)
                    }
                  },
                  {
                    AND: [
                      { checkIn: { lte: new Date(startDate) } },
                      { checkOut: { gte: new Date(endDate) } }
                    ]
                  }
                ]
              })
          },
          select: {
            id: true,
            guestName: true,
            roomId: true,
            checkIn: true,
            checkOut: true,
            adults: true,
            children: true,
            status: true,
            notes: true,
            email: true,
            phone: true,
            depositAmount: true,
            paidAmount: true,
            paymentStatus: true, // Include the stored payment status
            room: {
              select: {
                id: true,
                name: true,
                type: true,
                pricing: {
                  select: {
                    basePrice: true
                  }
                }
              }
            },
            property: {
              select: {
                id: true,
                name: true
              }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true
              }
            },
            addons: {
              select: {
                id: true,
                price: true,
                quantity: true
              }
            }
          },
          orderBy: { checkIn: "asc" }
        })
    );

    // Add paymentStatus to each reservation - use stored value or calculate if missing
    const enriched = reservations.map((r: ReservationFromDB) => {
      // Use stored paymentStatus if available
      if (r.paymentStatus) {
        return {
          ...r,
          paymentStatus: r.paymentStatus,
          paidAmount: r.paidAmount || 0
        };
      }

      // Fallback: Calculate payment status if not stored (for old reservations)
      const totalPaid = r.payments.reduce((sum, p) => sum + p.amount, 0);

      const nights =
        (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) /
        (1000 * 60 * 60 * 24);

      const basePrice = r.room.pricing?.basePrice || 2000;
      const roomTotal = basePrice * nights;

      const addonsTotal = (r.addons || []).reduce((sum, addon) => {
        return sum + addon.price * (addon.quantity || 1);
      }, 0);

      const totalDue = roomTotal + addonsTotal;

      let paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
      if (totalPaid === 0) {
        paymentStatus = "UNPAID";
      } else if (totalPaid >= totalDue) {
        paymentStatus = "PAID";
      } else {
        paymentStatus = "PARTIALLY_PAID";
      }

      return {
        ...r,
        paymentStatus,
        paidAmount: r.paidAmount !== null ? r.paidAmount : totalPaid
      };
    });

    const result = {
      count: enriched.length,
      reservations: enriched
    };

    // OPTIMIZATION: Store in cache (DISABLED for debugging)
    // reservationsCache.set(cacheKey, { data: result, timestamp: Date.now() });

    const response = NextResponse.json(result);
    response.headers.set("X-Cache", "MISS");
    return response;
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate property access with required role
    const validation = await validatePropertyAccess(
      req,
      PropertyRole.FRONT_DESK
    );
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    const {
      roomId,
      guestName,
      checkIn,
      checkOut,
      adults,
      children,
      notes,
      phone,
      email,
      idType,
      idNumber,
      issuingCountry,
      source,
      payment,
      addons
    }: {
      roomId: string;
      guestName: string;
      checkIn: string;
      checkOut: string;
      adults: number;
      children?: number;
      notes?: string;
      phone?: string;
      email?: string;
      idType?: string;
      idNumber?: string;
      issuingCountry?: string;
      source?: ReservationSource;
      payment?: PaymentData;
      addons?: AddonsData;
    } = await req.json();

    if (!roomId || !guestName || !checkIn || !checkOut || adults == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that the room belongs to the same property
    const room = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.room.findUnique({
        where: { id: roomId },
        select: { propertyId: true, name: true }
      });
    });

    if (!room || room.propertyId !== propertyId) {
      return NextResponse.json(
        { error: "Room not found in this property" },
        { status: 400 }
      );
    }

    // Get property details for organizationId (still needed for backward compatibility)
    const property = await withPropertyContext(propertyId!, async (tx) => {
      return await tx.property.findUnique({
        where: { id: propertyId },
        select: { organizationId: true }
      });
    });

    if (!property) {
      return new NextResponse("Property not found", { status: 404 });
    }

    // Check for room availability (basic overlap check)
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const conflictingReservations = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.reservation.findMany({
          where: {
            roomId: roomId,
            propertyId: propertyId,
            // Only check active reservations - exclude CANCELLED and NO_SHOW (soft-deleted)
            status: {
              in: [
                ReservationStatus.CONFIRMED,
                ReservationStatus.IN_HOUSE,
                ReservationStatus.CONFIRMATION_PENDING
              ]
            },
            // Exclude soft-deleted reservations
            deletedAt: null,
            OR: [
              {
                AND: [
                  { checkIn: { lte: checkInDate } },
                  { checkOut: { gt: checkInDate } }
                ]
              },
              {
                AND: [
                  { checkIn: { lt: checkOutDate } },
                  { checkOut: { gte: checkOutDate } }
                ]
              },
              {
                AND: [
                  { checkIn: { gte: checkInDate } },
                  { checkOut: { lte: checkOutDate } }
                ]
              }
            ]
          },
          select: {
            id: true,
            guestName: true,
            checkIn: true,
            checkOut: true,
            status: true
          }
        });
      }
    );

    // Also check ALL reservations for this room to debug
    const allReservationsForRoom = await withPropertyContext(
      propertyId!,
      async (tx) => {
        return await tx.reservation.findMany({
          where: {
            roomId: roomId,
            propertyId: propertyId
          },
          select: {
            id: true,
            guestName: true,
            checkIn: true,
            checkOut: true,
            status: true
          }
        });
      }
    );

    console.log(`🔍 Conflict check for room ${roomId}:`, {
      checkInDate,
      checkOutDate,
      conflictCount: conflictingReservations.length,
      conflicts: conflictingReservations.map((r) => ({
        id: r.id,
        status: r.status,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guestName: r.guestName
      })),
      allReservationsForRoom: allReservationsForRoom.map((r) => ({
        id: r.id,
        status: r.status,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guestName: r.guestName
      }))
    });

    if (conflictingReservations.length > 0) {
      return NextResponse.json(
        {
          error: "Room is not available for the selected dates",
          conflicts: conflictingReservations.map((r) => ({
            id: r.id,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            guestName: r.guestName,
            status: r.status
          }))
        },
        { status: 409 }
      );
    }

    const reservation = await withPropertyContext(propertyId!, async (tx) => {
      // Determine reservation status based on payment method
      // "pay_at_checkin" creates reservation in CONFIRMATION_PENDING state
      // All other payment methods create in CONFIRMED state
      const reservationStatus =
        payment?.paymentMethod === "pay_at_checkin"
          ? "CONFIRMATION_PENDING"
          : "CONFIRMED";

      // Create the reservation
      const newReservation = await tx.reservation.create({
        data: {
          organizationId: property.organizationId, // Keep for backward compatibility
          propertyId: propertyId, // NEW: Associate with property
          roomId,
          guestName,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          adults,
          children: children || 0,
          notes,
          phone,
          email,
          idType,
          idNumber,
          issuingCountry,
          source: (source as ReservationSource) || ReservationSource.WEBSITE,
          status: reservationStatus,
          // Add payment-related fields using correct schema fields
          amountCaptured:
            payment?.paymentMethod === "card"
              ? Math.round((payment.totalAmount || 0) * 100)
              : null,
          depositAmount: payment?.totalAmount
            ? Math.round(payment.totalAmount * 100)
            : null,
          paidAmount:
            payment?.paymentMethod === "pay_at_checkin"
              ? 0 // Not paid yet
              : payment?.totalAmount || 0, // Full amount paid for card/cash/bank_transfer
          paymentStatus:
            payment?.paymentMethod === "pay_at_checkin"
              ? "UNPAID" // Only pay_at_checkin is unpaid
              : payment?.totalAmount && payment.totalAmount > 0
              ? "PAID" // Card, cash, and bank_transfer are paid immediately
              : "UNPAID"
        },
        include: {
          room: {
            select: { id: true, name: true, type: true }
          },
          property: {
            select: { id: true, name: true }
          }
        }
      });

      // Create payment record for all payment methods EXCEPT pay_at_checkin
      // pay_at_checkin: payment record created when payment is actually made at check-in
      if (
        payment &&
        payment.totalAmount > 0 &&
        payment.paymentMethod !== "pay_at_checkin"
      ) {
        console.log(
          `Creating payment record for ${payment.paymentMethod} payment:`,
          payment
        );

        try {
          let paymentMethodRecord = null;

          // For card payments, create PaymentMethod record
          if (payment.paymentMethod === "card") {
            console.log("Payment creditCard data:", payment.creditCard);

            // Validate card payment data
            if (!payment.creditCard || !payment.creditCard.paymentMethodId) {
              console.error("Missing payment data:", {
                hasCreditCard: !!payment.creditCard,
                creditCardData: payment.creditCard,
                paymentMethodId: payment.creditCard?.paymentMethodId,
                fullPaymentData: payment
              });
              throw new Error(
                "Card payment failed - missing payment method details. Please try again."
              );
            }

            console.log("Creating PaymentMethod record:", payment.creditCard);
            paymentMethodRecord = await tx.paymentMethod.create({
              data: {
                customerId: guestName || "unknown",
                stripePaymentMethodId: payment.creditCard.paymentMethodId,
                type: "card",
                cardBrand: payment.creditCard.brand,
                cardLast4: payment.creditCard.last4,
                cardExpMonth: payment.creditCard.expiryMonth,
                cardExpYear: payment.creditCard.expiryYear,
                isDefault: true
              }
            });
            console.log("PaymentMethod created:", paymentMethodRecord.id);
          }

          // Create Payment record for card, cash, and bank_transfer
          console.log(
            `Creating Payment record for ${payment.paymentMethod} payment...`
          );
          await tx.payment.create({
            data: {
              reservationId: newReservation.id,
              type: "payment",
              method: payment.paymentMethod,
              status: "COMPLETED",
              amount: payment.totalAmount,
              currency: "INR",
              paymentMethodId: paymentMethodRecord?.id,
              description: `${payment.paymentMethod.toUpperCase()} payment for reservation ${
                newReservation.id
              }`,
              processedAt: new Date()
            }
          });
          console.log(
            `${payment.paymentMethod} payment record created successfully`
          );
        } catch (paymentError) {
          console.error(
            `Error creating ${payment.paymentMethod} payment records:`,
            paymentError
          );
          // Don't throw here - let the reservation be created even if payment record fails
        }
      } else if (payment?.paymentMethod === "pay_at_checkin") {
        console.log(
          `ℹ️ Payment method 'pay_at_checkin' selected - payment record will be created when payment is actually made at check-in`
        );
      }

      // Process addons data if provided
      if (addons) {
        console.log("Processing addons data:", addons);

        const addonsToCreate = [];

        // Add extra bed if selected
        if (addons.extraBed) {
          addonsToCreate.push({
            type: "extra_bed",
            name: "Extra Bed",
            price: 500, // Default price, can be made configurable
            quantity: 1,
            totalAmount: 500
          });
        }

        // Add breakfast if selected
        if (addons.breakfast) {
          addonsToCreate.push({
            type: "breakfast",
            name: "Breakfast",
            price: 300, // Default price, can be made configurable
            quantity: 1,
            totalAmount: 300
          });
        }

        // Add custom addons
        if (addons.customAddons) {
          addons.customAddons
            .filter((addon) => addon.selected)
            .forEach((addon) => {
              addonsToCreate.push({
                type: "custom",
                name: addon.name,
                price: addon.price,
                quantity: 1,
                totalAmount: addon.price
              });
            });
        }

        // Create addon records in the database
        if (addonsToCreate.length > 0) {
          console.log("Creating addon records:", addonsToCreate);
          for (const addon of addonsToCreate) {
            await tx.reservationAddon.create({
              data: {
                reservationId: newReservation.id,
                ...addon
              }
            });
          }
        }
      }

      return newReservation;
    });

    // Log reservation creation to audit trail
    try {
      const session = await getServerSession();
      const userId = session?.user?.id || null;

      await logReservationCreated(
        prisma,
        reservation.id,
        propertyId!,
        guestName,
        userId
      );
    } catch (auditError) {
      console.error("Error logging reservation creation:", auditError);
      // Don't throw - audit logging failure shouldn't block reservation creation
    }

    // OPTIMIZATION: Invalidate cache after creating new reservation
    // Clear all cache entries for this property since we don't know which date ranges are affected
    for (const key of reservationsCache.keys()) {
      if (key.startsWith(`reservations-${propertyId}`)) {
        reservationsCache.delete(key);
      }
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("POST /api/reservations error:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorDetails =
      error instanceof Error && error.stack
        ? error.stack
        : "No stack trace available";

    // Try to get request data safely
    let requestData: string | object = "Unable to parse request data";
    try {
      const body = await req.clone().json();
      requestData = {
        roomId: body.roomId || "unknown",
        guestName: body.guestName || "unknown",
        checkIn: body.checkIn || "unknown",
        checkOut: body.checkOut || "unknown",
        payment: body.payment ? "provided" : "none"
      };
    } catch {
      requestData = "Failed to parse request body";
    }

    console.error("Error details:", {
      message: errorMessage,
      stack: errorDetails,
      requestData
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: "Check server logs for more information"
      },
      { status: 500 }
    );
  }
}
