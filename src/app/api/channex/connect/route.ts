/**
 * Channex Connect API
 *
 * POST /api/channex/connect
 * Connects a PMS property to a Channex property
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as UserRole;

    if (!session?.user || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, channexPropertyId } = body;

    if (!propertyId || !channexPropertyId) {
      return NextResponse.json(
        { error: "propertyId and channexPropertyId are required" },
        { status: 400 }
      );
    }

    // Verify property exists and user has access
    const property = await prisma.property.findFirst({
      where: { id: propertyId },
      include: { organization: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Check if already connected
    const existingConnection = await prisma.channexProperty.findFirst({
      where: { propertyId }
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: "Property is already connected to Channex" },
        { status: 400 }
      );
    }

    // Verify Channex property ID is valid by calling API
    // Skip validation if no API key is configured or using placeholder (development mode)
    const channexApiKey = process.env.CHANNEX_API_KEY;
    const isDevMode =
      !channexApiKey ||
      channexApiKey === "test_api_key" ||
      channexApiKey.startsWith("your-");

    if (!isDevMode) {
      try {
        const client = getChannexClient();
        await client.getProperty(channexPropertyId);
      } catch (apiError) {
        console.error("Channex API error:", apiError);
        return NextResponse.json(
          {
            error:
              "Invalid Channex Property ID or API connection failed. Please verify your credentials."
          },
          { status: 400 }
        );
      }
    }

    // Get or create ChannexOrganization
    let channexOrg = await prisma.channexOrganization.findFirst({
      where: { organizationId: property.organizationId }
    });

    if (!channexOrg) {
      channexOrg = await prisma.channexOrganization.create({
        data: {
          organization: {
            connect: { id: property.organizationId }
          },
          channexGroupId: null, // Will be set when group is created in Channex
          isActive: true
        }
      });
    }

    // Create ChannexProperty record
    const channexProperty = await prisma.channexProperty.create({
      data: {
        channexOrg: {
          connect: { id: channexOrg.id }
        },
        property: {
          connect: { id: propertyId }
        },
        channexPropertyId,
        syncStatus: "PENDING"
      }
    });

    // Create room type mappings for all room types in the property
    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId }
    });

    if (roomTypes.length > 0) {
      await prisma.channexRoomTypeMapping.createMany({
        data: roomTypes.map((rt) => ({
          channexPropertyId: channexProperty.id,
          roomTypeId: rt.id,
          channexRoomTypeId: null, // To be filled by user in mapping UI
          isActive: false
        }))
      });
    }

    return NextResponse.json({
      success: true,
      message: "Property connected to Channex successfully",
      channexPropertyId: channexProperty.id
    });
  } catch (error) {
    console.error("Error connecting to Channex:", error);
    return NextResponse.json(
      { error: "Failed to connect to Channex" },
      { status: 500 }
    );
  }
}
