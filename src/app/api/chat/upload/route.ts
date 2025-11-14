/**
 * Chat File Upload API
 *
 * POST /api/chat/upload - Upload file attachment for chat (images, documents)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE
} from "@/lib/chat/upload-utils";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

/**
 * POST /api/chat/upload
 * Get presigned URL for uploading chat attachments
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, fileSize, organizationId } = body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize || !organizationId) {
      return NextResponse.json(
        {
          error: "fileName, fileType, fileSize, and organizationId are required"
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size must be less than ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`
        },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(fileType);

    if (!isImage && !isDocument) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed: Images (JPEG, PNG, GIF, WebP) and Documents (PDF, Word, Excel, TXT)"
        },
        { status: 400 }
      );
    }

    // Determine message type
    const messageType = isImage ? "IMAGE" : "DOCUMENT";

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${organizationId}/chat/${timestamp}_${sanitizedFileName}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: fileType
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

    // Build public URL
    const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      messageType,
      key
    });
  } catch (error) {
    console.error("Error generating presigned URL for chat upload:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
