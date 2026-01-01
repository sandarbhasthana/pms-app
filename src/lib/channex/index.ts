/**
 * Channex Channel Manager Integration
 *
 * Option A: Single Master Account Architecture
 * - One API key for all organizations/properties (stored in env vars)
 * - Groups map to PMS Organizations
 * - Properties map to PMS Properties
 *
 * Usage:
 * ```typescript
 * import { getChannexClient, isChannexConfigured } from '@/lib/channex';
 *
 * if (isChannexConfigured()) {
 *   const client = getChannexClient();
 *   const groups = await client.getGroups();
 * }
 * ```
 */

// Configuration
export {
  getChannexConfig,
  isChannexConfigured,
  isChannexStaging,
  getChannexEnvironment,
  getChannexWebhookUrl,
  validateWebhookSecret,
  CHANNEX_ENDPOINTS,
  CHANNEX_WEBHOOK_EVENTS,
  type ChannexConfig,
  type ChannexWebhookEventType
} from "./config";

// API Client
export { ChannexClient, ChannexApiError, getChannexClient } from "./client";

// Multi-Tenant Context
export {
  getChannexOrgContext,
  getChannexPropertyContext,
  getChannexPropertiesForOrg,
  isChannexEnabledForOrg,
  isChannexEnabledForProperty,
  getChannexRoomTypeMapping,
  getChannexRoomTypeMappingsForProperty
} from "./context";

// ARI Sync Service
export {
  ARISyncService,
  getARISyncService,
  type SyncResult,
  type AvailabilityData,
  type RateData
} from "./ari-sync-service";

// Queue Helpers
export {
  queueARISync,
  queueFullSync,
  queueReservationSync,
  queueSingleDateSync,
  queueDateRangeSync,
  scheduleRecurringFullSync,
  removeRecurringFullSync
} from "./queue-helpers";

// Event Triggers (auto-sync on data changes)
export {
  onReservationChange,
  onRateChange,
  onDailyRateChange,
  onRoomBlockChange,
  onPropertySetupComplete
} from "./event-triggers";

// Reservation Sync Service (inbound from OTAs)
export {
  ReservationSyncService,
  getReservationSyncService
} from "./reservation-sync-service";

// Types
export type {
  // API Response Types
  ChannexApiResponse,
  ChannexListResponse,
  ChannexMetaResponse,
  // Entity Types
  ChannexGroup,
  ChannexProperty,
  ChannexRoomType,
  ChannexRatePlan,
  ChannexReservation,
  ChannexReservationStatus,
  ChannexGuest,
  ChannexReservationRoom,
  ChannexChannel,
  // Payload Types
  CreateGroupPayload,
  CreatePropertyPayload,
  CreateRoomTypePayload,
  CreateRatePlanPayload,
  ARIUpdatePayload,
  ARIDateEntry,
  // Webhook Types
  ChannexWebhookRegistration,
  ChannexWebhookEvent,
  ChannexBookingWebhookPayload,
  // Context Types
  ChannexOrgContext,
  ChannexPropertyContext,
  // Query Types
  ReservationQueryParams
} from "./types";
