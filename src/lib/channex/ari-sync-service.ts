/**
 * ARI (Availability, Rates, Inventory) Sync Service
 *
 * Handles pushing availability and rate updates to Channex.
 * Calculates real-time availability based on reservations and room blocks.
 */

import { prisma } from "@/lib/prisma";
import { getChannexClient } from "./client";
import { getChannexPropertyContext } from "./context";
import type { ARIUpdatePayload, ARIDateEntry } from "./types";
import { format, eachDayOfInterval } from "date-fns";

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors?: string[];
}

export interface AvailabilityData {
  total: number;
  booked: number;
  blocked: number;
  available: number;
}

export interface RateData {
  price: number;
  minLOS: number | null;
  maxLOS: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
}

/**
 * ARI Sync Service for pushing availability and rates to Channex
 */
export class ARISyncService {
  /**
   * Sync availability and rates for a specific room type and date range
   */
  async syncRoomTypeARI(params: {
    propertyId: string;
    roomTypeId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<SyncResult> {
    const { propertyId, roomTypeId, startDate, endDate } = params;
    const errors: string[] = [];

    // Get Channex property context
    const context = await getChannexPropertyContext(propertyId);
    if (!context) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [`Property ${propertyId} is not connected to Channex`]
      };
    }

    // Get room type mapping with its rate plan mappings
    const mapping = await prisma.channexRoomTypeMapping.findFirst({
      where: {
        roomTypeId,
        channexPropertyId: context.channexPropertyId,
        isActive: true
      },
      include: {
        channexProperty: true,
        ratePlanMappings: {
          where: { isActive: true },
          take: 1 // Get the default rate plan
        }
      }
    });

    if (!mapping) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [`No Channex mapping found for room type ${roomTypeId}`]
      };
    }

    // Ensure room type is mapped to Channex
    if (!mapping.channexRoomTypeId) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [`Room type ${roomTypeId} is not mapped to a Channex room type`]
      };
    }

    // Get rate plan (use first active one or skip if none)
    const ratePlanMapping = mapping.ratePlanMappings[0];
    if (!ratePlanMapping) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [`No rate plan mapping found for property ${propertyId}`]
      };
    }

    // Calculate ARI for each day in the range
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    const ariEntries: ARIDateEntry[] = [];

    for (const date of dates) {
      try {
        const availability = await this.calculateAvailability(roomTypeId, date);
        const rateData = await this.getRateForDate(roomTypeId, date);

        ariEntries.push({
          date: format(date, "yyyy-MM-dd"),
          rate: rateData.price,
          availability: availability.available,
          min_stay: rateData.minLOS ?? undefined,
          max_stay: rateData.maxLOS ?? undefined,
          closed_to_arrival: rateData.closedToArrival,
          closed_to_departure: rateData.closedToDeparture
        });
      } catch (error) {
        errors.push(
          `Failed to calculate ARI for date ${format(
            date,
            "yyyy-MM-dd"
          )}: ${error}`
        );
      }
    }

    if (ariEntries.length === 0) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: dates.length,
        errors
      };
    }

    // Build the ARI update payload
    const payload: ARIUpdatePayload = {
      property_id: context.channexPropertyId,
      room_type_id: mapping.channexRoomTypeId,
      rate_plan_id: ratePlanMapping.channexRatePlanId,
      dates: ariEntries
    };

    // Send to Channex
    try {
      const client = getChannexClient();
      await client.updateARI(payload);
    } catch (error) {
      errors.push(`Failed to push ARI to Channex: ${error}`);
      await this.logSync({
        channexPropertyId: mapping.channexPropertyId,
        syncType: "ARI_PUSH",
        status: "FAILED",
        recordsProcessed: 0,
        recordsFailed: ariEntries.length,
        errorMessage: errors.join("; ")
      });

      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: ariEntries.length,
        errors
      };
    }

    // Log successful sync
    await this.logSync({
      channexPropertyId: mapping.channexPropertyId,
      syncType: "ARI_PUSH",
      status: "COMPLETED",
      recordsProcessed: ariEntries.length,
      recordsFailed: 0
    });

    return {
      success: true,
      recordsProcessed: ariEntries.length,
      recordsFailed: 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Sync all room types for a property
   */
  async syncPropertyARI(params: {
    propertyId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<SyncResult> {
    const { propertyId, startDate, endDate } = params;

    // Get all room types for the property
    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId },
      select: { id: true }
    });

    let totalProcessed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (const roomType of roomTypes) {
      const result = await this.syncRoomTypeARI({
        propertyId,
        roomTypeId: roomType.id,
        startDate,
        endDate
      });

      totalProcessed += result.recordsProcessed;
      totalFailed += result.recordsFailed;
      if (result.errors) {
        allErrors.push(...result.errors);
      }
    }

    return {
      success: totalFailed === 0,
      recordsProcessed: totalProcessed,
      recordsFailed: totalFailed,
      errors: allErrors.length > 0 ? allErrors : undefined
    };
  }

  /**
   * Calculate availability for a specific room type on a date
   */
  async calculateAvailability(
    roomTypeId: string,
    date: Date
  ): Promise<AvailabilityData> {
    // Get all rooms for this room type with their reservations and blocks for the date
    const rooms = await prisma.room.findMany({
      where: { roomTypeId },
      include: {
        reservations: {
          where: {
            checkIn: { lte: date },
            checkOut: { gt: date },
            status: {
              in: ["CONFIRMED", "IN_HOUSE", "CONFIRMATION_PENDING"]
            },
            deletedAt: null
          }
        },
        roomBlocks: {
          where: {
            startDate: { lte: date },
            endDate: { gte: date }
          }
        }
      }
    });

    const total = rooms.length;
    const booked = rooms.filter((r) => r.reservations.length > 0).length;
    const blocked = rooms.filter(
      (r) => r.roomBlocks.length > 0 && r.reservations.length === 0
    ).length;
    const available = Math.max(0, total - booked - blocked);

    return { total, booked, blocked, available };
  }

  /**
   * Get rate data for a specific room type on a date
   */
  async getRateForDate(roomTypeId: string, date: Date): Promise<RateData> {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        dailyRates: {
          where: { date }
        }
      }
    });

    if (!roomType) {
      throw new Error(`Room type ${roomTypeId} not found`);
    }

    // Check for daily rate override first
    const dailyRate = roomType.dailyRates[0];

    // Determine if it's a weekend (for weekend pricing)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Calculate price with fallback hierarchy: dailyRate -> weekend/weekday -> base
    let price = roomType.basePrice ?? 0;
    if (dailyRate?.basePrice) {
      price = dailyRate.basePrice;
    } else if (isWeekend && roomType.weekendPrice) {
      price = roomType.weekendPrice;
    } else if (!isWeekend && roomType.weekdayPrice) {
      price = roomType.weekdayPrice;
    }

    return {
      price,
      minLOS: dailyRate?.minLOS ?? roomType.minLOS,
      maxLOS: dailyRate?.maxLOS ?? roomType.maxLOS,
      closedToArrival: dailyRate?.closedToArrival ?? roomType.closedToArrival,
      closedToDeparture:
        dailyRate?.closedToDeparture ?? roomType.closedToDeparture
    };
  }

  /**
   * Log sync operation to database
   */
  private async logSync(data: {
    channexPropertyId: string;
    syncType: "ARI_PUSH" | "ARI_FULL_SYNC";
    status: "COMPLETED" | "FAILED" | "PARTIAL";
    recordsProcessed: number;
    recordsFailed: number;
    errorMessage?: string;
  }): Promise<void> {
    await prisma.channexSyncLog.create({
      data: {
        channexPropertyId: data.channexPropertyId,
        syncType: data.syncType,
        status: data.status,
        recordsProcessed: data.recordsProcessed,
        recordsFailed: data.recordsFailed,
        errorMessage: data.errorMessage,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });
  }
}

/**
 * Singleton instance getter
 */
let ariSyncServiceInstance: ARISyncService | null = null;

export function getARISyncService(): ARISyncService {
  if (!ariSyncServiceInstance) {
    ariSyncServiceInstance = new ARISyncService();
  }
  return ariSyncServiceInstance;
}
