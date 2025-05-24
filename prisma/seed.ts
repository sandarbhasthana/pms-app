// prisma/seed.ts
import {
  PrismaClient,
  UserRole,
  ChannelType,
  ReservationSource,
  ReservationStatus
} from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1. Default organization
  const organization = await prisma.organization.upsert({
    where: { domain: "default" },
    update: {},
    create: { name: "Default Property", domain: "default" }
  });

  // 2. Create or update one user per role (Option A)
  const roles = Object.values(UserRole);
  const users: { id: string; role: UserRole }[] = [];
  for (const role of roles) {
    const email = `${role.toLowerCase()}@example.com`;
    // Upsert user to avoid duplicates on re-seed
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: `Test ${role}` },
      create: { email, name: `Test ${role}` }
    });
    await prisma.userOrg.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id
        }
      },
      update: { role },
      create: { userId: user.id, organizationId: organization.id, role }
    });
    users.push({ id: user.id, role });
  }

  // 3. Sample rooms (2 records)
  const sampleRooms = [
    { name: "Deluxe Room", type: "Deluxe", capacity: 2 },
    { name: "Executive Suite", type: "Suite", capacity: 4 }
  ];
  const rooms: { id: string }[] = [];
  for (const r of sampleRooms) {
    const room = await prisma.room.create({
      data: { ...r, organizationId: organization.id }
    });
    rooms.push({ id: room.id });
  }

  // 4. Sample channels (2 records)
  const channelsData = [
    { name: "Booking.com", type: ChannelType.BOOKING_COM },
    { name: "Airbnb", type: ChannelType.AIRBNB }
  ];
  for (const c of channelsData) {
    await prisma.channel.create({
      data: { ...c, organizationId: organization.id }
    });
  }

  // 5. Sample reservations (2 records)
  for (let i = 0; i < 2; i++) {
    await prisma.reservation.create({
      data: {
        organizationId: organization.id,
        roomId: rooms[i].id,
        userId: users[i].id,
        checkIn: new Date(Date.now() + 1000 * 60 * 60 * 24 * i),
        checkOut: new Date(Date.now() + 1000 * 60 * 60 * 24 * (i + 1)),
        source: ReservationSource.WEBSITE,
        status: ReservationStatus.CONFIRMED
      }
    });
  }

  // 6. Sample favorites (2 records)
  for (let i = 0; i < 2; i++) {
    await prisma.favorite.create({
      data: { userId: users[i].id, roomId: rooms[i].id }
    });
  }

  console.log(
    "🌱 Database seeded with users, roles, rooms, channels, reservations, and favorites"
  );
}

async function runSeed() {
  //if (process.env.NODE_ENV === "development") {
  //console.log("🌱 Running seed script in development environment");
  await main();
  //} else {
  //console.log("⏭️ Skipping seed script in production environment");
  //}
}

runSeed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
