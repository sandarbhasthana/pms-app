import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DocumentTag } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validatePropertyAccess } from "@/lib/property-context";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

/**
 * GET /api/reservations/[id]/documents
 * Get all documents for a reservation
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId } = await context.params;

    // Get reservation to validate property access
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { propertyId: true }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (
      !validation.success ||
      validation.propertyId !== reservation.propertyId
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to this reservation" },
        { status: 403 }
      );
    }

    // Get all documents for this reservation
    const documents = await prisma.reservationDocument.findMany({
      where: { reservationId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reservations/[id]/documents
 * Upload a document for a reservation
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId } = await context.params;
    const { imageBase64, documentType, guestName } = await req.json();

    if (!imageBase64 || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get reservation to validate property access and get guest name
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        propertyId: true,
        guestName: true,
        createdAt: true
      }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Validate property access
    const validation = await validatePropertyAccess(req);
    if (
      !validation.success ||
      validation.propertyId !== reservation.propertyId
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to this reservation" },
        { status: 403 }
      );
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate filename: guestName_bookingTimestamp.jpg
    const sanitizedGuestName = (guestName || reservation.guestName || "guest")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const bookingTimestamp = reservation.createdAt.getTime();
    const filename = `${sanitizedGuestName}_${bookingTimestamp}.jpg`;

    // Generate S3 key
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 401 }
      );
    }

    const key = `${orgId}/documents/${reservationId}/${Date.now()}_${filename}`;

    // Get presigned URL for S3 upload
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: "image/jpeg"
    });

    const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": "image/jpeg"
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
    }

    // Build public URL
    const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Create document record in database
    const document = await prisma.reservationDocument.create({
      data: {
        reservationId,
        propertyId: reservation.propertyId,
        key,
        url: publicUrl,
        name: filename,
        size: buffer.length,
        mimeType: "image/jpeg",
        tag: documentType as DocumentTag,
        uploadedBy: user.id
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error uploading document:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
