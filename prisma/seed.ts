// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data (order matters due to foreign key constraints)
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.rateChangeLog.deleteMany();
  await prisma.seasonalRate.deleteMany();
  await prisma.dailyRate.deleteMany();
  await prisma.roomPricing.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.userOrg.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log("🗑️ Cleared existing data");

  // Create Organization
  const organization = await prisma.organization.create({
    data: {
      name: "Grand Palace Hotel",
      domain: "example.com"
    }
  });

  console.log("✅ Organization created");

  // Create Users with all roles
  const users = await Promise.all([
    // Super Admin
    prisma.user.create({
      data: {
        name: "Super Administrator",
        email: "superadmin@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "SUPER_ADMIN"
          }
        }
      }
    }),
    // Org Admin
    prisma.user.create({
      data: {
        name: "Organization Admin",
        email: "admin@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "ORG_ADMIN"
          }
        }
      }
    }),
    // Property Manager
    prisma.user.create({
      data: {
        name: "John Property Manager",
        email: "manager@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "PROPERTY_MGR"
          }
        }
      }
    }),
    // Front Desk
    prisma.user.create({
      data: {
        name: "Sarah",
        email: "frontdesk@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "FRONT_DESK"
          }
        }
      }
    }),
    // Housekeeping
    prisma.user.create({
      data: {
        name: "Maria Housekeeping",
        email: "housekeeping@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "HOUSEKEEPING"
          }
        }
      }
    }),
    // Maintenance
    prisma.user.create({
      data: {
        name: "Mike Maintenance",
        email: "maintenance@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "MAINTENANCE"
          }
        }
      }
    }),
    // Accountant
    prisma.user.create({
      data: {
        name: "Lisa Accountant",
        email: "accountant@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "ACCOUNTANT"
          }
        }
      }
    }),
    // Owner
    prisma.user.create({
      data: {
        name: "Robert Owner",
        email: "owner@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "OWNER"
          }
        }
      }
    }),
    // IT Support
    prisma.user.create({
      data: {
        name: "Alex IT Support",
        email: "it@example.com",
        memberships: {
          create: {
            organizationId: organization.id,
            role: "IT_SUPPORT"
          }
        }
      }
    })
  ]);

  console.log("✅ Users with all roles created");

  // Create Room Types
  const roomTypes = await Promise.all([
    prisma.roomType.create({
      data: {
        name: "Standard Room",
        description: "Comfortable standard room with city view",
        maxOccupancy: 2,
        organizationId: organization.id,
        amenities: [],
        customAmenities: []
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Deluxe Room",
        description: "Spacious deluxe room with premium amenities",
        maxOccupancy: 2,
        organizationId: organization.id,
        amenities: [],
        customAmenities: []
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Executive Suite",
        description: "Luxury suite with separate living area",
        maxOccupancy: 2,
        organizationId: organization.id,
        amenities: [],
        customAmenities: []
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Presidential Suite",
        description: "Ultimate luxury with panoramic views",
        maxOccupancy: 4,
        organizationId: organization.id,
        amenities: [],
        customAmenities: []
      }
    })
  ]);

  // Extract room type IDs for later use
  const [
    standardRoomType,
    deluxeRoomType,
    suiteRoomType,
    presidentialRoomType
  ] = roomTypes;

  console.log("✅ Room types created");

  // Create Rooms
  const rooms = [];

  // Standard Rooms (101-110)
  for (let i = 101; i <= 110; i++) {
    rooms.push(
      prisma.room.create({
        data: {
          name: `Room ${i}`,
          type: "Standard",
          capacity: 2,
          roomTypeId: standardRoomType.id,
          organizationId: organization.id
        }
      })
    );
  }

  // Deluxe Rooms (201-208)
  for (let i = 201; i <= 208; i++) {
    rooms.push(
      prisma.room.create({
        data: {
          name: `Room ${i}`,
          type: "Deluxe",
          capacity: 2,
          roomTypeId: deluxeRoomType.id,
          organizationId: organization.id
        }
      })
    );
  }

  // Executive Suites (301-304)
  for (let i = 301; i <= 304; i++) {
    rooms.push(
      prisma.room.create({
        data: {
          name: `Suite ${i}`,
          type: "Suite",
          capacity: 2,
          roomTypeId: suiteRoomType.id,
          organizationId: organization.id
        }
      })
    );
  }

  // Presidential Suites (401-402)
  for (let i = 401; i <= 402; i++) {
    rooms.push(
      prisma.room.create({
        data: {
          name: `Presidential Suite ${i}`,
          type: "Presidential",
          capacity: 4,
          roomTypeId: presidentialRoomType.id,
          organizationId: organization.id
        }
      })
    );
  }

  const createdRooms = await Promise.all(rooms);
  console.log("✅ Rooms created");

  console.log("✅ Room pricing skipped for simplicity");

  console.log("✅ Guest users skipped for simplicity");

  // Create 15 Reservations from March to July 2024 with Varied Payment Status
  // Use actual room IDs from created rooms
  const reservationData = [
    // March 2024
    {
      roomIndex: 0, // First standard room
      checkIn: new Date("2024-03-15"),
      checkOut: new Date("2024-03-18"),
      totalAmount: 360.0,
      paymentStatus: "PAID"
    },
    {
      roomIndex: 10, // First deluxe room
      checkIn: new Date("2024-03-22"),
      checkOut: new Date("2024-03-25"),
      totalAmount: 540.0,
      paymentStatus: "PARTIALLY_PAID"
    },
    {
      roomIndex: 18, // First suite
      checkIn: new Date("2024-03-28"),
      checkOut: new Date("2024-03-31"),
      totalAmount: 1050.0,
      paymentStatus: "UNPAID"
    },
    // April 2024
    {
      roomIndex: 1, // Second standard room
      checkIn: new Date("2024-04-05"),
      checkOut: new Date("2024-04-08"),
      totalAmount: 360.0,
      paymentStatus: "PAID"
    },
    {
      roomIndex: 11, // Second deluxe room
      checkIn: new Date("2024-04-12"),
      checkOut: new Date("2024-04-15"),
      totalAmount: 540.0,
      paymentStatus: "UNPAID"
    },
    {
      roomIndex: 22, // First presidential suite
      checkIn: new Date("2024-04-20"),
      checkOut: new Date("2024-04-23"),
      totalAmount: 2250.0,
      paymentStatus: "PARTIALLY_PAID"
    },
    // May 2024
    {
      roomIndex: 2, // Third standard room
      checkIn: new Date("2024-05-10"),
      checkOut: new Date("2024-05-13"),
      totalAmount: 360.0,
      paymentStatus: "PAID"
    },
    {
      roomIndex: 12, // Third deluxe room
      checkIn: new Date("2024-05-18"),
      checkOut: new Date("2024-05-21"),
      totalAmount: 540.0,
      paymentStatus: "UNPAID"
    },
    {
      roomIndex: 19, // Second suite
      checkIn: new Date("2024-05-25"),
      checkOut: new Date("2024-05-28"),
      totalAmount: 1050.0,
      paymentStatus: "PARTIALLY_PAID"
    },
    // June 2024
    {
      roomIndex: 3, // Fourth standard room
      checkIn: new Date("2024-06-08"),
      checkOut: new Date("2024-06-11"),
      totalAmount: 360.0,
      paymentStatus: "PAID"
    },
    {
      roomIndex: 13, // Fourth deluxe room
      checkIn: new Date("2024-06-15"),
      checkOut: new Date("2024-06-18"),
      totalAmount: 540.0,
      paymentStatus: "UNPAID"
    },
    {
      roomIndex: 23, // Second presidential suite
      checkIn: new Date("2024-06-22"),
      checkOut: new Date("2024-06-25"),
      totalAmount: 2250.0,
      paymentStatus: "PARTIALLY_PAID"
    },
    // July 2024
    {
      roomIndex: 4, // Fifth standard room
      checkIn: new Date("2024-07-05"),
      checkOut: new Date("2024-07-08"),
      totalAmount: 360.0,
      paymentStatus: "PAID"
    },
    {
      roomIndex: 14, // Fifth deluxe room
      checkIn: new Date("2024-07-12"),
      checkOut: new Date("2024-07-15"),
      totalAmount: 540.0,
      paymentStatus: "UNPAID"
    },
    {
      roomIndex: 20, // Third suite
      checkIn: new Date("2024-07-20"),
      checkOut: new Date("2024-07-23"),
      totalAmount: 1050.0,
      paymentStatus: "PARTIALLY_PAID"
    }
  ];

  // Create reservations
  const reservations = await Promise.all(
    reservationData.map((reservation) =>
      prisma.reservation.create({
        data: {
          organizationId: organization.id,
          roomId: createdRooms[reservation.roomIndex].id,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          source: "WEBSITE",
          status: "CONFIRMED",
          adults: 2,
          children: 0,
          guestName: "Guest User",
          email: "guest@example.com",
          phone: "+1-555-0199"
        }
      })
    )
  );

  console.log("✅ 15 Reservations created");

  // Create payments based on payment status
  const payments = [];

  for (let i = 0; i < reservationData.length; i++) {
    const reservationInfo = reservationData[i];
    const reservation = reservations[i];

    if (reservationInfo.paymentStatus === "PAID") {
      // Full payment
      payments.push(
        prisma.payment.create({
          data: {
            reservationId: reservation.id,
            type: "BOOKING",
            method: "CREDIT_CARD",
            status: "COMPLETED",
            amount: reservationInfo.totalAmount,
            currency: "USD",
            notes: "Full payment received"
          }
        })
      );
    } else if (reservationInfo.paymentStatus === "PARTIALLY_PAID") {
      // Partial payment (50% paid)
      const partialAmount = reservationInfo.totalAmount * 0.5;
      payments.push(
        prisma.payment.create({
          data: {
            reservationId: reservation.id,
            type: "DEPOSIT",
            method: "CREDIT_CARD",
            status: "COMPLETED",
            amount: partialAmount,
            currency: "USD",
            notes: "Partial payment - 50% deposit"
          }
        })
      );
    }
    // For UNPAID status, we don't create any payment records
  }

  await Promise.all(payments);
  console.log("✅ Payment records created with varied status");

  console.log(
    "✅ Seasonal rates, daily rates, and rate logs skipped for simplicity"
  );

  console.log("🎉 Database seeding completed successfully!");
  console.log(`
📊 Summary:
- Organization: Grand Palace Hotel
- Users: 9 users with all roles (no passwords - dev login only)
- Room Types: 4 types (Standard, Deluxe, Suite, Presidential)
- Rooms: 24 rooms total
- Reservations: 15 reservations from March-July 2024
- Payment Status: Mixed (5 Paid, 5 Partially Paid, 5 Unpaid)

🔑 Login Credentials (Dev Mode - Email Only):
- Super Admin: superadmin@example.com
- Org Admin: admin@example.com
- Property Manager: manager@example.com
- Front Desk: frontdesk@example.com
- All other roles available with respective emails
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Database connection closed");
  });
