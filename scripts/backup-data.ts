/**
 * Complete Database Backup Script
 *
 * This script creates a complete backup of all data in the database
 * so we can safely reset the database to fix migration drift issues
 * and then restore all the data.
 */

import { PrismaClient } from "@prisma/client";
import type {
  Organization,
  User,
  UserOrg,
  Property,
  UserProperty,
  RoomType,
  Room,
  Reservation,
  ReservationStatusHistory,
  PropertySettings,
  Channel,
  Payment,
  PaymentMethod,
  PaymentTransaction,
  Refund,
  WebhookEvent,
  RoomPricing,
  DailyRate,
  SeasonalRate,
  RateChangeLog,
  InvitationToken,
  Favorite,
  Amenity,
  RoomImage
} from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function safeQuery<T>(
  queryFn: () => Promise<T[]>,
  tableName: string
): Promise<T[]> {
  try {
    return await queryFn();
  } catch (error) {
    console.warn(
      `⚠️  Warning: Could not backup ${tableName} - table may not exist: ${error}`
    );
    return [];
  }
}

interface BackupData {
  organizations: Organization[];
  users: User[];
  userOrgs: UserOrg[];
  properties: Property[];
  userProperties: UserProperty[];
  roomTypes: RoomType[];
  rooms: Room[];
  reservations: Reservation[];
  reservationStatusHistory: ReservationStatusHistory[];
  propertySettings: PropertySettings[];
  channels: Channel[];
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  paymentTransactions: PaymentTransaction[];
  refunds: Refund[];
  webhookEvents: WebhookEvent[];
  roomPricing: RoomPricing[];
  dailyRates: DailyRate[];
  seasonalRates: SeasonalRate[];
  rateChangeLogs: RateChangeLog[];
  invitationTokens: InvitationToken[];
  favorites: Favorite[];
  amenities: Amenity[];
  roomImages: RoomImage[];
  systemMetrics: unknown[];
  organizationMetrics: unknown[];
  systemActivities: unknown[];
  onboardingTracking: unknown[];
  systemHealth: unknown[];
  errorLogs: unknown[];
}

async function backupData(): Promise<void> {
  console.log("🔄 Starting data backup...");

  try {
    const backup: BackupData = {
      // Core entities
      organizations: await prisma.organization.findMany(),
      users: await prisma.user.findMany(),
      userOrgs: await prisma.userOrg.findMany(),
      properties: await prisma.property.findMany(),
      userProperties: await prisma.userProperty.findMany(),

      // Property management
      roomTypes: await prisma.roomType.findMany(),
      rooms: await prisma.room.findMany(),
      reservations: await prisma.reservation.findMany(),
      reservationStatusHistory:
        await prisma.reservationStatusHistory.findMany(),
      propertySettings: await prisma.propertySettings.findMany(),

      // Channels and payments
      channels: await prisma.channel.findMany(),
      payments: await prisma.payment.findMany(),
      paymentMethods: await prisma.paymentMethod.findMany(),
      paymentTransactions: await prisma.paymentTransaction.findMany(),
      refunds: await prisma.refund.findMany(),
      webhookEvents: await prisma.webhookEvent.findMany(),

      // Pricing
      roomPricing: await prisma.roomPricing.findMany(),
      dailyRates: await prisma.dailyRate.findMany(),
      seasonalRates: await prisma.seasonalRate.findMany(),
      rateChangeLogs: await prisma.rateChangeLog.findMany(),

      // Other entities
      invitationTokens: await prisma.invitationToken.findMany(),
      favorites: await prisma.favorite.findMany(),
      amenities: await prisma.amenity.findMany(),
      roomImages: await prisma.roomImage.findMany(),

      // System data (these might not exist in current schema)
      systemMetrics: await safeQuery(
        () =>
          (
            prisma as unknown as {
              system_metrics?: { findMany(): Promise<unknown[]> };
            }
          ).system_metrics?.findMany() || Promise.resolve([]),
        "systemMetrics"
      ),
      organizationMetrics: await safeQuery(
        () =>
          (
            prisma as unknown as {
              organization_metrics?: { findMany(): Promise<unknown[]> };
            }
          ).organization_metrics?.findMany() || Promise.resolve([]),
        "organizationMetrics"
      ),
      systemActivities: await safeQuery(
        () =>
          (
            prisma as unknown as {
              system_activities?: { findMany(): Promise<unknown[]> };
            }
          ).system_activities?.findMany() || Promise.resolve([]),
        "systemActivities"
      ),
      onboardingTracking: await safeQuery(
        () =>
          (
            prisma as unknown as {
              onboarding_tracking?: { findMany(): Promise<unknown[]> };
            }
          ).onboarding_tracking?.findMany() || Promise.resolve([]),
        "onboardingTracking"
      ),
      systemHealth: await safeQuery(
        () =>
          (
            prisma as unknown as {
              system_health?: { findMany(): Promise<unknown[]> };
            }
          ).system_health?.findMany() || Promise.resolve([]),
        "systemHealth"
      ),
      errorLogs: await safeQuery(
        () =>
          (
            prisma as unknown as {
              error_logs?: { findMany(): Promise<unknown[]> };
            }
          ).error_logs?.findMany() || Promise.resolve([]),
        "errorLogs"
      )
    };

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `data-backup-${timestamp}.json`);

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log("✅ Data backup completed successfully!");
    console.log(`📁 Backup saved to: ${backupPath}`);

    // Print summary
    console.log("\n📊 Backup Summary:");
    console.log(`- Organizations: ${backup.organizations.length}`);
    console.log(`- Users: ${backup.users.length}`);
    console.log(`- Properties: ${backup.properties.length}`);
    console.log(`- Reservations: ${backup.reservations.length}`);
    console.log(
      `- Reservation Status History: ${backup.reservationStatusHistory.length}`
    );
    console.log(`- Room Types: ${backup.roomTypes.length}`);
    console.log(`- Rooms: ${backup.rooms.length}`);
    console.log(`- Payments: ${backup.payments.length}`);

    return;
  } catch (error) {
    console.error("❌ Error during backup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  backupData()
    .then(() => {
      console.log("🎉 Backup script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Backup script failed:", error);
      process.exit(1);
    });
}

export { backupData };
export type { BackupData };
