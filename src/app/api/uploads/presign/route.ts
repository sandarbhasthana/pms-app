// File: app/api/uploads/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Run this code on the server
export const runtime = "nodejs";

// Initialize S3 client with your env vars
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType } = (await req.json()) as {
      fileName: string;
      fileType: string;
    };

    // Grab your orgId from cookies to namespace uploads per tenant
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Missing org context" },
        { status: 400 }
      );
    }

    // Build a unique S3 key, e.g. "orgId/uploads/1678991234567_myphoto.jpg"
    const timestamp = Date.now();
    const key = `${orgId}/uploads/${timestamp}_${fileName}`;

    // Create the presign command
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: fileType,
      ACL: "private" // or "public-read" if you want immediately public URLs
    });

    // Generate a presigned URL valid for 60 seconds
    const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    // Return both the URL and the final key so the client can upload
    return NextResponse.json({ presignedUrl, key });
  } catch (err: unknown) {
    console.error("Presign error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
