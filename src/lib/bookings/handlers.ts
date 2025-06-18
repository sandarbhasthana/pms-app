// lib/bookings/handlers.ts

//import { Reservation } from "@/types";
import toast from "react-hot-toast";

// Utility: convert Date to YYYY-MM-DD
export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export async function handleCreateBooking({
  selectedSlot,
  data,
  reload,
  onClose
}: {
  selectedSlot: { roomId: string };
  data: {
    guestName: string;
    phone: string;
    email: string;
    idType: string;
    idNumber: string;
    issuingCountry: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  };
  reload: () => Promise<void>;
  onClose: () => void;
}) {
  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, roomId: selectedSlot.roomId })
    });
    if (!res.ok) throw new Error((await res.json()).error || "Error");
    toast.success("Created!");
    onClose();
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Unknown error");
  }
}

export async function handleUpdateBooking({
  reservationId,
  data,
  reload,
  onClose
}: {
  reservationId: string;
  data: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  };
  reload: () => Promise<void>;
  onClose: () => void;
}) {
  try {
    const res = await fetch(`/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || "Error");
    toast.success("Updated!");
    onClose();
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Unknown error");
  }
}

export async function handleDeleteBooking(
  id: string,
  reload: () => Promise<void>
) {
  try {
    const res = await fetch(`/api/reservations/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error((await res.json()).error || "Error");
    toast.success("Deleted!");
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Unknown error");
  }
}

export async function handleCheckOut(id: string, reload: () => Promise<void>) {
  try {
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CHECKED_OUT" })
    });
    if (!res.ok) throw new Error((await res.json()).error || "Error");
    toast.success("Checked out!");
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Unknown error");
  }
}
