#!/usr/bin/env tsx

/**
 * Initialize Scheduler
 * 
 * Initializes all recurring jobs for active properties including:
 * - No-show detection
 * - Late checkout detection  
 * - Cleanup (handles CHECKOUT_DUE transitions)
 */

import { initializeScheduledJobs, getScheduledJobsStatus } from '../src/lib/queue/scheduler';
import { prisma } from '../src/lib/prisma';

async function initScheduler() {
  console.log('🕐 Initializing Job Scheduler...\n');

  try {
    // Initialize all scheduled jobs
    await initializeScheduledJobs();

    // Get status
    console.log('\n📊 Getting scheduler status...');
    const status = await getScheduledJobsStatus();

    console.log('\n✅ Scheduler Status:');
    console.log(`   Repeatable Jobs: ${status.repeatableJobs}`);
    console.log(`   Waiting: ${status.waiting}`);
    console.log(`   Active: ${status.active}`);
    console.log(`   Completed: ${status.completed}`);
    console.log(`   Failed: ${status.failed}`);

    if (status.jobs.length > 0) {
      console.log('\n📋 Scheduled Jobs:');
      status.jobs.forEach((job) => {
        const nextRun = job.next ? new Date(job.next).toLocaleString() : 'N/A';
        console.log(`   - ${job.id}`);
        console.log(`     Pattern: ${job.pattern}`);
        console.log(`     Next Run: ${nextRun}`);
      });
    }

    console.log('\n✅ Scheduler initialized successfully!');
    console.log('💡 Jobs will run automatically according to their schedules');
    console.log('💡 In development mode:');
    console.log('   - No-show detection: Every 2 minutes');
    console.log('   - Late checkout detection: Every 3 minutes');
    console.log('   - Cleanup (CHECKOUT_DUE transitions): Every 10 minutes');
    
  } catch (error) {
    console.error('❌ Error initializing scheduler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run the script
initScheduler();

