import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Note: No NEXT_PUBLIC_ prefix for server-side

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${apiKey}&region=IN&language=en`
    );

    const data = await response.json();

    if (data.status === "OK") {
      const result = data.results[0];
      const location = result.geometry.location;
      const locationType = result.geometry.location_type;

      // Determine accuracy level
      let accuracy = "approximate";
      if (locationType === "ROOFTOP") {
        accuracy = "precise";
      } else if (locationType === "RANGE_INTERPOLATED") {
        accuracy = "interpolated";
      } else if (locationType === "GEOMETRIC_CENTER") {
        accuracy = "geometric_center";
      }

      return NextResponse.json({
        success: true,
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: result.formatted_address,
        accuracy: accuracy,
        location_type: locationType,
        place_id: result.place_id
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data.status,
          message: data.error_message || "Geocoding failed"
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
