/**
 * Channex Event Triggers
 *
 * Automatically triggers ARI syncs when reservations, rates, or availability changes.
 * These functions should be called from reservation/rate update handlers.
 */

import { isChannexEnabledForProperty } from "./context";
import {
  queueARISync,
  queueFullSync,
  queueReservationSync
} from "./queue-helpers";

/**
 * Trigger ARI sync when a reservation is created or modified
 * Syncs availability for all dates in the reservation range
 */
export async function onReservationChange(params: {
  propertyId: string;
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  reservationId?: string;
  action?: "create" | "update" | "cancel";
  triggeredBy?: string;
}): Promise<void> {
  const {
    propertyId,
    roomTypeId,
    checkIn,
    checkOut,
    reservationId,
    action,
    triggeredBy
  } = params;

  // Check if Channex is enabled
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    return;
  }

  // Queue ARI sync for the affected date range
  await queueARISync({
    propertyId,
    roomTypeId,
    startDate: checkIn,
    endDate: checkOut,
    triggeredBy: triggeredBy ?? "reservation-change",
    priority: 1 // High priority for reservation changes
  });

  // If we have a reservation ID, also queue reservation sync to push status to OTAs
  if (reservationId && action) {
    await queueReservationSync({
      reservationId,
      propertyId,
      action,
      triggeredBy: triggeredBy ?? "reservation-change"
    });
  }
}

/**
 * Trigger ARI sync when rates are updated
 */
export async function onRateChange(params: {
  propertyId: string;
  roomTypeId: string;
  startDate: Date;
  endDate: Date;
  triggeredBy?: string;
}): Promise<void> {
  const { propertyId, roomTypeId, startDate, endDate, triggeredBy } = params;

  // Check if Channex is enabled
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    return;
  }

  // Queue ARI sync for the affected date range
  await queueARISync({
    propertyId,
    roomTypeId,
    startDate,
    endDate,
    triggeredBy: triggeredBy ?? "rate-change",
    priority: 2 // Medium priority for rate changes
  });
}

/**
 * Trigger ARI sync when daily rates are updated
 */
export async function onDailyRateChange(params: {
  propertyId: string;
  roomTypeId: string;
  dates: Date[];
  triggeredBy?: string;
}): Promise<void> {
  const { propertyId, roomTypeId, dates, triggeredBy } = params;

  // Check if Channex is enabled
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled || dates.length === 0) {
    return;
  }

  // Find the date range from the array of dates
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  await queueARISync({
    propertyId,
    roomTypeId,
    startDate,
    endDate,
    triggeredBy: triggeredBy ?? "daily-rate-change",
    priority: 2
  });
}

/**
 * Trigger ARI sync when a room block is created/modified/removed
 */
export async function onRoomBlockChange(params: {
  propertyId: string;
  roomTypeId: string;
  startDate: Date;
  endDate: Date;
  triggeredBy?: string;
}): Promise<void> {
  const { propertyId, roomTypeId, startDate, endDate, triggeredBy } = params;

  // Check if Channex is enabled
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    return;
  }

  // Queue ARI sync for blocked dates
  await queueARISync({
    propertyId,
    roomTypeId,
    startDate,
    endDate,
    triggeredBy: triggeredBy ?? "room-block-change",
    priority: 1 // High priority as it affects availability
  });
}

/**
 * Trigger full property sync (typically after initial setup or major changes)
 */
export async function onPropertySetupComplete(params: {
  propertyId: string;
  daysAhead?: number;
  triggeredBy?: string;
}): Promise<void> {
  const { propertyId, daysAhead, triggeredBy } = params;

  // Check if Channex is enabled
  const isEnabled = await isChannexEnabledForProperty(propertyId);
  if (!isEnabled) {
    return;
  }

  await queueFullSync({
    propertyId,
    daysAhead,
    triggeredBy: triggeredBy ?? "property-setup"
  });
}
