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

export interface RoomType {
  id: string;
  organizationId: string;
  name: string;
  abbreviation: string | null;
  privateOrDorm: string;
  physicalOrVirtual: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  adultsIncluded: number;
  childrenIncluded: number;
  description: string | null;
  amenities: string[];
  customAmenities: string[];
  featuredImageUrl: string | null;
  additionalImageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  rooms?: Room[];
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
  roomTypeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  roomType?: RoomType;
}

export interface RoomGroup {
  type: string;
  abbreviation?: string;
  rooms: Room[];
  roomTypeData?: RoomType;
}
