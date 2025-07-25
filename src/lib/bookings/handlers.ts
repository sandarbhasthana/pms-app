// lib/bookings/handlers.ts

//import { Reservation } from "@/types";
import { toast } from "sonner";

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
    // Get orgId from cookies for API calls
    const orgId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("orgId="))
      ?.split("=")[1];

    const res = await fetch(`/api/reservations/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        // Include organization context
        ...(orgId && { "x-organization-id": orgId })
      }
    });

    if (!res.ok) {
      // Try to parse JSON error, fallback to text if not JSON
      let errorMessage = "Failed to delete reservation";
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, try to get text
        try {
          errorMessage = (await res.text()) || errorMessage;
        } catch {
          // If both fail, use default message
        }
      }
      throw new Error(errorMessage);
    }

    toast.success("Deleted!");
    await reload();
  } catch (err) {
    console.error("Delete booking error:", err);
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
