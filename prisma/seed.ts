// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear only transactional data (order matters due to foreign key constraints)
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.rateChangeLog.deleteMany();
  await prisma.seasonalRate.deleteMany();
  await prisma.dailyRate.deleteMany();
  await prisma.roomPricing.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.userProperty.deleteMany(); // Clear property-level user access

  console.log("🗑️ Cleared transactional data");

  // Get or create Organization (preserve existing org to keep sessions valid)
  // First, try to find an existing organization
  let organization = await prisma.organization.findFirst();

  if (!organization) {
    // If no organization exists, create one
    organization = await prisma.organization.create({
      data: {
        name: "Grand Palace Hotel",
        domain: "example.com"
      }
    });
    console.log("✅ Organization created");
  } else {
    console.log(
      `✅ Organization found (reusing existing): ${organization.name}`
    );
  }

  // Get or create Properties for the organization
  let mainProperty = await prisma.property.findFirst({
    where: {
      organizationId: organization.id,
      name: "Grand Palace Hotel - Main Property"
    }
  });

  if (!mainProperty) {
    mainProperty = await prisma.property.create({
      data: {
        organizationId: organization.id,
        name: "Grand Palace Hotel - Main Property",
        address: "123 Main Street, Downtown",
        phone: "+1-555-0123",
        email: "main@grandpalace.com",
        timezone: "America/New_York",
        currency: "USD",
        isActive: true,
        isDefault: true
      }
    });
  }

  let beachProperty = await prisma.property.findFirst({
    where: {
      organizationId: organization.id,
      name: "Grand Palace Beach Resort"
    }
  });

  if (!beachProperty) {
    beachProperty = await prisma.property.create({
      data: {
        organizationId: organization.id,
        name: "Grand Palace Beach Resort",
        address: "456 Ocean Drive, Beach City",
        phone: "+1-555-0456",
        email: "beach@grandpalace.com",
        timezone: "America/New_York",
        currency: "USD",
        isActive: true,
        isDefault: false
      }
    });
  }

  console.log("✅ Properties created/found");

  // Create or update Users with all roles using upsert
  const userConfigs = [
    {
      name: "Super Administrator",
      email: "superadmin@example.com",
      role: "SUPER_ADMIN" as const
    },
    {
      name: "Organization Admin",
      email: "admin@example.com",
      role: "ORG_ADMIN" as const
    },
    {
      name: "John Property Manager",
      email: "manager@example.com",
      role: "PROPERTY_MGR" as const
    },
    {
      name: "Sarah",
      email: "frontdesk@example.com",
      role: "FRONT_DESK" as const
    },
    {
      name: "Maria Housekeeping",
      email: "housekeeping@example.com",
      role: "HOUSEKEEPING" as const
    },
    {
      name: "Mike Maintenance",
      email: "maintenance@example.com",
      role: "MAINTENANCE" as const
    },
    {
      name: "Lisa Accountant",
      email: "accountant@example.com",
      role: "ACCOUNTANT" as const
    },
    {
      name: "Robert Owner",
      email: "owner@example.com",
      role: "OWNER" as const
    },
    {
      name: "Alex IT Support",
      email: "it@example.com",
      role: "IT_SUPPORT" as const
    }
  ];

  const users = await Promise.all(
    userConfigs.map(async (config) => {
      const user = await prisma.user.upsert({
        where: { email: config.email },
        update: { name: config.name },
        create: {
          name: config.name,
          email: config.email
        }
      });

      // Ensure user has membership in organization
      const existingMembership = await prisma.userOrg.findFirst({
        where: {
          userId: user.id,
          organizationId: organization.id
        }
      });

      if (!existingMembership) {
        await prisma.userOrg.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: config.role
          }
        });
      }

      return user;
    })
  );

  console.log("✅ Users with all roles created");

  // Also ensure any existing users in the database are added to the organization
  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) {
    const existingMembership = await prisma.userOrg.findFirst({
      where: {
        userId: user.id,
        organizationId: organization.id
      }
    });

    if (!existingMembership) {
      // Add user to organization with ORG_ADMIN role by default
      await prisma.userOrg.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "ORG_ADMIN"
        }
      });
      console.log(`✅ Added existing user ${user.email} to organization`);
    }
  }

  // Create property-level user assignments
  const propertyUserAssignments = await Promise.all([
    // Property Manager has access to main property
    prisma.userProperty.create({
      data: {
        userId: users[2].id, // Property Manager
        propertyId: mainProperty.id,
        role: "PROPERTY_MGR"
      }
    }),
    // Front Desk has access to main property
    prisma.userProperty.create({
      data: {
        userId: users[3].id, // Front Desk
        propertyId: mainProperty.id,
        role: "FRONT_DESK"
      }
    }),
    // Housekeeping has access to both properties
    prisma.userProperty.create({
      data: {
        userId: users[4].id, // Housekeeping
        propertyId: mainProperty.id,
        role: "HOUSEKEEPING"
      }
    }),
    prisma.userProperty.create({
      data: {
        userId: users[4].id, // Housekeeping
        propertyId: beachProperty.id,
        role: "HOUSEKEEPING"
      }
    }),
    // Maintenance has access to beach property
    prisma.userProperty.create({
      data: {
        userId: users[5].id, // Maintenance
        propertyId: beachProperty.id,
        role: "MAINTENANCE"
      }
    })
  ]);

  console.log("✅ Property-level user assignments created");

  // Create Room Types with base pricing for Main Property
  const mainPropertyRoomTypes = await Promise.all([
    prisma.roomType.create({
      data: {
        name: "Standard Room",
        description: "Comfortable standard room with city view",
        maxOccupancy: 2,
        organizationId: organization.id,
        propertyId: mainProperty.id, // NEW: Associate with main property
        amenities: [],
        customAmenities: [],
        basePrice: 2500.0, // ₹2,500 base price
        weekdayPrice: 2200.0, // ₹2,200 weekday price
        weekendPrice: 2800.0, // ₹2,800 weekend price
        availability: 10 // 10 standard rooms available
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Deluxe Room",
        description: "Spacious deluxe room with premium amenities",
        maxOccupancy: 2,
        organizationId: organization.id,
        propertyId: mainProperty.id, // NEW: Associate with main property
        amenities: [],
        customAmenities: [],
        basePrice: 3500.0, // ₹3,500 base price
        weekdayPrice: 3200.0, // ₹3,200 weekday price
        weekendPrice: 3800.0, // ₹3,800 weekend price
        availability: 8 // 8 deluxe rooms available
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Executive Suite",
        description: "Luxury suite with separate living area",
        maxOccupancy: 2,
        organizationId: organization.id,
        propertyId: mainProperty.id, // NEW: Associate with main property
        amenities: [],
        customAmenities: [],
        basePrice: 5500.0, // ₹5,500 base price
        weekdayPrice: 5000.0, // ₹5,000 weekday price
        weekendPrice: 6000.0, // ₹6,000 weekend price
        availability: 4 // 4 executive suites available
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Presidential Suite",
        description: "Ultimate luxury with panoramic views",
        maxOccupancy: 4,
        organizationId: organization.id,
        propertyId: mainProperty.id, // NEW: Associate with main property
        amenities: [],
        customAmenities: [],
        basePrice: 12000.0, // ₹12,000 base price
        weekdayPrice: 10000.0, // ₹10,000 weekday price
        weekendPrice: 15000.0, // ₹15,000 weekend price
        availability: 2 // 2 presidential suites available
      }
    })
  ]);

  // Create Room Types for Beach Property
  const beachPropertyRoomTypes = await Promise.all([
    prisma.roomType.create({
      data: {
        name: "Ocean View Room",
        description: "Beautiful room with direct ocean views",
        maxOccupancy: 2,
        organizationId: organization.id,
        propertyId: beachProperty.id, // NEW: Associate with beach property
        amenities: [],
        customAmenities: [],
        basePrice: 3000.0,
        weekdayPrice: 2700.0,
        weekendPrice: 3300.0,
        availability: 6
      }
    }),
    prisma.roomType.create({
      data: {
        name: "Beach Villa",
        description: "Luxury villa steps from the beach",
        maxOccupancy: 4,
        organizationId: organization.id,
        propertyId: beachProperty.id, // NEW: Associate with beach property
        amenities: [],
        customAmenities: [],
        basePrice: 8000.0,
        weekdayPrice: 7000.0,
        weekendPrice: 9000.0,
        availability: 3
      }
    })
  ]);

  // Extract room type IDs for later use
  const [
    standardRoomType,
    deluxeRoomType,
    suiteRoomType,
    presidentialRoomType
  ] = mainPropertyRoomTypes;

  const [oceanViewRoomType, beachVillaRoomType] = beachPropertyRoomTypes;

  console.log("✅ Room types created");

  // Helper function to batch create rooms
  async function batchCreateRooms(
    roomConfigs: Array<{
      name: string;
      type: string;
      capacity: number;
      roomTypeId: string;
    }>,
    propertyId: string,
    organizationId: string,
    batchSize: number = 5
  ) {
    const createdRooms = [];
    for (let i = 0; i < roomConfigs.length; i += batchSize) {
      const batch = roomConfigs.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((config) =>
          prisma.room.create({
            data: {
              name: config.name,
              type: config.type,
              capacity: config.capacity,
              roomTypeId: config.roomTypeId,
              organizationId,
              propertyId
            }
          })
        )
      );
      createdRooms.push(...batchResults);
    }
    return createdRooms;
  }

  // Create Rooms for Main Property
  const mainPropertyRoomConfigs = [];

  // Standard Rooms (101-110)
  for (let i = 101; i <= 110; i++) {
    mainPropertyRoomConfigs.push({
      name: `Room ${i}`,
      type: "Standard",
      capacity: 2,
      roomTypeId: standardRoomType.id
    });
  }

  // Deluxe Rooms (201-208)
  for (let i = 201; i <= 208; i++) {
    mainPropertyRoomConfigs.push({
      name: `Room ${i}`,
      type: "Deluxe",
      capacity: 2,
      roomTypeId: deluxeRoomType.id
    });
  }

  // Executive Suites (301-304)
  for (let i = 301; i <= 304; i++) {
    mainPropertyRoomConfigs.push({
      name: `Suite ${i}`,
      type: "Suite",
      capacity: 2,
      roomTypeId: suiteRoomType.id
    });
  }

  // Presidential Suites (401-402)
  for (let i = 401; i <= 402; i++) {
    mainPropertyRoomConfigs.push({
      name: `Presidential Suite ${i}`,
      type: "Presidential",
      capacity: 4,
      roomTypeId: presidentialRoomType.id
    });
  }

  // Create Rooms for Beach Property
  const beachPropertyRoomConfigs = [];

  // Ocean View Rooms (501-506)
  for (let i = 501; i <= 506; i++) {
    beachPropertyRoomConfigs.push({
      name: `Ocean Room ${i}`,
      type: "Ocean View",
      capacity: 2,
      roomTypeId: oceanViewRoomType.id
    });
  }

  // Beach Villas (601-603)
  for (let i = 601; i <= 603; i++) {
    beachPropertyRoomConfigs.push({
      name: `Beach Villa ${i}`,
      type: "Villa",
      capacity: 4,
      roomTypeId: beachVillaRoomType.id
    });
  }

  const createdMainRooms = await batchCreateRooms(
    mainPropertyRoomConfigs,
    mainProperty.id,
    organization.id
  );
  const createdBeachRooms = await batchCreateRooms(
    beachPropertyRoomConfigs,
    beachProperty.id,
    organization.id
  );
  const createdRooms = [...createdMainRooms, ...createdBeachRooms];
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

  // Create reservations with batching
  const reservations = [];
  const batchSize = 5;
  for (let i = 0; i < reservationData.length; i += batchSize) {
    const batch = reservationData.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((reservation) => {
        const room = createdRooms[reservation.roomIndex];
        // Determine property based on room
        const propertyId =
          reservation.roomIndex < createdMainRooms.length
            ? mainProperty.id
            : beachProperty.id;

        return prisma.reservation.create({
          data: {
            organizationId: organization.id,
            propertyId: propertyId, // NEW: Associate with appropriate property
            roomId: room.id,
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
        });
      })
    );
    reservations.push(...batchResults);
  }

  console.log("✅ 15 Reservations created");

  // Create payments based on payment status with batching
  const paymentPromises = [];

  for (let i = 0; i < reservationData.length; i++) {
    const reservationInfo = reservationData[i];
    const reservation = reservations[i];

    if (reservationInfo.paymentStatus === "PAID") {
      // Full payment
      paymentPromises.push(
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
      paymentPromises.push(
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

  // Batch process payments
  const paymentBatchSize = 5;
  for (let i = 0; i < paymentPromises.length; i += paymentBatchSize) {
    const batch = paymentPromises.slice(i, i + paymentBatchSize);
    await Promise.all(batch);
  }

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
