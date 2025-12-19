// File: src/app/dashboard/bookings/types/index.ts
/**
 * Type definitions for bookings calendar
 */

/**
 * Reservation interface
 */
export interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status?: string;
  ratePlan?: string;
  notes?: string;
  roomNumber?: string;
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "UNPAID";
}

/**
 * Room block interface
 */
export interface RoomBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  blockType: string;
  reason: string;
}

/**
 * Room interface
 */
export interface Room {
  id: string;
  title: string;
  children?: Array<{ id: string; title: string; basePrice?: number }>;
}

/**
 * Selected slot for creating a booking
 */
export interface SelectedSlot {
  roomId: string;
  roomName: string;
  date: string;
}

/**
 * Block data for blocking a room
 */
export interface BlockData {
  roomId: string;
  roomName: string;
  startDate: string;
  blockId?: string;
}

/**
 * Flyout menu state for reservation events
 */
export interface ReservationFlyout {
  reservation: Reservation;
  x: number;
  y: number;
  showDetails: boolean;
}

/**
 * Cell flyout menu state for empty cells
 */
export interface CellFlyout {
  roomId: string;
  roomName: string;
  date: string;
  x: number;
  y: number;
}

/**
 * Block event flyout state
 */
export interface BlockFlyout {
  blockId: string;
  roomId: string;
  roomName: string;
  blockType: string;
  reason: string;
  x: number;
  y: number;
}

/**
 * Add button dropdown state
 */
export interface AddDropdown {
  x: number;
  y: number;
}

/**
 * Guest details for creating a booking
 */
export interface GuestDetails {
  fullName: string;
  phone: string;
  email: string;
  idType: string;
  idNumber: string;
  issuingCountry: string;
  guestImageUrl?: string;
  idDocumentUrl?: string;
  idExpiryDate?: string;
  idDocumentExpired?: boolean;
}

/**
 * Calendar event source function type
 */
export type EventSourceFunction = (
  fetchInfo: { startStr: string; endStr: string; start: Date; end: Date },
  successCallback: (events: CalendarEvent[]) => void,
  failureCallback: (error: Error) => void
) => void | Promise<void>;

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id: string;
  resourceId?: string;
  title?: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  classNames?: string[];
  display?: string;
  extendedProps?: Record<string, unknown>;
}

/**
 * Booking form data
 */
export interface BookingFormData {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  phone: string;
  email: string;
  notes?: string;
  ratePlan?: string;
}
