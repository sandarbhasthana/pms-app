// File: src/app/api/settings/automation/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AutomationSettingsSchema = z.object({
  propertyId: z.string(),
  checkInTime: z.string(),
  checkOutTime: z.string(),
  noShowGraceHours: z.number().min(0),
  noShowLookbackDays: z.number().min(1),
  lateCheckoutGraceHours: z.number().min(0),
  lateCheckoutLookbackDays: z.number().min(1),
  lateCheckoutFee: z.number().min(0),
  lateCheckoutFeeType: z.enum([
    "FLAT_RATE",
    "HOURLY",
    "PERCENTAGE_OF_ROOM_RATE",
    "PERCENTAGE_OF_TOTAL_BILL"
  ]),
  confirmationPendingTimeoutHours: z.number().min(1),
  auditLogRetentionDays: z.number().min(30)
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body, null, 2));

    const result = AutomationSettingsSchema.safeParse(body);

    if (!result.success) {
      console.error("Validation failed:", result.error.flatten());
      return NextResponse.json(
        { error: result.error.flatten() },
        { status: 400 }
      );
    }

    console.log("Validation successful:", result.data);

    const data = result.data;

    // 3. Verify property exists and user has access
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      select: { id: true, organizationId: true }
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // 4. Check if user has access to this property's organization
    const userOrg = await prisma.userOrg.findFirst({
      where: {
        userId: session.user.id,
        organizationId: property.organizationId
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: "Forbidden - No access to this property" },
        { status: 403 }
      );
    }

    // 5. Update or create PropertySettings with automation fields
    const settings = await prisma.propertySettings.upsert({
      where: { propertyId: data.propertyId },
      update: {
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        noShowGraceHours: data.noShowGraceHours,
        noShowLookbackDays: data.noShowLookbackDays,
        lateCheckoutGraceHours: data.lateCheckoutGraceHours,
        lateCheckoutLookbackDays: data.lateCheckoutLookbackDays,
        lateCheckoutFee: data.lateCheckoutFee,
        lateCheckoutFeeType: data.lateCheckoutFeeType,
        confirmationPendingTimeoutHours: data.confirmationPendingTimeoutHours,
        auditLogRetentionDays: data.auditLogRetentionDays,
        updatedAt: new Date()
      },
      create: {
        propertyId: data.propertyId,
        // Required fields with defaults
        propertyType: "Hotel",
        propertyName: "Default",
        propertyPhone: "",
        propertyEmail: "",
        firstName: "",
        lastName: "",
        country: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        latitude: 0,
        longitude: 0,
        description: { type: "doc", content: [] },
        // Automation fields
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        noShowGraceHours: data.noShowGraceHours,
        noShowLookbackDays: data.noShowLookbackDays,
        lateCheckoutGraceHours: data.lateCheckoutGraceHours,
        lateCheckoutLookbackDays: data.lateCheckoutLookbackDays,
        lateCheckoutFee: data.lateCheckoutFee,
        lateCheckoutFeeType: data.lateCheckoutFeeType,
        confirmationPendingTimeoutHours: data.confirmationPendingTimeoutHours,
        auditLogRetentionDays: data.auditLogRetentionDays
      }
    });

    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    console.error("POST /api/settings/automation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get propertyId from query
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "Missing propertyId" },
        { status: 400 }
      );
    }

    // 3. Fetch settings
    const settings = await prisma.propertySettings.findUnique({
      where: { propertyId },
      select: {
        checkInTime: true,
        checkOutTime: true,
        noShowGraceHours: true,
        noShowLookbackDays: true,
        lateCheckoutGraceHours: true,
        lateCheckoutLookbackDays: true,
        lateCheckoutFee: true,
        lateCheckoutFeeType: true,
        confirmationPendingTimeoutHours: true,
        auditLogRetentionDays: true
      }
    });

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json(
        {
          checkInTime: "15:00",
          checkOutTime: "11:00",
          noShowGraceHours: 6,
          noShowLookbackDays: 3,
          lateCheckoutGraceHours: 1,
          lateCheckoutLookbackDays: 2,
          lateCheckoutFee: 0,
          lateCheckoutFeeType: "FLAT_RATE",
          confirmationPendingTimeoutHours: 6,
          auditLogRetentionDays: 90
        },
        { status: 200 }
      );
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/settings/automation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
