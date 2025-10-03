#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { ReservationStatus, ReservationSource } from "@prisma/client";

async function createLateCheckoutTestData() {
  console.log("🏨 Creating test data for late checkout detection...");

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

    // Test scenarios for late checkout detection
    const testReservations = [
      {
        scenario: "Should trigger late checkout - Yesterday's checkout, still IN_HOUSE",
        guestName: "Michael Johnson",
        email: "michael.johnson@test.com",
        phone: "+1234567895",
        checkIn: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000), // Day before yesterday
        checkOut: yesterday, // Should have checked out yesterday
        status: ReservationStatus.IN_HOUSE,
        amountCaptured: 20000, // $200.00
        depositAmount: 10000,  // $100.00
      },
      {
        scenario: "Should trigger late checkout - Today's checkout, past grace period",
        guestName: "Sarah Wilson",
        email: "sarah.wilson@test.com", 
        phone: "+1234567896",
        checkIn: yesterday,
        checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0), // 11 AM today
        status: ReservationStatus.IN_HOUSE,
        amountCaptured: 25000, // $250.00
        depositAmount: 12500,  // $125.00
      },
      {
        scenario: "Should NOT trigger - Future checkout",
        guestName: "David Brown",
        email: "david.brown@test.com",
        phone: "+1234567897",
        checkIn: today,
        checkOut: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        status: ReservationStatus.IN_HOUSE,
        amountCaptured: 18000, // $180.00
        depositAmount: 9000,   // $90.00
      },
      {
        scenario: "Should NOT trigger - Already checked out",
        guestName: "Lisa Davis",
        email: "lisa.davis@test.com",
        phone: "+1234567898",
        checkIn: yesterday,
        checkOut: today,
        status: ReservationStatus.CHECKED_OUT,
        amountCaptured: 22000, // $220.00
        depositAmount: 11000,  // $110.00
      },
      {
        scenario: "Should NOT trigger - Still CONFIRMED (not checked in)",
        guestName: "Robert Miller",
        email: "robert.miller@test.com",
        phone: "+1234567899",
        checkIn: today,
        checkOut: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        status: ReservationStatus.CONFIRMED,
        amountCaptured: 15000, // $150.00
        depositAmount: 7500,   // $75.00
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
          statusChangeReason: "Test reservation for late checkout detection",
          // Set checkedInAt for IN_HOUSE reservations
          ...(testData.status === ReservationStatus.IN_HOUSE && {
            checkedInAt: testData.checkIn
          }),
          // Set checkedOutAt for CHECKED_OUT reservations
          ...(testData.status === ReservationStatus.CHECKED_OUT && {
            checkedOutAt: testData.checkOut
          })
        }
      });

      createdReservations.push({
        id: reservation.id,
        scenario: testData.scenario,
        guestName: testData.guestName,
        status: testData.status,
        checkOut: testData.checkOut.toISOString(),
        room: room.name
      });

      console.log(`✅ Created reservation ${reservation.id} for ${testData.guestName} in ${room.name}`);
    }

    console.log("\n📊 Late Checkout Test Reservations Summary:");
    console.log("==============================================");
    createdReservations.forEach((res, index) => {
      console.log(`${index + 1}. ${res.guestName} (${res.id})`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Check-out: ${res.checkOut}`);
      console.log(`   Room: ${res.room}`);
      console.log(`   Scenario: ${res.scenario}`);
      console.log("");
    });

    console.log("🎯 Expected Results After Running Late Checkout Detection:");
    console.log("- Michael Johnson: Should trigger late checkout processing (overdue since yesterday)");
    console.log("- Sarah Wilson: Should trigger late checkout processing (overdue today)");
    console.log("- David Brown: Should NOT trigger (future checkout)");
    console.log("- Lisa Davis: Should NOT trigger (already checked out)");
    console.log("- Robert Miller: Should NOT trigger (not checked in yet)");

    // Show current time context
    const now = new Date();
    const checkOutTime = "11:00"; // Default checkout time
    const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
    const todayCheckOut = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    todayCheckOut.setHours(checkOutHour, checkOutMinute, 0, 0);
    const graceEndTime = new Date(todayCheckOut.getTime() + (1 * 60 * 60 * 1000)); // 1 hour grace

    console.log("\n⏰ Current Time Context:");
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Today's checkout time: ${todayCheckOut.toISOString()}`);
    console.log(`   Grace period ends: ${graceEndTime.toISOString()}`);
    console.log(`   Status: ${now > graceEndTime ? '🔴 Past grace period' : '🟢 Within grace period'}`);

    console.log("\n✅ Late checkout test data created successfully!");
    console.log("🚀 Now run the late checkout detection job to test the logic.");

  } catch (error) {
    console.error("❌ Error creating late checkout test data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createLateCheckoutTestData().catch(console.error);
