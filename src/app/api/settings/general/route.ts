// app/api/settings/general/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const GeneralSettingsSchema = z.object({
  orgId: z.string(),
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
  const record = {
    ...data,
    description: data.description || defaultDescription
  };

  try {
    // 4. Upsert in one call
    const saved = await prisma.propertySettings.upsert({
      where: { orgId: record.orgId },
      create: record,
      update: record
    });

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

  // 2. Get orgId from query
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  try {
    // 3. Fetch the settings
    const settings = await prisma.propertySettings.findUnique({
      where: { orgId }
    });

    if (!settings) {
      return NextResponse.json(
        { error: "No settings found for this organization" },
        { status: 404 }
      );
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
