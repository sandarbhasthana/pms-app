/**
 * API Endpoint: Day Transition Validation
 * GET /api/reservations/day-transition/validate
 *
 * Validates if a day transition should be blocked due to booking issues
 * Returns list of issues that need to be resolved before proceeding
 */

import { NextRequest, NextResponse } from "next/server";
import { validateDayTransition } from "@/lib/reservation-status/day-transition-validator";
import { DayTransitionValidationResponse } from "@/types/day-transition";

/**
 * GET handler for day transition validation
 * Query parameters:
 * - propertyId: string (required) - The property to validate
 * - timezone: string (required) - The property's timezone (e.g., 'America/New_York')
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");
    const timezone = searchParams.get("timezone");

    // Validate required parameters
    if (!propertyId) {
      return NextResponse.json(
        { error: "Missing required parameter: propertyId" },
        { status: 400 }
      );
    }

    if (!timezone) {
      return NextResponse.json(
        { error: "Missing required parameter: timezone" },
        { status: 400 }
      );
    }

    // Validate timezone format (basic check)
    if (typeof timezone !== "string" || timezone.length < 3) {
      return NextResponse.json(
        { error: "Invalid timezone format" },
        { status: 400 }
      );
    }

    // Call validator service
    const validationResult: DayTransitionValidationResponse =
      await validateDayTransition(propertyId, timezone);

    // Return response with appropriate cache headers
    const response = NextResponse.json(validationResult);

    // Cache for 1 minute to avoid repeated API calls
    response.headers.set("Cache-Control", "private, max-age=60");

    return response;
  } catch (error) {
    console.error("Error validating day transition:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Invalid timezone")) {
        return NextResponse.json(
          { error: "Invalid timezone provided" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

