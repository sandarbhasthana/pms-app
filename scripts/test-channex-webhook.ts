/**
 * Test script for Channex webhook integration
 *
 * Usage: npx tsx scripts/test-channex-webhook.ts
 *
 * Prerequisites:
 * 1. Dev server running: npm run dev
 * 2. At least one property with Channex mapping in database
 */

const BASE_URL = process.env.WEBHOOK_URL || "http://localhost:3000";

// Sample Channex booking payload
const sampleBooking = {
  id: "test-booking-" + Date.now(),
  property_id: "TEST_CHANNEX_PROPERTY_ID", // Replace with actual Channex property ID
  channel: "Booking.com",
  status: "new",
  currency: "USD",
  total_price: 450.0,
  guest: {
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890"
  },
  rooms: [
    {
      room_type_id: "TEST_ROOM_TYPE_ID", // Replace with actual Channex room type ID
      rate_plan_id: "TEST_RATE_PLAN_ID",
      checkin_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 7 days from now
      checkout_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 10 days from now
      guests: {
        adults: 2,
        children: 1
      },
      price: 450.0
    }
  ]
};

async function testWebhook(
  eventType: string,
  data: object
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    property_id: sampleBooking.property_id,
    data
  };

  console.log(`\n📤 Sending ${eventType} webhook...`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/channex`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-channex-signature": "test-signature" // Skip verification in dev
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    console.log(`\n📥 Response (${response.status}):`, JSON.stringify(body, null, 2));

    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    console.error("❌ Request failed:", error);
    return { ok: false, status: 0, body: error };
  }
}

async function runTests() {
  console.log("🧪 Channex Webhook Integration Test");
  console.log("=====================================");
  console.log(`Target: ${BASE_URL}/api/webhooks/channex`);

  // Test 1: Health check
  console.log("\n\n--- Test 1: Health Check (GET) ---");
  try {
    const healthRes = await fetch(`${BASE_URL}/api/webhooks/channex`);
    const healthBody = await healthRes.json();
    console.log(`Status: ${healthRes.status}`, healthBody);
  } catch (e) {
    console.error("❌ Health check failed - is the server running?", e);
    process.exit(1);
  }

  // Test 2: Ping event
  console.log("\n\n--- Test 2: Ping Event ---");
  await testWebhook("ping", {});

  // Test 3: New booking
  console.log("\n\n--- Test 3: New Booking (booking_created) ---");
  const bookingResult = await testWebhook("booking_created", sampleBooking);

  if (!bookingResult.ok) {
    console.log("\n⚠️  Booking creation may have failed.");
    console.log("Common issues:");
    console.log("  - No ChannexProperty mapping exists for the property_id");
    console.log("  - No ChannexRoomTypeMapping exists for the room_type_id");
    console.log("  - No available rooms of the specified type");
  }

  // Test 4: Modified booking
  console.log("\n\n--- Test 4: Modified Booking (booking_modified) ---");
  const modifiedBooking = {
    ...sampleBooking,
    guest: { ...sampleBooking.guest, first_name: "Jane" },
    total_price: 500.0
  };
  await testWebhook("booking_modified", modifiedBooking);

  // Test 5: Cancelled booking
  console.log("\n\n--- Test 5: Cancelled Booking (booking_cancelled) ---");
  const cancelledBooking = { ...sampleBooking, status: "cancelled" };
  await testWebhook("booking_cancelled", cancelledBooking);

  console.log("\n\n=====================================");
  console.log("✅ Webhook tests completed!");
  console.log("\nNext steps:");
  console.log("1. Check database for ChannexWebhookLog entries");
  console.log("2. If property mapping exists, check for new Reservation");
  console.log("3. Review console output for any errors");
}

runTests().catch(console.error);

