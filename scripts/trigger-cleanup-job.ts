#!/usr/bin/env tsx

/**
 * Trigger Cleanup Job
 * 
 * Manually triggers the cleanup job to transition IN_HOUSE reservations
 * with checkout today to CHECKOUT_DUE status
 */

import { prisma } from '../src/lib/prisma';
import { triggerManualJob } from '../src/lib/queue/scheduler';
import '../src/lib/queue/workers/automation-worker'; // Initialize worker

async function triggerCleanupJob() {
  console.log('🧹 Triggering Cleanup Job...\n');

  try {
    // Get all active properties
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    if (properties.length === 0) {
      console.log('❌ No active properties found');
      process.exit(1);
    }

    console.log(`📋 Found ${properties.length} active properties:\n`);
    properties.forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.name} (${prop.id})`);
    });

    // Trigger cleanup job for each property
    console.log('\n🚀 Triggering cleanup jobs...\n');
    
    for (const property of properties) {
      console.log(`⚙️  Triggering cleanup for: ${property.name}`);
      
      const job = await triggerManualJob('cleanup', property.id, {
        dryRun: false,
        cleanupType: 'stale-reservations'
      });
      
      console.log(`✅ Job triggered: ${job.id}\n`);
    }

    // Wait for jobs to process
    console.log('⏳ Waiting 10 seconds for jobs to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n✅ Cleanup jobs completed!');
    console.log('💡 Check your calendar - IN_HOUSE reservations with checkout today should now be CHECKOUT_DUE');
    
  } catch (error) {
    console.error('❌ Error triggering cleanup job:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run the script
triggerCleanupJob();

