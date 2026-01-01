/**
 * Channex Room Types API
 *
 * GET /api/channex/room-types?propertyId=xxx
 * Fetches existing room types from Channex for dropdown selection
 *
 * POST /api/channex/room-types
 * Creates a new room type in Channex from PMS room type data
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

    // Get Channex property to get the channexPropertyId
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (!channexProperty) {
      return NextResponse.json(
        { error: "Property not connected to Channex" },
        { status: 404 }
      );
    }

    // Fetch room types from Channex API
    try {
      const client = getChannexClient();
      const channexRoomTypes = await client.getRoomTypes(
        channexProperty.channexPropertyId
      );

      return NextResponse.json({
        roomTypes: channexRoomTypes.map((rt) => ({
          id: rt.id,
          name: rt.title || rt.id,
          occupancy: rt.occ_adults,
          description: rt.content?.description
        }))
      });
    } catch (apiError) {
      console.error("Channex API error:", apiError);
      // Return empty array if API fails (e.g., no room types yet)
      return NextResponse.json({ roomTypes: [] });
    }
  } catch (error) {
    console.error("Error fetching Channex room types:", error);
    return NextResponse.json(
      { error: "Failed to fetch Channex room types" },
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
    const { propertyId, roomTypeId } = body;

    if (!propertyId || !roomTypeId) {
      return NextResponse.json(
        { error: "propertyId and roomTypeId are required" },
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

    // Get PMS room type data
    const pmsRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        _count: { select: { rooms: true } }
      }
    });

    if (!pmsRoomType) {
      return NextResponse.json(
        { error: "Room type not found" },
        { status: 404 }
      );
    }

    // Create room type in Channex
    const client = getChannexClient();
    const channexRoomType = await client.createRoomType({
      property_id: channexProperty.channexPropertyId,
      title: pmsRoomType.name,
      count_of_rooms: pmsRoomType._count.rooms,
      occ_adults: pmsRoomType.maxAdults,
      occ_children: pmsRoomType.maxChildren,
      occ_infants: 0,
      default_occupancy: pmsRoomType.adultsIncluded,
      content: {
        description: pmsRoomType.description || `${pmsRoomType.name} room type`
      }
    });

    // Update the mapping with the new Channex room type ID
    await prisma.channexRoomTypeMapping.upsert({
      where: {
        channexPropertyId_roomTypeId: {
          channexPropertyId: channexProperty.id,
          roomTypeId: roomTypeId
        }
      },
      create: {
        channexPropertyId: channexProperty.id,
        roomTypeId: roomTypeId,
        channexRoomTypeId: channexRoomType.id,
        channexRoomTypeName: channexRoomType.title,
        isActive: true
      },
      update: {
        channexRoomTypeId: channexRoomType.id,
        channexRoomTypeName: channexRoomType.title,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      channexRoomType: {
        id: channexRoomType.id,
        name: channexRoomType.title
      }
    });
  } catch (error) {
    console.error("Error creating Channex room type:", error);
    return NextResponse.json(
      { error: "Failed to create room type in Channex" },
      { status: 500 }
    );
  }
}

