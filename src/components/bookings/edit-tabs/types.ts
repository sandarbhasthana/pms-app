export interface EditReservationData {
  // Basic info
  id: string;
  guestName: string;
  email?: string;
  phone?: string;
  idType?: string;
  idNumber?: string;
  issuingCountry?: string;

  // Guest images (from AI ID processing)
  guestImageUrl?: string; // Cropped face photo for guest profile
  idDocumentUrl?: string; // Full ID document for Documents tab
  idExpiryDate?: string; // Expiry date from ID document
  idDocumentExpired?: boolean; // Flag indicating if document is expired

  // Booking details
  roomId: string;
  roomName?: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;

  // Status & metadata
  status?: string;
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  ratePlan?: string;
  notes?: string;

  // New status-related fields
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  statusUpdatedBy?: string | null;
  statusUpdatedAt?: string;
  statusChangeReason?: string | null;

  // Payment info
  paidAmount?: number;
  depositAmount?: number; // Total reservation amount in cents (from rates API)
  totalAmount?: number;
  remainingBalance?: number;
  payments?: Payment[];

  // Add-ons (when backend support is added)
  addons?: ReservationAddon[];
}

export interface ReservationAddon {
  id: string;
  type: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  nights?: number;
  totalAmount: number;
}

export interface Payment {
  id: string;
  type: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  gatewayTxId?: string;
  notes?: string;
  createdAt: string;
  paymentMethod?: {
    id: string;
    cardBrand?: string;
    cardLast4?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    type: string;
    isDefault: boolean;
  };
}

export interface EditBookingFormData {
  // Guest information
  guestName: string;
  email: string;
  phone: string;
  idType: string;
  idNumber: string;
  issuingCountry: string;

  // Booking details
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  notes: string;

  // Add-ons
  addons: {
    extraBed: boolean;
    extraBedQuantity: number;
    breakfast: boolean;
    breakfastQuantity: number;
    customAddons: CustomAddon[];
  };

  // Payment info
  payment: {
    totalAmount: number;
    paidAmount: number;
    paymentMethod: string;
    paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  };
}

export interface CustomAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  perNight: boolean;
}

export interface AvailableRoom {
  id: string;
  name: string;
  number: string;
  type: string;
  typeDisplayName: string;
  capacity: number;
  basePrice: number;
  available: boolean;
  isCurrentRoom?: boolean; // For the room currently assigned to this reservation
}

export interface GroupedRooms {
  [roomType: string]: {
    displayName: string;
    rooms: AvailableRoom[];
  };
}

export interface EditBookingSheetProps {
  editingReservation: EditReservationData | null;
  setEditingReservation: (reservation: EditReservationData | null) => void;
  availableRooms: AvailableRoom[];
  onUpdate: (
    reservationId: string,
    data: Partial<EditBookingFormData>
  ) => Promise<void>;
  onDelete: (reservationId: string) => Promise<void>;
}

import { ReservationStatus } from "@/types/reservation-status";

export interface EditTabProps {
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  updateFormData: (updates: Partial<EditBookingFormData>) => void;
  availableRooms: AvailableRoom[];
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onUpdate?: (
    reservationId: string,
    data: Partial<EditBookingFormData>
  ) => Promise<void>;
  setEditingReservation?: (reservation: EditReservationData | null) => void;
  onStatusUpdate?: (
    newStatus: ReservationStatus | string,
    reason?: string
  ) => Promise<void>;
}

export type EditBookingTab =
  | "details"
  | "addons"
  | "folio"
  | "cards"
  | "documents"
  | "notes"
  | "audit"
  | "payment";

export interface EditTabNavigationProps {
  activeTab: EditBookingTab;
  setActiveTab: (tab: EditBookingTab) => void;
  reservationData: EditReservationData;
  formData: EditBookingFormData;
  hasUnsavedChanges: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidation {
  isValid: boolean;
  errors: ValidationError[];
}
