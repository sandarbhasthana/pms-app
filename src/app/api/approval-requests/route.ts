// File: src/app/api/approval-requests/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePropertyAccess } from "@/lib/property-context";

/**
 * POST /api/approval-requests
 * Create a new approval request
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { reservationId, requestType, requestReason, metadata } =
      await req.json();

    if (!reservationId || !requestType || !requestReason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get reservation to determine property
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { propertyId: true, guestName: true }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Validate property access (no specific role required - any user with property access can request approval)
    const validation = await validatePropertyAccess(req);
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    // Create approval request
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        reservationId,
        propertyId: reservation.propertyId,
        requestType,
        requestReason,
        requestedBy: session.user.id,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: {
        requestedByUser: {
          select: { id: true, name: true, email: true }
        },
        reservation: {
          select: { id: true, guestName: true }
        }
      }
    });

    console.log(`✅ Approval request created:`, approvalRequest);

    return NextResponse.json(approvalRequest, { status: 201 });
  } catch (error) {
    console.error("POST /api/approval-requests error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/approval-requests
 * Get pending approval requests for a property
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Validate property access
    const validation = await validatePropertyAccess(req, "PROPERTY_MGR");
    if (!validation.success) {
      return new NextResponse(validation.error, {
        status: validation.error === "Unauthorized" ? 401 : 403
      });
    }

    const { propertyId } = validation;

    // Get query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "PENDING";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get approval requests
    const approvalRequests = await prisma.approvalRequest.findMany({
      where: {
        propertyId: propertyId!,
        status
      },
      orderBy: { requestedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        requestedByUser: {
          select: { id: true, name: true, email: true }
        },
        approvedByUser: {
          select: { id: true, name: true, email: true }
        },
        reservation: {
          select: { id: true, guestName: true, checkIn: true, checkOut: true }
        }
      }
    });

    // Get total count
    const totalCount = await prisma.approvalRequest.count({
      where: {
        propertyId: propertyId!,
        status
      }
    });

    return NextResponse.json({
      approvalRequests,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error("GET /api/approval-requests error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
