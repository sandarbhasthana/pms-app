/**
 * Complete Database Restore Script
 * 
 * This script restores all data from a backup file after database reset
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { BackupData } from './backup-data';

const prisma = new PrismaClient();

async function restoreData(backupFilePath: string): Promise<void> {
  console.log('🔄 Starting data restore...');
  console.log(`📁 Reading backup from: ${backupFilePath}`);
  
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }
  
  try {
    // Read backup data
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backup: BackupData = JSON.parse(backupContent);
    
    console.log('📊 Backup Summary:');
    console.log(`- Organizations: ${backup.organizations.length}`);
    console.log(`- Users: ${backup.users.length}`);
    console.log(`- Properties: ${backup.properties.length}`);
    console.log(`- Reservations: ${backup.reservations.length}`);
    console.log(`- Reservation Status History: ${backup.reservationStatusHistory.length}`);
    
    // Restore data in correct order (respecting foreign key dependencies)
    console.log('🔄 Restoring data...');
    
    // 1. Core entities first
    if (backup.organizations.length > 0) {
      console.log('📝 Restoring organizations...');
      await prisma.organization.createMany({ data: backup.organizations, skipDuplicates: true });
    }
    
    if (backup.users.length > 0) {
      console.log('📝 Restoring users...');
      await prisma.user.createMany({ data: backup.users, skipDuplicates: true });
    }
    
    if (backup.userOrgs.length > 0) {
      console.log('📝 Restoring user organizations...');
      await prisma.userOrg.createMany({ data: backup.userOrgs, skipDuplicates: true });
    }
    
    if (backup.properties.length > 0) {
      console.log('📝 Restoring properties...');
      await prisma.property.createMany({ data: backup.properties, skipDuplicates: true });
    }
    
    if (backup.userProperties.length > 0) {
      console.log('📝 Restoring user properties...');
      await prisma.userProperty.createMany({ data: backup.userProperties, skipDuplicates: true });
    }
    
    // 2. Property-related entities
    if (backup.propertySettings.length > 0) {
      console.log('📝 Restoring property settings...');
      await prisma.propertySettings.createMany({ data: backup.propertySettings, skipDuplicates: true });
    }
    
    if (backup.amenities.length > 0) {
      console.log('📝 Restoring amenities...');
      await prisma.amenity.createMany({ data: backup.amenities, skipDuplicates: true });
    }
    
    if (backup.roomTypes.length > 0) {
      console.log('📝 Restoring room types...');
      await prisma.roomType.createMany({ data: backup.roomTypes, skipDuplicates: true });
    }
    
    if (backup.rooms.length > 0) {
      console.log('📝 Restoring rooms...');
      await prisma.room.createMany({ data: backup.rooms, skipDuplicates: true });
    }
    
    if (backup.roomImages.length > 0) {
      console.log('📝 Restoring room images...');
      await prisma.roomImage.createMany({ data: backup.roomImages, skipDuplicates: true });
    }
    
    // 3. Channels
    if (backup.channels.length > 0) {
      console.log('📝 Restoring channels...');
      await prisma.channel.createMany({ data: backup.channels, skipDuplicates: true });
    }
    
    // 4. Reservations and related
    if (backup.reservations.length > 0) {
      console.log('📝 Restoring reservations...');
      await prisma.reservation.createMany({ data: backup.reservations, skipDuplicates: true });
    }
    
    if (backup.reservationStatusHistory.length > 0) {
      console.log('📝 Restoring reservation status history...');
      await prisma.reservationStatusHistory.createMany({ data: backup.reservationStatusHistory, skipDuplicates: true });
    }
    
    // 5. Payment-related entities
    if (backup.paymentMethods.length > 0) {
      console.log('📝 Restoring payment methods...');
      await prisma.paymentMethod.createMany({ data: backup.paymentMethods, skipDuplicates: true });
    }
    
    if (backup.payments.length > 0) {
      console.log('📝 Restoring payments...');
      await prisma.payment.createMany({ data: backup.payments, skipDuplicates: true });
    }
    
    if (backup.paymentTransactions.length > 0) {
      console.log('📝 Restoring payment transactions...');
      await prisma.paymentTransaction.createMany({ data: backup.paymentTransactions, skipDuplicates: true });
    }
    
    if (backup.refunds.length > 0) {
      console.log('📝 Restoring refunds...');
      await prisma.refund.createMany({ data: backup.refunds, skipDuplicates: true });
    }
    
    if (backup.webhookEvents.length > 0) {
      console.log('📝 Restoring webhook events...');
      await prisma.webhookEvent.createMany({ data: backup.webhookEvents, skipDuplicates: true });
    }
    
    // 6. Pricing
    if (backup.roomPricing.length > 0) {
      console.log('📝 Restoring room pricing...');
      await prisma.roomPricing.createMany({ data: backup.roomPricing, skipDuplicates: true });
    }
    
    if (backup.dailyRates.length > 0) {
      console.log('📝 Restoring daily rates...');
      await prisma.dailyRate.createMany({ data: backup.dailyRates, skipDuplicates: true });
    }
    
    if (backup.seasonalRates.length > 0) {
      console.log('📝 Restoring seasonal rates...');
      await prisma.seasonalRate.createMany({ data: backup.seasonalRates, skipDuplicates: true });
    }
    
    if (backup.rateChangeLogs.length > 0) {
      console.log('📝 Restoring rate change logs...');
      await prisma.rateChangeLog.createMany({ data: backup.rateChangeLogs, skipDuplicates: true });
    }
    
    // 7. Other entities
    if (backup.invitationTokens.length > 0) {
      console.log('📝 Restoring invitation tokens...');
      await prisma.invitationToken.createMany({ data: backup.invitationTokens, skipDuplicates: true });
    }
    
    if (backup.favorites.length > 0) {
      console.log('📝 Restoring favorites...');
      await prisma.favorite.createMany({ data: backup.favorites, skipDuplicates: true });
    }
    
    // 8. System data
    if (backup.systemMetrics.length > 0) {
      console.log('📝 Restoring system metrics...');
      await prisma.system_metrics.createMany({ data: backup.systemMetrics, skipDuplicates: true });
    }
    
    if (backup.organizationMetrics.length > 0) {
      console.log('📝 Restoring organization metrics...');
      await prisma.organization_metrics.createMany({ data: backup.organizationMetrics, skipDuplicates: true });
    }
    
    if (backup.systemActivities.length > 0) {
      console.log('📝 Restoring system activities...');
      await prisma.system_activities.createMany({ data: backup.systemActivities, skipDuplicates: true });
    }
    
    if (backup.onboardingTracking.length > 0) {
      console.log('📝 Restoring onboarding tracking...');
      await prisma.onboarding_tracking.createMany({ data: backup.onboardingTracking, skipDuplicates: true });
    }
    
    if (backup.systemHealth.length > 0) {
      console.log('📝 Restoring system health...');
      await prisma.system_health.createMany({ data: backup.systemHealth, skipDuplicates: true });
    }
    
    if (backup.errorLogs.length > 0) {
      console.log('📝 Restoring error logs...');
      await prisma.error_logs.createMany({ data: backup.errorLogs, skipDuplicates: true });
    }
    
    console.log('✅ Data restore completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during restore:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI usage
if (require.main === module) {
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('❌ Please provide backup file path');
    console.log('Usage: npx tsx scripts/restore-data.ts <backup-file-path>');
    process.exit(1);
  }
  
  restoreData(backupFile)
    .then(() => {
      console.log('🎉 Restore script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Restore script failed:', error);
      process.exit(1);
    });
}

export { restoreData };
