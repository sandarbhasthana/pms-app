// ✅ PERFORMANCE: Server-side state data endpoint
// Keeps the heavy country-state-city library on the server only
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { State } from "country-state-city";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("countryCode");

    if (!countryCode) {
      return NextResponse.json(
        { error: "countryCode parameter is required" },
        { status: 400 }
      );
    }

    const states = State.getStatesOfCountry(countryCode).map((s) => ({
      isoCode: s.isoCode,
      name: s.name,
      countryCode: s.countryCode
    }));

    return NextResponse.json(states, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
      }
    });
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}

