// ✅ PERFORMANCE: Server-side city data endpoint
// Keeps the heavy country-state-city library on the server only
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { City } from "country-state-city";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("countryCode");
    const stateCode = searchParams.get("stateCode");

    if (!countryCode || !stateCode) {
      return NextResponse.json(
        { error: "countryCode and stateCode parameters are required" },
        { status: 400 }
      );
    }

    const cities = City.getCitiesOfState(countryCode, stateCode).map((c) => ({
      name: c.name,
      stateCode: c.stateCode,
      countryCode: c.countryCode
    }));

    return NextResponse.json(cities, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
      }
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 }
    );
  }
}

