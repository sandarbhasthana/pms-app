/**
 * Channex Configuration
 *
 * Type-safe environment configuration for Channex integration.
 * Uses single master API key architecture (Option A).
 *
 * Note: Channex does NOT provide built-in webhook signature verification.
 * We implement our own security by appending a secret query parameter to webhook URLs.
 */

export interface ChannexConfig {
  /** Channex API base URL */
  apiUrl: string;
  /** Master API key for all operations */
  apiKey: string;
  /** Custom webhook secret (appended to webhook URL as query param for authentication) */
  webhookSecret: string;
  /** Batch size for sync operations */
  syncBatchSize: number;
  /** Rate limit (requests per minute) */
  rateLimitPerMinute: number;
  /** Whether sync is enabled */
  syncEnabled: boolean;
  /** Debug mode */
  debug: boolean;
  /** Log level */
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Get Channex configuration from environment variables
 * Throws an error if required variables are missing
 */
export function getChannexConfig(): ChannexConfig {
  const apiUrl = process.env.CHANNEX_API_URL;
  const apiKey = process.env.CHANNEX_API_KEY;
  const webhookSecret = process.env.CHANNEX_WEBHOOK_SECRET || "";

  if (!apiUrl) {
    throw new Error("CHANNEX_API_URL environment variable is required");
  }

  if (!apiKey) {
    throw new Error("CHANNEX_API_KEY environment variable is required");
  }

  return {
    apiUrl,
    apiKey,
    webhookSecret,
    syncBatchSize: parseInt(process.env.CHANNEX_SYNC_BATCH_SIZE || "50", 10),
    rateLimitPerMinute: parseInt(
      process.env.CHANNEX_RATE_LIMIT_PER_MINUTE || "60",
      10
    ),
    syncEnabled: process.env.CHANNEX_SYNC_ENABLED !== "false",
    debug: process.env.CHANNEX_DEBUG === "true",
    logLevel:
      (process.env.CHANNEX_LOG_LEVEL as ChannexConfig["logLevel"]) || "info"
  };
}

/**
 * Check if Channex integration is configured
 * Returns false if required environment variables are missing
 */
export function isChannexConfigured(): boolean {
  return !!(process.env.CHANNEX_API_URL && process.env.CHANNEX_API_KEY);
}

/**
 * Check if we're using the staging/sandbox environment
 */
export function isChannexStaging(): boolean {
  const apiUrl = process.env.CHANNEX_API_URL || "";
  return apiUrl.includes("staging.channex.io");
}

/**
 * Get the current Channex environment name
 */
export function getChannexEnvironment(): "staging" | "production" | "unknown" {
  const apiUrl = process.env.CHANNEX_API_URL || "";
  if (apiUrl.includes("staging.channex.io")) return "staging";
  if (apiUrl.includes("channex.io") && !apiUrl.includes("staging"))
    return "production";
  return "unknown";
}

/**
 * Generate the webhook URL to register with Channex
 *
 * Since Channex doesn't provide built-in signature verification,
 * we append a secret query parameter for authentication.
 *
 * @param baseUrl - Your application's base URL (e.g., https://yourdomain.com)
 * @returns Full webhook URL with secret query parameter
 */
export function getChannexWebhookUrl(baseUrl: string): string {
  const config = getChannexConfig();
  const webhookPath = "/api/webhooks/channex";

  if (!config.webhookSecret) {
    // Without a secret, return the basic URL (not recommended for production)
    return `${baseUrl}${webhookPath}`;
  }

  return `${baseUrl}${webhookPath}?secret=${encodeURIComponent(
    config.webhookSecret
  )}`;
}

/**
 * Validate incoming webhook request by checking the secret query parameter
 *
 * @param requestSecret - The secret from the request query string
 * @returns true if the secret matches, false otherwise
 */
export function validateWebhookSecret(requestSecret: string | null): boolean {
  const config = getChannexConfig();

  // If no webhook secret is configured, accept all requests (development only!)
  if (!config.webhookSecret) {
    console.warn(
      "[Channex] No webhook secret configured - accepting all webhook requests"
    );
    return true;
  }

  return requestSecret === config.webhookSecret;
}

/**
 * Channex API endpoints (relative to base URL)
 */
export const CHANNEX_ENDPOINTS = {
  // Groups (Organizations)
  groups: "/groups",
  group: (id: string) => `/groups/${id}`,
  groupProperties: (groupId: string, propertyId: string) =>
    `/groups/${groupId}/properties/${propertyId}`,

  // Properties
  properties: "/properties",
  property: (id: string) => `/properties/${id}`,

  // Room Types
  roomTypes: "/room_types",
  roomType: (id: string) => `/room_types/${id}`,

  // Rate Plans
  ratePlans: "/rate_plans",
  ratePlan: (id: string) => `/rate_plans/${id}`,

  // ARI (Availability, Rates, Inventory)
  ari: "/ari",

  // Webhooks
  webhooks: "/webhooks",
  webhook: (id: string) => `/webhooks/${id}`,

  // Channels
  channels: "/channels",
  channel: (id: string) => `/channels/${id}`,

  // Bookings
  bookings: "/bookings",
  booking: (id: string) => `/bookings/${id}`
} as const;

/**
 * Supported webhook event types
 */
export const CHANNEX_WEBHOOK_EVENTS = {
  // Booking Events
  BOOKING_CREATED: "booking.created",
  BOOKING_UPDATED: "booking.updated",
  BOOKING_CANCELLED: "booking.cancelled",

  // Channel Events
  CHANNEL_CONNECTED: "channel.connected",
  CHANNEL_DISCONNECTED: "channel.disconnected",
  CHANNEL_MAPPING_COMPLETED: "channel.mapping_completed",

  // ARI Events
  ARI_PUSH_SUCCESS: "ari.push_success",
  ARI_PUSH_FAILED: "ari.push_failed",

  // System Events
  WEBHOOK_TEST: "webhook.test",
  PROPERTY_UPDATED: "property.updated"
} as const;

export type ChannexWebhookEventType =
  (typeof CHANNEX_WEBHOOK_EVENTS)[keyof typeof CHANNEX_WEBHOOK_EVENTS];
