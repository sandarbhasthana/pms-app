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

export interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  imageUrl: string | null;
  organizationId: string;
  pricingId: string | null;
  sizeSqFt: number | null;
  description: string | null;
  doorlockId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomGroup {
  type: string;
  abbreviation?: string;
  rooms: Room[];
}
