// File: src/app/api/reservations/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  withPropertyContext,
  validatePropertyAccess
} from "@/lib/property-context";
import { calculatePaymentStatus } from "@/lib/payments/utils";
import {
  ReservationStatus,
  PropertyRole,
  ReservationSource
} from "@prisma/client";
import { logReservationCreated } from "@/lib/audit-log/reservation-audit";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// Payment data types
interface PaymentData {
  totalAmount: number;
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
  room: {
    id: string;
    name: string;
    type: string;
  };
  property: {
    id: string;
    name: string;
  } | null;
};

// OPTIMIZATION: In-memory cache for reservations
const reservationsCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();
const RESERVATIONS_CACHE_DURATION = 5000; // 5 seconds (reduced from 5 minutes to avoid stale data after deletions)

// Helper function to clear cache for a specific property
export function clearReservationsCacheForProperty(propertyId: string) {
  console.log(`🔍 Clearing cache for property: ${propertyId}`);
  console.log(`📊 Current cache size: ${reservationsCache.size}`);

  const keysToDelete: string[] = [];
  for (const key of reservationsCache.keys()) {
    console.log(`  Checking key: ${key}`);
    if (key.includes(`reservations-${propertyId}-`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    reservationsCache.delete(key);
    console.log(`🗑️ Cleared cache key: ${key}`);
  });

  if (keysToDelete.length > 0) {
    console.log(
      `✅ Cleared ${keysToDelete.length} cache entries for property ${propertyId}`
    );
  } else {
    console.log(`⚠️ No cache entries found for property ${propertyId}`);
  }

  console.log(`📊 Cache size after clearing: ${reservationsCache.size}`);
}

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

    // OPTIMIZATION: Check cache first
    const cacheKey = `reservations-${propertyId}-${status || "all"}-${
      startDate || "all"
    }-${endDate || "all"}-${roomId || "all"}`;
    const now = Date.now();
    const cached = reservationsCache.get(cacheKey);

    console.log(`🔍 Cache lookup for key: ${cacheKey}`);
    console.log(`📊 Cache size: ${reservationsCache.size}`);

    if (cached && now - cached.timestamp < RESERVATIONS_CACHE_DURATION) {
      console.log(`📦 Cache hit for reservations: ${cacheKey}`);
      const response = NextResponse.json(cached.data);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    console.log(`❌ Cache miss for reservations: ${cacheKey}`);

    const reservations: ReservationFromDB[] = await withPropertyContext(
      propertyId!,
      (tx) =>
        tx.reservation.findMany({
          where: {
            propertyId: propertyId,
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
          include: {
            room: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            property: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { checkIn: "asc" }
        })
    );

    // Add paymentStatus to each reservation with property context
    const enriched = await Promise.all(
      reservations.map(async (r: ReservationFromDB) => {
        // Get organization ID for payment status calculation (still needed for backward compatibility)
        const property = await withPropertyContext(propertyId!, async (tx) => {
          return await tx.property.findUnique({
            where: { id: propertyId },
            select: { organizationId: true }
          });
        });

        const paymentStatus = await calculatePaymentStatus(
          r.id,
          property?.organizationId || ""
        );
        return { ...r, paymentStatus };
      })
    );

    const result = {
      count: enriched.length,
      reservations: enriched
    };

    // OPTIMIZATION: Store in cache
    reservationsCache.set(cacheKey, { data: result, timestamp: Date.now() });

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
            status: { in: ["CONFIRMED", "IN_HOUSE"] },
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
          }
        });
      }
    );

    if (conflictingReservations.length > 0) {
      return NextResponse.json(
        {
          error: "Room is not available for the selected dates",
          conflicts: conflictingReservations.map((r) => ({
            id: r.id,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            guestName: r.guestName
          }))
        },
        { status: 409 }
      );
    }

    const reservation = await withPropertyContext(propertyId!, async (tx) => {
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
          status: "CONFIRMED",
          // Add payment-related fields using correct schema fields
          amountCaptured:
            payment?.paymentMethod === "card"
              ? Math.round((payment.totalAmount || 0) * 100)
              : null,
          depositAmount: payment?.totalAmount
            ? Math.round(payment.totalAmount * 100)
            : null,
          paymentStatus:
            payment?.paymentMethod === "card"
              ? "PAID"
              : payment?.paymentMethod === "cash"
              ? "UNPAID"
              : payment?.paymentMethod === "bank_transfer"
              ? "UNPAID"
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

      // Create payment record if payment data exists
      if (payment && payment.totalAmount > 0) {
        console.log("Creating payment record for:", payment);
        console.log("Payment creditCard data:", payment.creditCard);
        let paymentMethodRecord = null;

        // For card payments, validate payment data first
        if (payment.paymentMethod === "card") {
          console.log("Validating card payment data...");
          console.log("payment.creditCard exists:", !!payment.creditCard);
          console.log(
            "paymentMethodId exists:",
            payment.creditCard?.paymentMethodId
          );

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
        }

        try {
          // Create PaymentMethod record for card payments
          if (payment.paymentMethod === "card" && payment.creditCard) {
            console.log("Creating PaymentMethod record:", payment.creditCard);
            paymentMethodRecord = await tx.paymentMethod.create({
              data: {
                customerId: guestName || "unknown", // Using guest name as customer ID for now
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

          // Create Payment record
          console.log("Creating Payment record...");
          await tx.payment.create({
            data: {
              reservationId: newReservation.id,
              type: "payment",
              method: payment.paymentMethod,
              status:
                payment.paymentMethod === "card" ? "COMPLETED" : "PENDING",
              amount: payment.totalAmount,
              currency: "INR",
              paymentMethodId: paymentMethodRecord?.id,
              description: `Payment for reservation ${newReservation.id}`,
              processedAt: payment.paymentMethod === "card" ? new Date() : null
            }
          });
          console.log("Payment record created successfully");
        } catch (paymentError) {
          console.error("Error creating payment records:", paymentError);
          // Don't throw here - let the reservation be created even if payment record fails
        }
      }

      // Process addons data if provided
      if (addons) {
        console.log("Processing addons data:", addons);

        // Store addons information in reservation notes
        const addonsList = [];
        if (addons.extraBed) addonsList.push("Extra Bed");
        if (addons.breakfast) addonsList.push("Breakfast");
        if (addons.customAddons) {
          addons.customAddons
            .filter((addon) => addon.selected)
            .forEach((addon) =>
              addonsList.push(`${addon.name} (₹${addon.price})`)
            );
        }

        if (addonsList.length > 0) {
          const addonsNote = `Add-ons: ${addonsList.join(", ")}`;
          console.log("Adding addons to reservation notes:", addonsNote);

          // Update reservation with addons information
          await tx.reservation.update({
            where: { id: newReservation.id },
            data: {
              notes: newReservation.notes
                ? `${newReservation.notes}\n\n${addonsNote}`
                : addonsNote
            }
          });
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
