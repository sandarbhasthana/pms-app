/**
 * Create Payment Test Data
 *
 * Creates test reservations and scenarios for payment-triggered status updates
 */

import { prisma } from "../src/lib/prisma";
import { ReservationStatus } from "@prisma/client";

async function createPaymentTestData() {
  console.log("🧪 Creating payment test data...\n");

  try {
    // Get the first property for testing with organization and room info
    const property = await prisma.property.findFirst({
      include: {
        settings: true,
        organization: true,
        rooms: true
      }
    });

    if (!property) {
      console.error("❌ No property found. Please create a property first.");
      return;
    }

    console.log(`📍 Using property: ${property.name} (${property.id})`);
    console.log(
      `🏢 Organization: ${property.organization.name} (${property.organization.id})`
    );

    // Check if property has rooms
    if (!property.rooms || property.rooms.length === 0) {
      console.error(
        "❌ No rooms found for this property. Please create rooms first."
      );
      return;
    }

    const firstRoom = property.rooms[0];
    console.log(`🏠 Using room: ${firstRoom.name} (${firstRoom.id})`);

    // Ensure room has pricing
    let roomPricing = await prisma.roomPricing.findUnique({
      where: { roomId: firstRoom.id }
    });

    if (!roomPricing) {
      console.log("💰 Creating room pricing...");
      roomPricing = await prisma.roomPricing.create({
        data: {
          roomId: firstRoom.id,
          basePrice: 2500, // ₹2500 per night
          weekdayPrice: 2500,
          weekendPrice: 3000,
          currency: "INR"
        }
      });
    }

    console.log(`💰 Room rate: ₹${roomPricing.basePrice} per night`);

    // Ensure property has automation settings
    if (!property.settings) {
      console.log("⚙️ Creating property settings...");
      await prisma.propertySettings.create({
        data: {
          propertyId: property.id,
          propertyType: "Hotel",
          propertyName: property.name,
          propertyPhone: property.phone || "+1-555-0123",
          propertyEmail: property.email || "test@hotel.com",
          firstName: "Test",
          lastName: "Manager",
          country: "United States",
          street: "123 Test Street",
          city: "Test City",
          state: "CA",
          zip: "90210",
          latitude: 34.0522,
          longitude: -118.2437,
          description: { content: "Test property for payment automation" },

          // Automation settings
          enableAutoConfirmation: true,
          autoConfirmThreshold: 50,
          enableAutoCheckin: true,
          checkInTime: "15:00",
          checkOutTime: "11:00"
        }
      });
      console.log("✅ Property settings created");
    }

    // Clean up existing test data
    console.log("🧹 Cleaning up existing test data...");
    await prisma.reservation.deleteMany({
      where: {
        guestName: {
          in: [
            "Payment Test - Same Day Full",
            "Payment Test - Same Day Partial",
            "Payment Test - Future Full",
            "Payment Test - Future Partial",
            "Payment Test - Already Confirmed",
            "Payment Test - Disabled Auto"
          ]
        }
      }
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Test Scenario 1: Same-day booking with full payment
    const sameDayFull = await prisma.reservation.create({
      data: {
        organizationId: property.organization.id,
        propertyId: property.id,
        roomId: firstRoom.id,
        guestName: "Payment Test - Same Day Full",
        email: "sameday.full@test.com",
        phone: "+1-555-0001",
        checkIn: today,
        checkOut: tomorrow,
        adults: 2,
        children: 0,
        paidAmount: 0, // Will be updated by payment
        status: ReservationStatus.CONFIRMATION_PENDING,
        paymentStatus: "PENDING",
        source: "WEBSITE",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
      }
    });

    // Test Scenario 2: Same-day booking with partial payment
    const sameDayPartial = await prisma.reservation.create({
      data: {
        organizationId: property.organization.id,
        propertyId: property.id,
        roomId: firstRoom.id,
        guestName: "Payment Test - Same Day Partial",
        email: "sameday.partial@test.com",
        phone: "+1-555-0002",
        checkIn: today,
        checkOut: tomorrow,
        adults: 1,
        children: 0,
        paidAmount: 0,
        status: ReservationStatus.CONFIRMATION_PENDING,
        paymentStatus: "PENDING",
        source: "WEBSITE",
        createdAt: new Date(now.getTime() - 45 * 60 * 1000) // 45 minutes ago
      }
    });

    // Test Scenario 3: Future booking with full payment
    const futureFull = await prisma.reservation.create({
      data: {
        organizationId: property.organization.id,
        propertyId: property.id,
        roomId: firstRoom.id,
        guestName: "Payment Test - Future Full",
        email: "future.full@test.com",
        phone: "+1-555-0003",
        checkIn: nextWeek,
        checkOut: new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000),
        adults: 2,
        children: 1,
        paidAmount: 0,
        status: ReservationStatus.CONFIRMATION_PENDING,
        paymentStatus: "PENDING",
        source: "PHONE",
        createdAt: new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
      }
    });

    // Test Scenario 4: Future booking with partial payment (below threshold)
    const futurePartial = await prisma.reservation.create({
      data: {
        organizationId: property.organization.id,
        propertyId: property.id,
        roomId: firstRoom.id,
        guestName: "Payment Test - Future Partial",
        email: "future.partial@test.com",
        phone: "+1-555-0004",
        checkIn: nextWeek,
        checkOut: new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000),
        adults: 1,
        children: 0,
        paidAmount: 0,
        status: ReservationStatus.CONFIRMATION_PENDING,
        paymentStatus: "PENDING",
        source: "WEBSITE",
        createdAt: new Date(now.getTime() - 90 * 60 * 1000) // 1.5 hours ago
      }
    });

    // Test Scenario 5: Already confirmed reservation (additional payment)
    const alreadyConfirmed = await prisma.reservation.create({
      data: {
        organizationId: property.organization.id,
        propertyId: property.id,
        roomId: firstRoom.id,
        guestName: "Payment Test - Already Confirmed",
        email: "confirmed@test.com",
        phone: "+1-555-0005",
        checkIn: today,
        checkOut: tomorrow,
        adults: 2,
        children: 0,
        paidAmount: 100.0, // Already partially paid
        status: ReservationStatus.CONFIRMED,
        paymentStatus: "PARTIALLY_PAID",
        source: "WEBSITE",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    });

    // Test Scenario 6: Automation disabled property (create separate settings)
    const disabledProperty = await prisma.property.findFirst({
      where: { id: { not: property.id } }
    });

    let testReservationDisabled;
    if (disabledProperty) {
      // Ensure this property has automation disabled
      await prisma.propertySettings.upsert({
        where: { propertyId: disabledProperty.id },
        create: {
          propertyId: disabledProperty.id,
          propertyType: "Hotel",
          propertyName: disabledProperty.name,
          propertyPhone: disabledProperty.phone || "+1-555-0199",
          propertyEmail: disabledProperty.email || "disabled@hotel.com",
          firstName: "Test",
          lastName: "Manager",
          country: "United States",
          street: "456 Disabled Street",
          city: "Test City",
          state: "CA",
          zip: "90211",
          latitude: 34.0522,
          longitude: -118.2437,
          description: { content: "Property with automation disabled" },

          // Automation DISABLED
          enableAutoConfirmation: false,
          autoConfirmThreshold: 50,
          enableAutoCheckin: false
        },
        update: {
          enableAutoConfirmation: false,
          enableAutoCheckin: false
        }
      });

      // Get a room from the disabled property
      const disabledPropertyWithRooms = await prisma.property.findUnique({
        where: { id: disabledProperty.id },
        include: { rooms: true, organization: true }
      });

      if (
        disabledPropertyWithRooms?.rooms &&
        disabledPropertyWithRooms.rooms.length > 0
      ) {
        testReservationDisabled = await prisma.reservation.create({
          data: {
            organizationId: disabledPropertyWithRooms.organization.id,
            propertyId: disabledProperty.id,
            roomId: disabledPropertyWithRooms.rooms[0].id,
            guestName: "Payment Test - Disabled Auto",
            email: "disabled@test.com",
            phone: "+1-555-0006",
            checkIn: today,
            checkOut: tomorrow,
            adults: 1,
            children: 0,
            paidAmount: 0,
            status: ReservationStatus.CONFIRMATION_PENDING,
            paymentStatus: "PENDING",
            source: "WEBSITE",
            createdAt: new Date(now.getTime() - 15 * 60 * 1000) // 15 minutes ago
          }
        });
      }
    }

    console.log("\n✅ Payment test data created successfully!\n");

    console.log("📋 Test Scenarios Created:");
    console.log(
      `1. Same-day Full Payment: ${sameDayFull.id} (${sameDayFull.guestName})`
    );
    console.log(
      `   - Paid: $${sameDayFull.paidAmount}, Status: ${sameDayFull.status}`
    );
    console.log(
      `   - Expected: CONFIRMATION_PENDING → CONFIRMED (same-day, ready for check-in)`
    );

    console.log(
      `\n2. Same-day Partial Payment: ${sameDayPartial.id} (${sameDayPartial.guestName})`
    );
    console.log(
      `   - Paid: $${sameDayPartial.paidAmount}, Status: ${sameDayPartial.status}`
    );
    console.log(
      `   - Expected: CONFIRMATION_PENDING → CONFIRMED (if payment ≥ 50%)`
    );

    console.log(
      `\n3. Future Full Payment: ${futureFull.id} (${futureFull.guestName})`
    );
    console.log(
      `   - Paid: $${futureFull.paidAmount}, Status: ${futureFull.status}`
    );
    console.log(
      `   - Expected: CONFIRMATION_PENDING → CONFIRMED (future booking)`
    );

    console.log(
      `\n4. Future Partial Payment: ${futurePartial.id} (${futurePartial.guestName})`
    );
    console.log(
      `   - Paid: $${futurePartial.paidAmount}, Status: ${futurePartial.status}`
    );
    console.log(`   - Expected: No change if payment < 50% threshold`);

    console.log(
      `\n5. Already Confirmed: ${alreadyConfirmed.id} (${alreadyConfirmed.guestName})`
    );
    console.log(
      `   - Paid: $${alreadyConfirmed.paidAmount}, Status: ${alreadyConfirmed.status}`
    );
    console.log(
      `   - Expected: Stay CONFIRMED (additional payment notification)`
    );

    if (testReservationDisabled) {
      console.log(
        `\n6. Automation Disabled: ${testReservationDisabled.id} (${testReservationDisabled.guestName})`
      );
      console.log(
        `   - Paid: $${testReservationDisabled.paidAmount}, Status: ${testReservationDisabled.status}`
      );
      console.log(`   - Expected: No change (automation disabled)`);
    }

    console.log("\n🎯 Ready for payment testing!");
    console.log(
      "Use these reservation IDs to simulate payments and test status updates."
    );
  } catch (error) {
    console.error("❌ Error creating payment test data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPaymentTestData();
