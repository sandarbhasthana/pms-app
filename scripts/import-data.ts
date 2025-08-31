#!/usr/bin/env ts-node
// File: scripts/import-data.ts
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

async function importData(backupFile: string) {
  console.log(`🔄 Importing data from: ${backupFile}`);

  try {
    // Read backup file
    const filepath = path.isAbsolute(backupFile)
      ? backupFile
      : path.join(process.cwd(), "backups", backupFile);

    const data = JSON.parse(readFileSync(filepath, "utf8"));

    console.log("📊 Data to import:");
    console.log(`   Organizations: ${data.organizations?.length || 0}`);
    console.log(`   Properties: ${data.properties?.length || 0}`);
    console.log(`   Users: ${data.users?.length || 0}`);
    console.log(`   Reservations: ${data.reservations?.length || 0}`);
    console.log(`   Room Types: ${data.roomTypes?.length || 0}`);
    console.log(`   Rooms: ${data.rooms?.length || 0}`);

    // Import in dependency order

    // 1. Organizations
    if (data.organizations?.length > 0) {
      console.log("📥 Importing organizations...");
      for (const org of data.organizations) {
        await prisma.organization.upsert({
          where: { id: org.id },
          update: org,
          create: org
        });
      }
      console.log(`✅ Imported ${data.organizations.length} organizations`);
    }

    // 2. Properties
    if (data.properties?.length > 0) {
      console.log("📥 Importing properties...");
      for (const property of data.properties) {
        await prisma.property.upsert({
          where: { id: property.id },
          update: property,
          create: property
        });
      }
      console.log(`✅ Imported ${data.properties.length} properties`);
    }

    // 3. Users
    if (data.users?.length > 0) {
      console.log("📥 Importing users...");
      for (const user of data.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: user,
          create: user
        });
      }
      console.log(`✅ Imported ${data.users.length} users`);
    }

    // 4. User Organizations
    if (data.userOrgs?.length > 0) {
      console.log("📥 Importing user organizations...");
      for (const userOrg of data.userOrgs) {
        await prisma.userOrg.upsert({
          where: { id: userOrg.id },
          update: userOrg,
          create: userOrg
        });
      }
      console.log(`✅ Imported ${data.userOrgs.length} user organizations`);
    }

    // 5. User Properties
    if (data.userProperties?.length > 0) {
      console.log("📥 Importing user properties...");
      for (const userProperty of data.userProperties) {
        await prisma.userProperty.upsert({
          where: { id: userProperty.id },
          update: userProperty,
          create: userProperty
        });
      }
      console.log(`✅ Imported ${data.userProperties.length} user properties`);
    }

    // 6. Invitation Tokens
    if (data.invitationTokens?.length > 0) {
      console.log("📥 Importing invitation tokens...");
      for (const token of data.invitationTokens) {
        await prisma.invitationToken.upsert({
          where: { id: token.id },
          update: token,
          create: token
        });
      }
      console.log(
        `✅ Imported ${data.invitationTokens.length} invitation tokens`
      );
    }

    // 7. Room Types
    if (data.roomTypes?.length > 0) {
      console.log("📥 Importing room types...");
      for (const roomType of data.roomTypes) {
        await prisma.roomType.upsert({
          where: { id: roomType.id },
          update: roomType,
          create: roomType
        });
      }
      console.log(`✅ Imported ${data.roomTypes.length} room types`);
    }

    // 8. Rooms
    if (data.rooms?.length > 0) {
      console.log("📥 Importing rooms...");
      for (const room of data.rooms) {
        await prisma.room.upsert({
          where: { id: room.id },
          update: room,
          create: room
        });
      }
      console.log(`✅ Imported ${data.rooms.length} rooms`);
    }

    // 9. Reservations
    if (data.reservations?.length > 0) {
      console.log("📥 Importing reservations...");
      for (const reservation of data.reservations) {
        await prisma.reservation.upsert({
          where: { id: reservation.id },
          update: reservation,
          create: reservation
        });
      }
      console.log(`✅ Imported ${data.reservations.length} reservations`);
    }

    // 10. Other tables (if they exist)
    const otherTables = [
      "channels",
      "propertySettings",
      "roomPricing",
      "dailyRates",
      "seasonalRates",
      "rateChangeLogs",
      "amenities",
      "roomImages",
      "favorites"
    ] as const;

    for (const tableName of otherTables) {
      if (data[tableName]?.length > 0) {
        console.log(`📥 Importing ${tableName}...`);

        for (const record of data[tableName]) {
          try {
            // Type-safe dynamic model access
            switch (tableName) {
              case "channels":
                await prisma.channel.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "propertySettings":
                await prisma.propertySettings.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "roomPricing":
                await prisma.roomPricing.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "dailyRates":
                await prisma.dailyRate.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "seasonalRates":
                await prisma.seasonalRate.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "rateChangeLogs":
                await prisma.rateChangeLog.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "amenities":
                await prisma.amenity.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "roomImages":
                await prisma.roomImage.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              case "favorites":
                await prisma.favorite.upsert({
                  where: { id: record.id },
                  update: record,
                  create: record
                });
                break;
              default:
                console.warn(`⚠️ Unknown table: ${tableName}`);
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.warn(`⚠️ Skipped ${tableName} record:`, errorMessage);
          }
        }
        console.log(`✅ Imported ${data[tableName].length} ${tableName}`);
      }
    }

    console.log("\n🎉 Data import completed successfully!");

    // Verify import
    const counts = {
      organizations: await prisma.organization.count(),
      properties: await prisma.property.count(),
      users: await prisma.user.count(),
      reservations: await prisma.reservation.count(),
      roomTypes: await prisma.roomType.count(),
      rooms: await prisma.room.count()
    };

    console.log("\n📊 Current database counts:");
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });
  } catch (error) {
    console.error("❌ Data import failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const backupFile = args[0];

  if (!backupFile) {
    console.log(`
📥 Data Import Tool

Usage:
  npx tsx scripts/import-data.ts <backup-file>

Examples:
  npx tsx scripts/import-data.ts data-export-2025-08-29T18-02-07.json
  npx tsx scripts/import-data.ts backups/data-export-2025-08-29T18-02-07.json
    `);
    process.exit(1);
  }

  try {
    await importData(backupFile);
  } catch (error) {
    console.error("❌ Import operation failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { importData };
