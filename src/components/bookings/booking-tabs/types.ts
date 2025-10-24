// Shared types for booking sheet components

export interface Customer {
  guestName: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  idType?: string;
  issuingCountry?: string;
}

export interface SelectedSlot {
  roomId: string;
  roomName: string;
  date: string;
}

export interface BookingFormData {
  // Guest Details
  fullName: string;
  email: string;
  phone: string;
  idType: string;
  idNumber: string;
  issuingCountry: string;
  adults: number;
  childrenCount: number;

  // Booking Details
  checkIn: string;
  checkOut: string;

  // Add-ons
  addons: {
    extraBed: boolean;
    breakfast: boolean;
    customAddons: Array<{
      id: string;
      name: string;
      price: number;
      selected: boolean;
    }>;
  };

  // Payment
  payment: {
    totalAmount: number;
    paymentMethod: "card" | "cash" | "bank_transfer" | "pay_at_checkin";
    creditCard?: {
      last4: string;
      brand: string;
      expiryMonth: number;
      expiryYear: number;
      paymentMethodId: string; // Stripe payment method ID
      paymentIntentId?: string; // Stripe payment intent ID
      stripePaymentIntentId?: string; // For database storage
    };
  };
}

export interface NewBookingSheetProps {
  selectedSlot: SelectedSlot | null;
  setSelectedSlot: (slot: SelectedSlot | null) => void;
  handleCreate: (bookingData: BookingFormData) => void;
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  idType: string;
  setIdType: (v: string) => void;
  idNumber: string;
  setIdNumber: (v: string) => void;
  issuingCountry: string;
  setIssuingCountry: (v: string) => void;
  adults: number;
  setAdults: (v: number) => void;
  childrenCount: number;
  setChildrenCount: (v: number) => void;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  setOcrEnabled: (v: boolean) => void;
  handleScanComplete: (result: {
    idNumber: string;
    fullName: string;
    issuingCountry: string;
  }) => void;
  handleScanError: (err: Error) => void;
  setLastScannedSlot: (slot: SelectedSlot | null) => void;
}

export type BookingTab = "details" | "addons" | "payment";

export interface TabNavigationProps {
  activeTab: BookingTab;
  setActiveTab: (tab: BookingTab) => void;
  completedTabs: Set<BookingTab>;
  formData: BookingFormData;
  onCustomerSelect?: (customer: {
    guestName: string;
    email: string;
    phone: string;
    idNumber?: string;
    idType?: string;
    issuingCountry?: string;
  }) => void;
}

export interface BookingTabProps {
  formData: BookingFormData;
  updateFormData: (updates: Partial<BookingFormData>) => void;
  selectedSlot: SelectedSlot;
  onNext?: () => void;
  onPrevious?: () => void;
}
