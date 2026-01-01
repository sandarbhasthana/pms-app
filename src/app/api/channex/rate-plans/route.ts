/**
 * Channex Rate Plans API
 *
 * GET /api/channex/rate-plans?propertyId=xxx&channexRoomTypeId=xxx
 * Fetches existing rate plans from Channex for dropdown selection
 *
 * POST /api/channex/rate-plans
 * Creates a new rate plan in Channex from PMS pricing data
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getChannexClient } from "@/lib/channex";

const ALLOWED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ORG_ADMIN,
  UserRole.PROPERTY_MGR
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as UserRole;

    if (!session?.user || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Get Channex property
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (!channexProperty) {
      return NextResponse.json(
        { error: "Property not connected to Channex" },
        { status: 404 }
      );
    }

    // Fetch rate plans from Channex API
    try {
      const client = getChannexClient();
      const channexRatePlans = await client.getRatePlans(
        channexProperty.channexPropertyId
      );

      return NextResponse.json({
        ratePlans: channexRatePlans.map((rp) => ({
          id: rp.id,
          name: rp.title || rp.id,
          roomTypeId: rp.room_type_id,
          currency: rp.currency,
          sellMode: rp.sell_mode
        }))
      });
    } catch (apiError) {
      console.error("Channex API error:", apiError);
      return NextResponse.json({ ratePlans: [] });
    }
  } catch (error) {
    console.error("Error fetching Channex rate plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch Channex rate plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as UserRole;

    if (!session?.user || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, roomTypeId, channexRoomTypeId } = body;

    if (!propertyId || !roomTypeId || !channexRoomTypeId) {
      return NextResponse.json(
        { error: "propertyId, roomTypeId, and channexRoomTypeId are required" },
        { status: 400 }
      );
    }

    // Get Channex property
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (!channexProperty) {
      return NextResponse.json(
        { error: "Property not connected to Channex" },
        { status: 404 }
      );
    }

    // Get PMS room type with pricing data
    const pmsRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });

    if (!pmsRoomType) {
      return NextResponse.json(
        { error: "Room type not found" },
        { status: 404 }
      );
    }

    // Create rate plan in Channex
    const client = getChannexClient();
    const channexRatePlan = await client.createRatePlan({
      property_id: channexProperty.channexPropertyId,
      room_type_id: channexRoomTypeId,
      title: `${pmsRoomType.name} - Standard Rate`,
      currency: pmsRoomType.currency || "USD",
      sell_mode: "per_room",
      rate_mode: "manual",
      options: [
        {
          occupancy: pmsRoomType.adultsIncluded,
          is_primary: true,
          rate: pmsRoomType.basePrice || 100
        }
      ]
    });

    // Get or create the room type mapping
    const roomTypeMapping = await prisma.channexRoomTypeMapping.upsert({
      where: {
        channexPropertyId_roomTypeId: {
          channexPropertyId: channexProperty.id,
          roomTypeId: roomTypeId
        }
      },
      create: {
        channexPropertyId: channexProperty.id,
        roomTypeId: roomTypeId,
        channexRoomTypeId: channexRoomTypeId,
        isActive: true
      },
      update: {}
    });

    // Create rate plan mapping
    await prisma.channexRatePlanMapping.upsert({
      where: {
        roomTypeMappingId_channexRatePlanId: {
          roomTypeMappingId: roomTypeMapping.id,
          channexRatePlanId: channexRatePlan.id
        }
      },
      create: {
        roomTypeMappingId: roomTypeMapping.id,
        channexRatePlanId: channexRatePlan.id,
        channexRatePlanName: channexRatePlan.title,
        isActive: true
      },
      update: {
        channexRatePlanName: channexRatePlan.title,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      channexRatePlan: {
        id: channexRatePlan.id,
        name: channexRatePlan.title
      }
    });
  } catch (error) {
    console.error("Error creating Channex rate plan:", error);
    return NextResponse.json(
      { error: "Failed to create rate plan in Channex" },
      { status: 500 }
    );
  }
}

