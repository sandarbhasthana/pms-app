/**
 * Channex API Type Definitions (Option A)
 * Based on verified Channex API documentation
 */

// ============================================
// JSON:API Response Format
// All Channex responses follow JSON:API spec with data.type and data.attributes
// ============================================
export interface ChannexApiResponse<T> {
  data: {
    type: string;
    id: string;
    attributes: T;
    relationships?: Record<string, { data: unknown[] }>;
  };
}

export interface ChannexListResponse<T> {
  data: Array<{
    type: string;
    id: string;
    attributes: T;
  }>;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ChannexMetaResponse {
  meta: {
    message: string;
  };
}

// ============================================
// Group Types (for Organizations)
// A property MUST always belong to at least one group
// ============================================
export interface ChannexGroup {
  id: string;
  title: string; // Max 255 chars, non-empty
}

export interface CreateGroupPayload {
  title: string; // Required, non-empty, max 255 chars
}

// ============================================
// Property Types (Verified from API docs)
// Properties must be associated with at least one Group
// ============================================
export interface ChannexProperty {
  id: string;
  title: string;
  currency: string; // e.g., "USD", "EUR", "INR"
  timezone: string; // e.g., "Asia/Kolkata"
  country_code: string; // e.g., "IN", "US"
  city?: string;
  address?: string;
  postcode?: string;
}

export interface CreatePropertyPayload {
  title: string; // Required
  currency: string; // Required, e.g., "INR"
  timezone: string; // Required, e.g., "Asia/Kolkata"
  country_code: string; // Required, e.g., "IN"
  city?: string;
  address?: string;
  postcode?: string;
}

// ============================================
// Room Type (Channex API)
// POST /room_types
// ============================================
export interface ChannexRoomType {
  id: string;
  property_id: string;
  title: string;
  description?: string;
  count_of_rooms?: number;
  occ_adults?: number;
  occ_children?: number;
  occ_infants?: number;
  default_occupancy?: number;
  content?: {
    description?: string;
  };
}

export interface CreateRoomTypePayload {
  property_id: string;
  title: string;
  count_of_rooms?: number;
  occ_adults?: number;
  occ_children?: number;
  occ_infants?: number;
  default_occupancy?: number;
  content?: {
    description?: string;
  };
}

// ============================================
// Rate Plan (Channex API)
// POST /rate_plans
// ============================================
export interface ChannexRatePlan {
  id: string;
  property_id: string;
  room_type_id?: string;
  title: string;
  currency: string;
  sell_mode?: string; // "per_room" or "per_person"
  rate_mode?: string; // "manual" or "derived"
  meal_plan?: string;
  cancellation_policy?: string;
}

export interface CreateRatePlanPayload {
  property_id: string;
  room_type_id: string;
  title: string;
  currency: string;
  sell_mode?: string;
  rate_mode?: string;
  meal_plan?: string;
  cancellation_policy?: string;
  options?: Array<{
    occupancy: number;
    is_primary?: boolean;
    rate?: number;
  }>;
}

// ============================================
// ARI (Availability, Rates, Inventory) Update
// POST /ari
// ============================================
export interface ARIUpdatePayload {
  property_id: string; // Required
  room_type_id: string; // Required
  rate_plan_id: string; // Required
  dates: ARIDateEntry[]; // Array of date-specific updates
}

export interface ARIDateEntry {
  date: string; // Required, format: "YYYY-MM-DD"
  rate: number; // Price for this date
  availability: number; // Available inventory count
  min_stay?: number; // Minimum length of stay
  max_stay?: number; // Maximum length of stay
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
}

// ============================================
// Booking/Reservation Types (Verified from API docs)
// Received via webhooks (booking.created, booking.updated, booking.cancelled)
// ============================================
export interface ChannexReservation {
  id: string; // Channex booking ID
  property_id: string; // Channex property ID
  channel: string; // e.g., "booking_com", "expedia"
  status: ChannexReservationStatus;
  guest: ChannexGuest;
  rooms: ChannexReservationRoom[];
  total_price: number;
  currency: string;
  created_at: string; // ISO 8601 format
  updated_at?: string;
}

export type ChannexReservationStatus = "new" | "modified" | "cancelled";

export interface ChannexGuest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface ChannexReservationRoom {
  room_type_id: string;
  rate_plan_id: string;
  checkin_date: string; // Format: "YYYY-MM-DD"
  checkout_date: string; // Format: "YYYY-MM-DD"
  guests?: {
    adults: number;
    children: number;
  };
  price?: number;
}

// ============================================
// Channel Types (Verified from API docs)
// GET /channels?filter[property_id]={propertyId}
// ============================================
export interface ChannexChannel {
  id: string;
  property_id: string;
  provider: string; // e.g., "booking_com", "expedia", "airbnb"
  status: "connected" | "disconnected" | "pending";
  mapping_status: "completed" | "pending" | "error";
}

// ============================================
// Webhook Types (Verified from API docs)
// POST /webhooks to register
// ============================================
export interface ChannexWebhookRegistration {
  url: string; // Your webhook endpoint URL with secret query param
  events: ChannexWebhookEventType[];
  headers?: Record<string, string>; // Optional custom headers
}

export interface ChannexWebhookEvent {
  event: ChannexWebhookEventType;
  timestamp: string; // ISO 8601 format
  data: unknown; // Event-specific payload
}

// Verified webhook event types from API docs
export type ChannexWebhookEventType =
  // Booking Events (Channex uses various formats)
  | "booking"
  | "booking_created"
  | "booking_modified"
  | "booking_updated"
  | "booking_cancelled"
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  // Channel Events
  | "channel_connected"
  | "channel_disconnected"
  | "channel.connected"
  | "channel.disconnected"
  | "channel.mapping_completed"
  // ARI Events
  | "ari_updated"
  | "ari.push_success"
  | "ari.push_failed"
  // System Events
  | "ping"
  | "webhook.test"
  | "property.updated";

// Webhook Payload for booking events
export interface ChannexBookingWebhookPayload {
  booking_id: string;
  property_id: string;
  channel: string;
  status: string;
  guest: ChannexGuest;
  rooms: ChannexReservationRoom[];
  total_price: number;
  currency: string;
}

// ============================================
// Multi-Tenant Context Types (Option A - No API keys per org/property)
// ============================================
export interface ChannexOrgContext {
  organizationId: string;
  channexGroupId: string | null; // Optional until created in Channex
}

export interface ChannexPropertyContext extends ChannexOrgContext {
  propertyId: string;
  channexPropertyId: string;
}

// ============================================
// Query Parameter Types
// ============================================
export interface ReservationQueryParams {
  from?: string; // Date filter start (YYYY-MM-DD)
  to?: string; // Date filter end (YYYY-MM-DD)
  status?: ChannexReservationStatus;
  channel?: string;
  page?: number;
  limit?: number;
}
