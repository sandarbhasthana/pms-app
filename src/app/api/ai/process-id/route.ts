import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Response type
interface ProcessedIDData {
  fullName: string;
  idType: "passport" | "ssn" | "driving_license" | "national_id" | "other";
  idNumber: string;
  issuingCountry: string;
  expiryDate: string; // ISO format: "YYYY-MM-DD"
  isExpired: boolean;
  daysUntilExpiry: number;
  facePhotoLocation: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  confidence: number;
}

interface APIResponse {
  success: boolean;
  data?: ProcessedIDData;
  error?: string;
  warning?: string;
}

// OpenAI prompt for ID extraction
const ID_EXTRACTION_PROMPT = `You are an expert at extracting information from government-issued ID documents.
Analyze the provided image and extract the following information in JSON format:

{
  "fullName": "Full name as it appears on the document",
  "idType": "passport | ssn | driving_license | national_id | other",
  "idNumber": "The document/ID number",
  "issuingCountry": "Country that issued the document (ISO 3166-1 alpha-2 code)",
  "expiryDate": "Expiry/expiration date in YYYY-MM-DD format",
  "issueDate": "Issue date in YYYY-MM-DD format (if visible)",
  "dateOfBirth": "Date of birth in YYYY-MM-DD format (if visible)",
  "facePhotoLocation": {
    "x": 50,
    "y": 100,
    "width": 200,
    "height": 250
  },
  "confidence": 0.95
}

Rules:
- Return ONLY valid JSON, no additional text
- Use null for missing fields
- Confidence should be 0-1 (1 = very confident)
- For idType, choose the most appropriate category
- For issuingCountry, use 2-letter ISO codes (US, IN, GB, etc.)
- For dates, always use YYYY-MM-DD format (convert if needed)
- Look for expiry date labels: "Expiry", "Expires", "Valid Until", "Expiration Date", etc.
- If expiry date is not found, set it to null
- For facePhotoLocation, identify the person's face photo on the document and return its bounding box coordinates
- IMPORTANT: Crop TIGHTLY around just the face - exclude document borders, text, and background
- Coordinates should be in pixels: {x, y, width, height} where x,y is top-left corner
- The crop should show primarily the person's face with minimal extra space
- If no face photo is visible on the document, set facePhotoLocation to null`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentImageBase64, imageType } = body;

    // Validate input
    if (!documentImageBase64) {
      return NextResponse.json(
        {
          success: false,
          error: "Document image is required"
        } as APIResponse,
        { status: 400 }
      );
    }

    if (
      !imageType ||
      !["image/png", "image/jpeg", "image/jpg"].includes(imageType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image type. Must be PNG or JPEG"
        } as APIResponse,
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key not configured"
        } as APIResponse,
        { status: 500 }
      );
    }

    // Call OpenAI Vision API
    console.log("Calling OpenAI Vision API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o which has vision capabilities
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: ID_EXTRACTION_PROMPT
            },
            {
              type: "image_url",
              image_url: {
                url: documentImageBase64
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1 // Low temperature for more consistent results
    });

    // Extract the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: "No response from OpenAI"
        } as APIResponse,
        { status: 500 }
      );
    }

    console.log("OpenAI Response:", content);

    // Parse JSON response
    interface ExtractedData {
      fullName?: string;
      idType?: string;
      idNumber?: string;
      issuingCountry?: string;
      expiryDate?: string;
      facePhotoLocation?: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null;
      confidence?: number;
    }

    let extractedData: ExtractedData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch =
        content.match(/```json\n?([\s\S]*?)\n?```/) ||
        content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonString.trim()) as ExtractedData;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to parse ID document. Please try again or enter manually."
        } as APIResponse,
        { status: 500 }
      );
    }

    // Validate expiry date and calculate days until expiry
    let isExpired = false;
    let daysUntilExpiry = 0;
    let warning: string | undefined;

    if (extractedData.expiryDate) {
      const expiryDate = new Date(extractedData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day

      const timeDiff = expiryDate.getTime() - today.getTime();
      daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        isExpired = true;
        warning = `⚠️ This document expired ${Math.abs(
          daysUntilExpiry
        )} days ago.`;
      } else if (daysUntilExpiry <= 30) {
        warning = `⚠️ This document will expire in ${daysUntilExpiry} days.`;
      }
    } else {
      warning =
        "⚠️ Could not detect expiry date. Please verify document validity manually.";
    }

    // Validate face photo coordinates
    let facePhotoLocation = extractedData.facePhotoLocation;
    if (facePhotoLocation) {
      // Ensure all required fields are present and valid
      if (
        typeof facePhotoLocation.x !== "number" ||
        typeof facePhotoLocation.y !== "number" ||
        typeof facePhotoLocation.width !== "number" ||
        typeof facePhotoLocation.height !== "number" ||
        facePhotoLocation.width <= 0 ||
        facePhotoLocation.height <= 0
      ) {
        console.warn("Invalid face photo coordinates, setting to null");
        facePhotoLocation = null;
      }
    }

    // Validate and normalize idType
    const normalizeIdType = (
      type: string | undefined
    ): ProcessedIDData["idType"] => {
      if (!type) return "other";
      const normalized = type.toLowerCase().replace(/[_\s-]/g, "_");
      if (normalized === "passport") return "passport";
      if (normalized === "ssn") return "ssn";
      if (normalized.includes("driving") || normalized.includes("license"))
        return "driving_license";
      if (normalized.includes("national") || normalized.includes("id"))
        return "national_id";
      return "other";
    };

    // Build response
    const processedData: ProcessedIDData = {
      fullName: extractedData.fullName || "",
      idType: normalizeIdType(extractedData.idType),
      idNumber: extractedData.idNumber || "",
      issuingCountry: extractedData.issuingCountry || "",
      expiryDate: extractedData.expiryDate || "",
      isExpired,
      daysUntilExpiry,
      facePhotoLocation: facePhotoLocation || null,
      confidence: extractedData.confidence || 0.8
    };

    return NextResponse.json({
      success: true,
      data: processedData,
      warning
    } as APIResponse);
  } catch (error) {
    console.error("Error processing ID document:", error);

    // Handle specific OpenAI errors
    if (error && typeof error === "object" && "status" in error) {
      const statusError = error as { status: number; message?: string };

      if (statusError.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI rate limit exceeded. Please try again in a moment."
          } as APIResponse,
          { status: 429 }
        );
      }

      if (statusError.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error:
              "OpenAI API authentication failed. Please check configuration."
          } as APIResponse,
          { status: 500 }
        );
      }
    }

    // Handle standard Error objects
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process ID document. Please try again.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      } as APIResponse,
      { status: 500 }
    );
  }
}
