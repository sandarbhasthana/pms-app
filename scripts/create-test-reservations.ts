#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { ReservationStatus, ReservationSource } from "@prisma/client";

async function createTestReservations() {
  console.log("🏨 Creating test reservations for no-show detection...");

  try {
    // Find a test property
    const property = await prisma.property.findFirst({
      where: { isActive: true },
      include: { rooms: true }
    });

    if (!property || !property.rooms.length) {
      console.error("❌ No active property with rooms found");
      return;
    }

    console.log(`✅ Using property: ${property.name} (${property.id})`);
    console.log(`✅ Available rooms: ${property.rooms.length}`);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Test scenarios for no-show detection
    const testReservations = [
      {
        scenario: "Should be marked as NO_SHOW - Yesterday's reservation",
        guestName: "John Doe",
        email: "john.doe@test.com",
        phone: "+1234567890",
        checkIn: yesterday,
        checkOut: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMED,
        amountCaptured: 15000, // $150.00
        depositAmount: 5000 // $50.00
      },
      {
        scenario: "Should be marked as NO_SHOW - Today's overdue reservation",
        guestName: "Jane Smith",
        email: "jane.smith@test.com",
        phone: "+1234567891",
        checkIn: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          8,
          0
        ), // 8 AM today
        checkOut: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMED,
        amountCaptured: 20000, // $200.00
        depositAmount: 10000 // $100.00
      },
      {
        scenario: "Should NOT be marked - Future reservation",
        guestName: "Bob Wilson",
        email: "bob.wilson@test.com",
        phone: "+1234567892",
        checkIn: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        checkOut: new Date(today.getTime() + 48 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMED,
        amountCaptured: 18000, // $180.00
        depositAmount: 6000 // $60.00
      },
      {
        scenario: "Should NOT be marked - Already checked in",
        guestName: "Alice Brown",
        email: "alice.brown@test.com",
        phone: "+1234567893",
        checkIn: today,
        checkOut: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.IN_HOUSE,
        amountCaptured: 25000, // $250.00
        depositAmount: 12500 // $125.00
      },
      {
        scenario: "Should NOT be marked - Pending confirmation",
        guestName: "Charlie Davis",
        email: "charlie.davis@test.com",
        phone: "+1234567894",
        checkIn: yesterday,
        checkOut: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMATION_PENDING,
        amountCaptured: null,
        depositAmount: null
      }
    ];

    const createdReservations = [];

    for (let i = 0; i < testReservations.length; i++) {
      const testData = testReservations[i];
      const room = property.rooms[i % property.rooms.length];

      console.log(`\n📝 Creating: ${testData.scenario}`);

      const reservation = await prisma.reservation.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          roomId: room.id,
          guestName: testData.guestName,
          email: testData.email,
          phone: testData.phone,
          checkIn: testData.checkIn,
          checkOut: testData.checkOut,
          status: testData.status,
          source: ReservationSource.WEBSITE,
          adults: 2,
          children: 0,
          amountCaptured: testData.amountCaptured,
          depositAmount: testData.depositAmount,
          statusChangeReason: "Test reservation for no-show detection"
        }
      });

      createdReservations.push({
        id: reservation.id,
        scenario: testData.scenario,
        guestName: testData.guestName,
        status: testData.status,
        checkIn: testData.checkIn.toISOString()
      });

      console.log(
        `✅ Created reservation ${reservation.id} for ${testData.guestName}`
      );
    }

    console.log("\n📊 Test Reservations Summary:");
    console.log("=====================================");
    createdReservations.forEach((res, index) => {
      console.log(`${index + 1}. ${res.guestName} (${res.id})`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Check-in: ${res.checkIn}`);
      console.log(`   Scenario: ${res.scenario}`);
      console.log("");
    });

    console.log("🎯 Expected Results After Running No-Show Detection:");
    console.log("- John Doe: Should be marked as NO_SHOW");
    console.log(
      "- Jane Smith: Should be marked as NO_SHOW (if past grace period)"
    );
    console.log("- Bob Wilson: Should remain CONFIRMED (future reservation)");
    console.log("- Alice Brown: Should remain IN_HOUSE (already checked in)");
    console.log(
      "- Charlie Davis: Should remain CONFIRMATION_PENDING (not confirmed)"
    );

    console.log("\n✅ Test reservations created successfully!");
    console.log("🚀 Now run the no-show detection job to test the logic.");
  } catch (error) {
    console.error("❌ Error creating test reservations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestReservations().catch(console.error);
