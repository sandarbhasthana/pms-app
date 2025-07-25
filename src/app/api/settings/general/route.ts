import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
  photos: z.any().optional(), // Expecting array of URLs
  printHeaderImage: z.string().optional(),
  description: z.any() // TipTap JSON
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parse = GeneralSettingsSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const data = parse.data;

  // Ensure description is always provided with a default value if missing
  // This matches TipTap's empty document structure
  const defaultDescription = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: []
      }
    ]
  };

  const dataWithDefaults = {
    ...data,
    description: data.description || defaultDescription
  };

  try {
    const existing = await prisma.propertySettings.findFirst({
      where: { orgId: data.orgId }
    });

    let saved;
    if (existing) {
      saved = await prisma.propertySettings.update({
        where: { id: existing.id },
        data: dataWithDefaults
      });
    } else {
      saved = await prisma.propertySettings.create({ data: dataWithDefaults });
    }

    return NextResponse.json(saved, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  try {
    const settings = await prisma.propertySettings.findFirst({
      where: { orgId }
    });

    if (!settings) {
      return NextResponse.json({ error: "No settings found" }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
