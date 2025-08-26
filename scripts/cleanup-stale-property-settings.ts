#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Analyzing PropertySettings vs Property table data...\n");

  try {
    // Get all properties with their settings
    const properties = await prisma.property.findMany({
      include: {
        settings: true,
        organization: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${properties.length} properties to analyze:\n`);

    for (const property of properties) {
      console.log(`🏢 Property: ${property.name}`);
      console.log(`   ID: ${property.id}`);
      console.log(`   Organization: ${property.organization.name}`);
      console.log(`   Has Settings: ${property.settings ? "✅ YES" : "❌ NO"}`);

      if (property.settings) {
        // Compare Property table vs PropertySettings table
        const propertyData = {
          name: property.name,
          phone: property.phone,
          email: property.email,
          address: property.address
        };

        const settingsData = {
          name: property.settings.propertyName,
          phone: property.settings.propertyPhone,
          email: property.settings.propertyEmail,
          address: property.settings.street
        };

        console.log(`   📊 Data Comparison:`);
        console.log(`      Property Table -> Settings Table`);
        console.log(`      Name: "${propertyData.name}" -> "${settingsData.name}"`);
        console.log(`      Phone: "${propertyData.phone || 'null'}" -> "${settingsData.phone}"`);
        console.log(`      Email: "${propertyData.email || 'null'}" -> "${settingsData.email}"`);
        console.log(`      Address: "${propertyData.address || 'null'}" -> "${settingsData.address}"`);

        // Check if data is mismatched (stale)
        const isStale = 
          propertyData.name !== settingsData.name ||
          (propertyData.phone || '') !== settingsData.phone ||
          (propertyData.email || '') !== settingsData.email;

        if (isStale) {
          console.log(`   🚨 STALE DATA DETECTED! Settings don't match Property table.`);
          console.log(`   💡 Recommendation: Delete PropertySettings ID ${property.settings.id}`);
        } else {
          console.log(`   ✅ Data matches - settings are current.`);
        }
      }
      console.log("");
    }

    // Ask for confirmation before cleanup
    console.log("🧹 CLEANUP OPTIONS:");
    console.log("1. Run this script with --cleanup flag to delete stale PropertySettings");
    console.log("2. Or manually delete specific PropertySettings records");
    console.log("\nExample cleanup command:");
    console.log("npx tsx scripts/cleanup-stale-property-settings.ts --cleanup");

    // Check if cleanup flag is provided
    if (process.argv.includes('--cleanup')) {
      console.log("\n🚨 CLEANUP MODE ACTIVATED!");
      console.log("Deleting stale PropertySettings records...\n");

      let deletedCount = 0;
      for (const property of properties) {
        if (property.settings) {
          const propertyData = {
            name: property.name,
            phone: property.phone,
            email: property.email
          };

          const settingsData = {
            name: property.settings.propertyName,
            phone: property.settings.propertyPhone,
            email: property.settings.propertyEmail
          };

          const isStale = 
            propertyData.name !== settingsData.name ||
            (propertyData.phone || '') !== settingsData.phone ||
            (propertyData.email || '') !== settingsData.email;

          if (isStale) {
            console.log(`🗑️  Deleting stale settings for: ${property.name}`);
            await prisma.propertySettings.delete({
              where: { id: property.settings.id }
            });
            deletedCount++;
          }
        }
      }

      console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} stale PropertySettings records.`);
      console.log("Now your property settings will use fresh defaults from the Property table.");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
