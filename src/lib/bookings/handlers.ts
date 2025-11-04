// lib/bookings/handlers.ts

//import { Reservation } from "@/types";
import { toast } from "sonner";

// Utility: convert Date to YYYY-MM-DD
export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * Upload document with retry logic
 * Retries 3 times with 10 minute intervals on failure
 */
async function uploadDocumentWithRetry(
  reservationId: string,
  imageBase64: string,
  documentType: string,
  guestName: string,
  maxRetries: number
): Promise<void> {
  const retryDelay = 10 * 60 * 1000; // 10 minutes in milliseconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `/api/reservations/${reservationId}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            imageBase64,
            documentType,
            guestName
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload document");
      }

      // Success - document uploaded
      return;
    } catch (error) {
      console.error(`Document upload attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retrying (except on last attempt)
        console.log(
          `Retrying in 10 minutes... (Attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        // All retries exhausted
        throw error;
      }
    }
  }
}

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
    guestImageUrl?: string;
    idDocumentUrl?: string;
    idExpiryDate?: string;
    idDocumentExpired?: boolean;
    payment?: {
      totalAmount: number;
      paymentMethod: string;
      creditCard?: {
        last4: string;
        brand: string;
        expiryMonth: number;
        expiryYear: number;
        paymentMethodId: string;
      };
    };
    addons?: {
      extraBed: boolean;
      breakfast: boolean;
      customAddons: Array<{
        id: string;
        name: string;
        price: number;
        selected: boolean;
      }>;
    };
  };
  reload: () => Promise<void>;
  onClose: () => void;
}) {
  try {
    // Validate dates
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkOut <= checkIn) {
      toast.error("Check-out date must be after check-in date");
      return;
    }

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        roomId: selectedSlot.roomId,
        // Include payment and addon data
        payment: data.payment,
        addons: data.addons
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Error creating reservation");
    }

    const responseData = await res.json();
    const reservationId = responseData.id;

    toast.success("Reservation created successfully!");

    // Check for pending document in localStorage
    const pendingDocumentStr = localStorage.getItem("reservationDocument_temp");
    if (pendingDocumentStr && reservationId) {
      try {
        const pendingDocument = JSON.parse(pendingDocumentStr);

        // Upload document with retry logic
        await uploadDocumentWithRetry(
          reservationId,
          pendingDocument.image,
          pendingDocument.documentType,
          data.guestName,
          3 // 3 retries
        );

        // Clear localStorage on success
        localStorage.removeItem("reservationDocument_temp");
        toast.success("ID document uploaded successfully!");
      } catch (docError) {
        console.error("Failed to upload document:", docError);
        toast.error(
          "Failed to upload ID document. You can upload it manually from the Documents tab."
        );
      }
    }

    onClose();
    await reload();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Handle specific error cases
    if (errorMessage.includes("conflicting reservations")) {
      toast.error(
        "This room is already booked for the selected dates. Please choose different dates or another room."
      );
    } else if (errorMessage.includes("availability")) {
      toast.error("Room is not available for the selected dates.");
    } else {
      toast.error(errorMessage);
    }
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
    roomId?: string; // ✅ ADD ROOM ID SUPPORT
    notes?: string; // ✅ ADD NOTES SUPPORT
    phone?: string;
    email?: string;
    idType?: string;
    idNumber?: string;
    issuingCountry?: string;
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

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Error updating reservation");
    }

    toast.success("Reservation updated successfully!");
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
    console.log(`🗑️ Starting delete for reservation: ${id}`);

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

    console.log(
      `🗑️ Delete reservation response: ${res.status} ${res.statusText}`
    );

    if (!res.ok) {
      // Try to parse JSON error, fallback to text if not JSON
      let errorMessage = "Failed to delete reservation";
      let responseBody = "";
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
        responseBody = JSON.stringify(errorData);
      } catch {
        // If JSON parsing fails, try to get text
        try {
          responseBody = await res.text();
          errorMessage = responseBody || errorMessage;
        } catch {
          // If both fail, use default message
        }
      }
      console.error(`❌ Delete failed (${res.status}): ${errorMessage}`);
      console.error(`📋 Response body:`, responseBody);
      throw new Error(errorMessage);
    }

    console.log(`✅ Reservation deleted successfully`);
    toast.success("Deleted!");

    // Wait a bit for the server to process the deletion and clear cache
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log(`🔄 Reloading calendar data...`);
    await reload();

    // Wait a bit more to ensure calendar has refreshed
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`✅ Reload complete`);
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
