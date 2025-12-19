// ✅ PERFORMANCE: Server-side country data endpoint
// Keeps the heavy country-state-city library on the server only
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Country } from "country-state-city";

// Cache the response for 24 hours (countries don't change often)
export const revalidate = 86400;

export async function GET() {
  try {
    const countries = Country.getAllCountries().map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      phonecode: c.phonecode,
      flag: c.flag
    }));

    return NextResponse.json(countries, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
      }
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}

