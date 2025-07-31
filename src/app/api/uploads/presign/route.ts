// app/api/uploads/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

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
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID not found in cookies" },
        { status: 401 }
      );
    }
    const key = `${orgId}/uploads/${Date.now()}_${fileName}`;

    // NOTE: ACL removed
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: fileType
      // ACL: "public-read",  ← remove this line!
    });

    const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });

    // Build the public URL on the server side
    const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return NextResponse.json({ presignedUrl, publicUrl });
  } catch (err: unknown) {
    console.error("Presign error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
