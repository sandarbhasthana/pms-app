#!/usr/bin/env ts-node
// File: scripts/export-data.ts
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

async function exportData() {
  console.log("🔄 Exporting database data...");

  try {
    // Export all data (only existing tables)
    const data = {
      organizations: await prisma.organization.findMany(),
      properties: await prisma.property.findMany(),
      users: await prisma.user.findMany(),
      userOrgs: await prisma.userOrg.findMany(),
      userProperties: await prisma.userProperty.findMany(),
      invitationTokens: await prisma.invitationToken.findMany(),
      roomTypes: await prisma.roomType.findMany(),
      rooms: await prisma.room.findMany(),
      reservations: await prisma.reservation.findMany(),
      channels: await prisma.channel.findMany(),
      propertySettings: await prisma.propertySettings.findMany(),
      roomPricing: await prisma.roomPricing.findMany(),
      dailyRates: await prisma.dailyRate.findMany(),
      seasonalRates: await prisma.seasonalRate.findMany(),
      rateChangeLogs: await prisma.rateChangeLog.findMany(),
      amenities: await prisma.amenity.findMany(),
      roomImages: await prisma.roomImage.findMany(),
      favorites: await prisma.favorite.findMany()
    };

    // Create timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `data-export-${timestamp}.json`;
    const filepath = path.join(process.cwd(), "backups", filename);

    // Write to file
    writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log(`✅ Data exported successfully to: ${filepath}`);
    console.log(`📊 Export summary:`);
    console.log(`   Organizations: ${data.organizations.length}`);
    console.log(`   Properties: ${data.properties.length}`);
    console.log(`   Users: ${data.users.length}`);
    console.log(`   Reservations: ${data.reservations.length}`);
    console.log(`   Room Types: ${data.roomTypes.length}`);
    console.log(`   Rooms: ${data.rooms.length}`);

    return filepath;
  } catch (error) {
    console.error("❌ Data export failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  exportData();
}

export { exportData };
