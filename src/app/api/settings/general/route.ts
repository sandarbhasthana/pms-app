// app/api/settings/general/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const GeneralSettingsSchema = z
  .object({
    orgId: z.string().optional(),
    propertyId: z.string().optional(),
    propertyType: z.string(),
    propertyName: z.string(),
    propertyPhone: z.string(),
    propertyEmail: z.string().email(),
    propertyWebsite: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    country: z.string(),
    street: z.string(),
    suite: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    isManuallyPositioned: z.boolean().optional().default(false),
    photos: z.array(z.string()).optional(), // array of S3 URLs
    printHeaderImage: z.string().optional(), // single S3 URL
    description: z.any() // TipTap JSON
  })
  .refine((data) => data.orgId || data.propertyId, {
    message: "Either orgId or propertyId must be provided"
  });

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse & validate body
  const body = await req.json();
  const result = GeneralSettingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }
  const data = result.data;

  // 3. Default empty TipTap document if none provided
  const defaultDescription = {
    type: "doc",
    content: [{ type: "paragraph", content: [] }]
  };

  try {
    // 4. Upsert in one call - handle both orgId and propertyId
    let saved;
    if (data.propertyId) {
      // Property-specific settings - exclude orgId
      const { orgId, ...propertyData } = data;
      const record = {
        ...propertyData,
        description: data.description || defaultDescription
      };
      saved = await prisma.propertySettings.upsert({
        where: { propertyId: data.propertyId },
        create: record,
        update: record
      });
    } else {
      // Organization-level settings - exclude propertyId
      const { propertyId, ...orgData } = data;
      const record = {
        ...orgData,
        description: data.description || defaultDescription
      };
      saved = await prisma.propertySettings.upsert({
        where: { orgId: data.orgId! },
        create: record,
        update: record
      });
    }

    return NextResponse.json(saved, { status: 200 });
  } catch (error: unknown) {
    console.error("POST /api/settings/general error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get orgId or propertyId from query
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const propertyId = searchParams.get("propertyId");

  if (!orgId && !propertyId) {
    return NextResponse.json(
      { error: "Missing orgId or propertyId" },
      { status: 400 }
    );
  }

  try {
    // 3. Fetch the settings based on what's provided
    let settings;
    if (propertyId) {
      settings = await prisma.propertySettings.findUnique({
        where: { propertyId }
      });

      // If no property settings exist, create defaults from Property table
      if (!settings) {
        const property = await prisma.property.findUnique({
          where: { id: propertyId }
        });

        if (!property) {
          return NextResponse.json(
            { error: "Property not found" },
            { status: 404 }
          );
        }

        // Default empty TipTap document
        const defaultDescription = {
          type: "doc",
          content: [{ type: "paragraph", content: [] }]
        };

        // Create default settings using Property data where available
        const defaultSettings = {
          propertyId,
          propertyType: "Hotel", // Default type
          propertyName: property.name || "",
          propertyPhone: property.phone || "",
          propertyEmail: property.email || "",
          propertyWebsite: "", // Not in Property table
          firstName: "", // Contact person - not in Property table
          lastName: "", // Contact person - not in Property table
          country: "United States", // Default country
          street: property.address || "", // Use full address as street
          suite: "", // Not in Property table
          city: "", // Not in Property table (address is combined)
          state: "", // Not in Property table (address is combined)
          zip: "", // Not in Property table (address is combined)
          latitude: 0, // Default coordinates
          longitude: 0, // Default coordinates
          isManuallyPositioned: false, // Enable auto-geocoding
          photos: [], // No photos initially
          printHeaderImage: "", // No header image
          description: defaultDescription // Empty rich text
        };

        return NextResponse.json(defaultSettings, { status: 200 });
      }
    } else {
      settings = await prisma.propertySettings.findUnique({
        where: { orgId: orgId! }
      });

      if (!settings) {
        return NextResponse.json(
          { error: "No settings found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/settings/general error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
