/**
 * Manual Report Cleanup Script
 * 
 * Deletes all expired reports (older than 7 days) from S3 and database
 * Run this script manually: npx tsx scripts/cleanup-expired-reports.ts
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

async function cleanupExpiredReports() {
  console.log('🗑️ Starting manual report cleanup...\n');

  try {
    // Import the cleanup function
    const { deleteExpiredReports } = await import('../src/lib/reports/s3-utils');

    // Run cleanup
    const deletedCount = await deleteExpiredReports();

    console.log('\n✅ Cleanup completed successfully!');
    console.log(`📊 Total reports deleted: ${deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupExpiredReports();

