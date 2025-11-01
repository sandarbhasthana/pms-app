export interface ViewReservationData {
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
  roomNumber?: string; // Added for compatibility
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;

  // Timezone for operational day calculations
  propertyTimezone?: string; // IANA timezone (e.g., "America/New_York")

  // Status & metadata
  status?: string; // Made optional for compatibility
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "UNPAID"; // Made compatible with existing type
  ratePlan?: string;
  notes?: string;

  // Add-ons (when backend support is added)
  addons?: ReservationAddon[];

  // Payment info
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
  payments?: Payment[];
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

export interface ViewBookingSheetProps {
  viewReservation: ViewReservationData | null;
  setViewReservation: (reservation: ViewReservationData | null) => void;
}

export interface ViewTabProps {
  reservationData: ViewReservationData;
}

export type ViewBookingTab = "details" | "addons" | "payment";

export interface ViewTabNavigationProps {
  activeTab: ViewBookingTab;
  setActiveTab: (tab: ViewBookingTab) => void;
  reservationData: ViewReservationData;
}
