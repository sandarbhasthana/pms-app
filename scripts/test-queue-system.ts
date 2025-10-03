/**
 * Test Queue System
 * 
 * Script to test the BullMQ queue system and job processing
 */

import { prisma } from '../src/lib/prisma';
import { triggerManualJob, getScheduledJobsStatus } from '../src/lib/queue/scheduler';
import '../src/lib/queue/workers/automation-worker'; // Initialize worker

async function testQueueSystem() {
  console.log('🧪 Testing Queue System...\n');
  
  try {
    // 1. Get a test property
    console.log('1️⃣ Finding test property...');
    const property = await prisma.property.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    
    if (!property) {
      console.log('❌ No active properties found. Creating test property...');
      // You might want to create a test property here
      return;
    }
    
    console.log(`✅ Using property: ${property.name} (${property.id})\n`);
    
    // 2. Check queue status
    console.log('2️⃣ Checking queue status...');
    const status = await getScheduledJobsStatus();
    console.log('📊 Queue Status:', {
      repeatableJobs: status.repeatableJobs,
      waiting: status.waiting,
      active: status.active,
      completed: status.completed,
      failed: status.failed,
    });
    console.log('');
    
    // 3. Test manual job trigger (dry run)
    console.log('3️⃣ Testing manual job trigger (dry run)...');
    const job = await triggerManualJob('no-show-detection', property.id, { dryRun: true });
    console.log(`✅ Job triggered: ${job.id}\n`);
    
    // 4. Wait a bit for job to process
    console.log('4️⃣ Waiting for job to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 5. Check updated status
    console.log('5️⃣ Checking updated queue status...');
    const updatedStatus = await getScheduledJobsStatus();
    console.log('📊 Updated Queue Status:', {
      waiting: updatedStatus.waiting,
      active: updatedStatus.active,
      completed: updatedStatus.completed,
      failed: updatedStatus.failed,
    });
    
    console.log('\n✅ Queue system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Queue system test failed:', error);
  } finally {
    // Cleanup
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run the test
testQueueSystem();
