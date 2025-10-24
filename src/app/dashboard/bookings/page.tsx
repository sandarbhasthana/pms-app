// File: src/app/dashboard/bookings-row-style/page.tsx
// FIXED VERSION - Based on bookings-fixed with ResourceHeaderLane functionality
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import {
  handleCreateBooking,
  handleUpdateBooking,
  handleDeleteBooking,
  handleCheckOut
} from "@/lib/bookings/handlers";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import { toast } from "sonner";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/globals.css";
import IDScannerWithOCR from "@/components/IDScannerWithOCR";
import CalendarViewRowStyle from "@/components/bookings/CalendarViewRowStyle";
import NewBookingModalFixed from "@/components/bookings/NewBookingSheet";
import ViewBookingSheet from "@/components/bookings/ViewBookingSheet";
import EditBookingSheet from "@/components/bookings/EditBookingSheet";
import FlyoutMenu from "@/components/bookings/FlyoutMenu";
import CalendarToolbar from "@/components/bookings/CalendarToolbar";
import { formatGuestNameForCalendar } from "@/lib/utils/nameFormatter";
import LegendModal from "@/components/bookings/LegendModal";
import { LoadingSpinner } from "@/components/ui/spinner";
import { apiDeduplicator } from "@/lib/api-deduplication";
import { EditBookingFormData } from "@/components/bookings/edit-tabs/types";

interface Reservation {
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
interface Room {
  id: string;
  title: string;
  children?: Array<{ id: string; title: string; basePrice?: number }>;
}

/**
 * Get event color and text color based on reservation status and theme
 * Light theme: Original colors with gray-900 text for CONFIRMED, alice blue for others
 * Dark theme: Darker shades with alice blue text
 */
const getEventColor = (
  status?: string,
  isDarkMode: boolean = false
): { backgroundColor: string; textColor: string } => {
  const lightColorMap: Record<string, { bg: string; text: string }> = {
    CONFIRMED: { bg: "#9AB69B", text: "#1f2937" }, // Sage Green with gray-900 text
    CONFIRMATION_PENDING: { bg: "#ec4899", text: "#f0f8f9" }, // Pink with alice blue text
    IN_HOUSE: { bg: "#22c55e", text: "#f0f8f9" }, // Green with alice blue text
    CANCELLED: { bg: "#6b7280", text: "#f0f8f9" }, // Gray with alice blue text
    CHECKED_OUT: { bg: "#8b5cf6", text: "#f0f8f9" }, // Purple with alice blue text
    NO_SHOW: { bg: "#f97316", text: "#f0f8f9" } // Orange with alice blue text
  };

  const darkColorMap: Record<string, { bg: string; text: string }> = {
    CONFIRMED: { bg: "#3b513b", text: "#f0f8f9" }, // Sage Green (dark) with alice blue text
    CONFIRMATION_PENDING: { bg: "#db2777", text: "#f0f8f9" }, // Pink-600 with alice blue text
    IN_HOUSE: { bg: "#10b981", text: "#f0f8f9" }, // Emerald-500 with alice blue text
    CANCELLED: { bg: "#4b5563", text: "#f0f8f9" }, // Gray-700 with alice blue text
    CHECKED_OUT: { bg: "#7c3aed", text: "#f0f8f9" }, // Violet-600 with alice blue text
    NO_SHOW: { bg: "#d97706", text: "#f0f8f9" } // Amber-600 with alice blue text
  };

  const colorMap = isDarkMode ? darkColorMap : lightColorMap;
  const colors =
    colorMap[status || "CONFIRMED"] ||
    (isDarkMode
      ? { bg: "#047857", text: "#f0f8f9" }
      : { bg: "#9AB69B", text: "#1f2937" });

  return {
    backgroundColor: colors.bg,
    textColor: colors.text
  };
};

export default function BookingsRowStylePage() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Add refetch control state
  const [lastRefetch, setLastRefetch] = useState<number>(0);
  const [isRefetching, setIsRefetching] = useState(false);

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [datePickerDate, setDatePickerDate] = useState<Date | null>(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [events, setEvents] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [lastScannedSlot, setLastScannedSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
  } | null>(null);

  // Create‐booking dialog state
  const [selectedSlot, setSelectedSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
  } | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Front‐desk customer detail fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idType, setIdType] = useState("passport");
  const [idNumber, setIdNumber] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Edit/Delete modal state
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);

  // Flyout menu state
  const [flyout, setFlyout] = useState<{
    reservation: Reservation;
    x: number;
    y: number;
    showDetails: boolean;
  } | null>(null);

  // View‐Details modal state
  const [viewReservation, setViewReservation] = useState<Reservation | null>(
    null
  );

  // Holiday & geolocation state
  const [country, setCountry] = useState<string>("");
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // Stable today highlight using local timezone consistently
  const todayDateString = useMemo(() => {
    const now = new Date();
    // Use local timezone instead of UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // YYYY-MM-DD format in local timezone
  }, []);

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  // Use stable date for today highlight in local timezone
  const startOfToday = useMemo(() => {
    const [year, month, day] = todayDateString.split("-").map(Number);
    return new Date(year, month - 1, day); // Local timezone
  }, [todayDateString]);

  const endOfToday = useMemo(() => {
    const dt = new Date(startOfToday);
    dt.setDate(dt.getDate() + 1);
    return dt;
  }, [startOfToday]);

  // Debounced refetch function to prevent rapid successive calls
  const debouncedRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetch < 2000 || isRefetching) {
      return;
    }

    setLastRefetch(now);
    setIsRefetching(true);

    setTimeout(() => {
      calendarRef.current?.getApi().refetchEvents();
      setIsRefetching(false);
    }, 100);
  }, [lastRefetch, isRefetching]);

  // Optimized eventSources without caching to ensure fresh payment status
  const eventSources = useMemo(() => {
    return [
      async (
        fetchInfo: { startStr: string; endStr: string },
        success: (
          events: {
            id: string;
            resourceId: string;
            title: string;
            start: string;
            end: string;
            allDay: boolean;
            extendedProps: Record<string, unknown>;
          }[]
        ) => void,
        failure: (error: Error) => void
      ) => {
        try {
          // Get orgId from cookies for API calls
          const orgId = document.cookie
            .split("; ")
            .find((row) => row.startsWith("orgId="))
            ?.split("=")[1];

          const params = new URLSearchParams({
            start: fetchInfo.startStr,
            end: fetchInfo.endStr,
            t: Date.now().toString(), // Add timestamp to force cache bust
            r: Math.random().toString() // Add random value for extra cache busting
          });
          const res = await fetch(`/api/reservations?${params}`, {
            credentials: "include",
            // Ensure fresh data for payment status updates
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
              // Include organization context
              ...(orgId && { "x-organization-id": orgId })
            }
          });
          const { reservations } = await res.json();

          success(
            reservations.map((r: Reservation) => {
              const colors = getEventColor(r.status, isDarkMode);
              return {
                id: r.id,
                resourceId: r.roomId,
                title: formatGuestNameForCalendar(r.guestName),
                start: r.checkIn,
                end: r.checkOut,
                allDay: true,
                backgroundColor: colors.backgroundColor,
                borderColor: colors.backgroundColor,
                textColor: colors.textColor,
                extendedProps: {
                  isPartialDay: true,
                  status: r.status,
                  paymentStatus: r.paymentStatus
                }
              };
            })
          );
        } catch (e) {
          failure(e as Error);
        }
      },
      // Static today highlight that doesn't cause re-renders
      {
        events: [
          {
            id: "todayHighlight",
            start: startOfToday.toISOString(),
            end: endOfToday.toISOString(),
            display: "background" as const,
            backgroundColor: "#f0f9ff", // very light sky blue (sky-50)
            classNames: ["today-highlight"],
            allDay: true,
            overlap: false
          }
        ]
      },
      (
        info: { start: Date; end: Date },
        success: (
          events: {
            id: string;
            start: string;
            end: string;
            display: string;
            classNames: string[];
            allDay: boolean;
          }[]
        ) => void
      ) => {
        const wknd: {
          id: string;
          start: string;
          end: string;
          display: string;
          classNames: string[];
          allDay: boolean;
        }[] = [];
        for (
          let d = new Date(info.start);
          d < new Date(info.end);
          d.setDate(d.getDate() + 1)
        ) {
          const dow = d.getDay();
          // Only highlight Friday (5) and Saturday (6) - removed Sunday (0)
          if (dow === 5 || dow === 6) {
            const s = new Date(d),
              e = new Date(d);
            e.setDate(e.getDate() + 1);
            wknd.push({
              id: `wknd-${s.toISOString()}`,
              start: s.toISOString(),
              end: e.toISOString(),
              display: "background",
              classNames: ["weekend-highlight"],
              allDay: true
            });
          }
        }
        success(wknd);
      }
    ];
  }, [startOfToday, endOfToday, isDarkMode]); // Include dependencies used in the memoized value

  // ------------------------
  // Load rooms function (separated for reuse)
  // ------------------------
  const loadRooms = useCallback(async () => {
    try {
      // OPTIMIZATION: Use request deduplication to prevent duplicate requests
      const roomsJson = await apiDeduplicator.deduplicate(
        "bookings-rooms",
        async () => {
          const roomsRes = await fetch("/api/rooms", {
            credentials: "include"
          });
          if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
          return await roomsRes.json();
        }
      );
      type RawRoom = {
        id: string;
        name: string;
        type: string;
        roomType?: { id: string; name: string; basePrice: number };
      };
      const roomsData: RawRoom[] = Array.isArray(roomsJson)
        ? roomsJson
        : roomsJson.rooms;

      interface GroupedResource {
        id: string;
        title: string;
        children: Array<{
          id: string;
          title: string;
          order: string;
          basePrice?: number;
        }>;
      }

      const groupedResources = roomsData.reduce((acc, room) => {
        const groupId = room.type;
        if (!acc[groupId]) {
          acc[groupId] = {
            id: groupId,
            title: groupId,
            children: []
          };
        }
        acc[groupId].children.push({
          id: room.id,
          title: room.name,
          order: room.name, // Add explicit order field for FullCalendar
          basePrice: room.roomType?.basePrice || 0 // Preserve room type base price
        });
        return acc;
      }, {} as Record<string, GroupedResource>);

      // Natural/numeric sorting function for room names
      const naturalSort = (a: string, b: string): number => {
        return a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: "base"
        });
      };

      // Sort children (rooms) within each room type group
      Object.values(groupedResources).forEach((group) => {
        group.children.sort((a, b) => naturalSort(a.title, b.title));
      });

      const flattenedResources = Object.values(groupedResources);
      setResources(flattenedResources);
    } catch (e) {
      console.error("Failed to load rooms:", e);
      toast.error(e instanceof Error ? e.message : "Failed to load room data");
    }
  }, []);

  // ------------------------
  // Load reservations function
  // ------------------------
  const loadReservations = useCallback(async (showToast = false) => {
    try {
      // OPTIMIZATION: Use request deduplication to prevent duplicate requests
      const { reservations, count } = await apiDeduplicator.deduplicate(
        "bookings-reservations",
        async () => {
          const res = await fetch("/api/reservations", {
            credentials: "include"
          });
          if (!res.ok) throw new Error("Failed to fetch reservations");
          return (await res.json()) as {
            reservations: Reservation[];
            count: number;
          };
        }
      );
      setEvents(reservations);
      if (showToast) {
        toast.success(`Loaded ${count} reservation(s)`);
      }
    } catch (e) {
      console.error("Failed to load reservations:", e);
      toast.error(
        e instanceof Error ? e.message : "Failed to load reservation data"
      );
    }
  }, []);

  // ------------------------
  // Initial load: rooms + reservations
  // ------------------------
  useEffect(() => {
    async function loadAll() {
      try {
        await Promise.all([loadRooms(), loadReservations(false)]); // Don't show toast on initial load
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [loadRooms, loadReservations]);

  // ------------------------
  // Listen for room updates from settings page
  // ------------------------
  useEffect(() => {
    const orgId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("orgId="))
      ?.split("=")[1];

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "calendar-refresh-event" && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          if (!event.orgId || !orgId || event.orgId === orgId) {
            loadRooms();
          }
        } catch (error) {
          console.error("Failed to parse calendar refresh event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => {
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [loadRooms]);

  // ------------------------
  // Detect dark mode changes
  // ------------------------
  useEffect(() => {
    // Initial detection
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Watch for changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  // ------------------------
  // Determine country via geolocation, fallback to browser locale
  // ------------------------
  useEffect(() => {
    const fallback = () =>
      (navigator.language.split("-")[1] || "US").toUpperCase();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const resp = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (!resp.ok) throw new Error("Reverse-geocode failed");
            const geo = await resp.json();
            setCountry((geo.countryCode || fallback()).toUpperCase());
          } catch {
            setCountry(fallback());
          }
        },
        () => setCountry(fallback())
      );
    } else {
      setCountry(fallback());
    }
  }, []);

  // ------------------------
  // Fetch holidays from Calendarific
  // OPTIMIZATION: Load holidays with localStorage caching
  // ------------------------
  useEffect(() => {
    if (!country) return;

    const loadHolidays = async () => {
      try {
        const year = new Date().getFullYear();
        const cacheKey = `holidays-${country}-${year}`;

        // OPTIMIZATION: Check localStorage first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setHolidays(JSON.parse(cached));
            if (process.env.NODE_ENV === "development") {
              console.log(`📦 Cache hit for holidays: ${cacheKey}`);
            }
            return;
          } catch (error) {
            console.warn("Failed to parse cached holidays:", error);
          }
        }

        // Fetch from external API
        const apiKey = process.env.NEXT_PUBLIC_CALENDARIFIC_API_KEY!;
        const url = new URL("https://calendarific.com/api/v2/holidays");
        url.searchParams.set("api_key", apiKey);
        url.searchParams.set("country", country);
        url.searchParams.set("year", String(year));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Calendarific ${res.status}`);
        const payload = await res.json();
        const list = payload.response?.holidays as Array<{
          date: { iso: string };
          name: string;
        }>;
        if (!Array.isArray(list)) throw new Error("Invalid payload");
        const map = Object.fromEntries(list.map((h) => [h.date.iso, h.name]));

        // OPTIMIZATION: Cache for entire year
        localStorage.setItem(cacheKey, JSON.stringify(map));
        setHolidays(map);
      } catch (e) {
        console.error("Failed to fetch holidays:", e);
        setHolidays({}); // Fallback to empty object
      }
    };

    // OPTIMIZATION: Load holidays in background (non-blocking)
    // This prevents blocking the initial calendar render
    setTimeout(() => {
      loadHolidays();
    }, 500);
  }, [country]);

  // ------------------------
  // Memoized toolbar handlers
  // ------------------------
  const handlePrev = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = api.getDate();
    d.setDate(d.getDate() - 7); // Changed from -1 to -7 (1 week)
    api.gotoDate(d);
    setSelectedDate(d.toISOString().slice(0, 10));
  }, []);

  const handleNext = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = api.getDate();
    d.setDate(d.getDate() + 7); // Changed from +1 to +7 (1 week)
    api.gotoDate(d);
    setSelectedDate(d.toISOString().slice(0, 10));
  }, []);

  const handleToday = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const now = new Date();
    api.gotoDate(now);
    setSelectedDate(now.toISOString().slice(0, 10));
  }, []);

  // ------------------------
  // Date‐click handler opens New Booking dialog
  // ------------------------
  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      arg.jsEvent.preventDefault();
      arg.jsEvent.stopPropagation();
      const roomId = arg.resource?.id;
      const roomName = arg.resource?.title;
      const dateTab = arg.date.toLocaleDateString("en-CA");
      const zero = new Date();
      zero.setHours(0, 0, 0, 0);

      if (arg.date < zero) {
        toast.error("Cannot create bookings in the past.");
        return;
      }

      // Only allow booking on individual rooms (children), not room types (parents)
      if (roomId && roomName && arg.resource?.getParent()) {
        // Check if this date/room combination is already occupied
        const clickedDate = new Date(dateTab);
        const isOccupied = events.some((reservation) => {
          if (reservation.roomId !== roomId) return false;

          const checkIn = new Date(reservation.checkIn);
          const checkOut = new Date(reservation.checkOut);

          // Check if the clicked date falls within an existing reservation
          return clickedDate >= checkIn && clickedDate < checkOut;
        });

        if (isOccupied) {
          toast.error(
            "This room is already booked for the selected date. Please choose a different date or room."
          );
          return;
        }

        setSelectedSlot({ roomId, roomName, date: dateTab });
        setAdults(1);
        setChildren(0);
        // ← NEW: reset customer fields
        setFullName("");
        setPhone("");
        setEmail("");
        setIdType("passport");
        setIdNumber("");
        setIssuingCountry("");
      }
    },
    [events]
  );

  // ------------------------
  // Event‐click handler opens flyout menu
  // ------------------------
  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      arg.jsEvent.preventDefault();
      arg.jsEvent.stopPropagation();
      const resv = events.find((e) => e.id === arg.event.id);
      if (!resv) return;
      const rect = arg.el.getBoundingClientRect();
      setFlyout({
        reservation: resv,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY,
        showDetails: false
      });
    },
    [events]
  );

  // ------------------------
  // Event‐drag handler patches dates
  // ------------------------
  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const ev = arg.event;
      const id = ev.id;
      const toYMD = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(d.getDate()).padStart(2, "0")}`;
      try {
        const res = await fetch(`/api/reservations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkIn: toYMD(ev.start!),
            checkOut: toYMD(ev.end!)
          })
        });
        if (!res.ok) throw new Error((await res.json()).error || "Error");
        const updated: Reservation = await res.json();
        toast.success("Booking dates updated!");
        setEvents((all) =>
          all.map((r) =>
            r.id === id
              ? { ...r, checkIn: updated.checkIn, checkOut: updated.checkOut }
              : r
          )
        );
        if (viewReservation?.id === id) {
          setViewReservation((prev) =>
            prev
              ? {
                  ...prev,
                  checkIn: updated.checkIn,
                  checkOut: updated.checkOut
                }
              : prev
          );
        }
        // FIXED: Use debounced refetch instead of immediate refetch
        debouncedRefetch();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Could not update");
        arg.revert();
      }
    },
    [viewReservation, debouncedRefetch]
  );

  // ------------------------
  // Status update handler
  // ------------------------
  const handleStatusUpdate = useCallback(
    async (reservationId: string, newStatus: string, reason: string) => {
      try {
        const response = await fetch(
          `/api/reservations/${reservationId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              newStatus,
              reason,
              updatedBy: "user", // This should come from session
              isAutomatic: false
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update status");
        }

        // Refresh the calendar to show updated status
        await debouncedRefetch();

        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      } catch (error) {
        console.error("Failed to update status:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to update status"
        );
      }
    },
    [debouncedRefetch]
  );

  // ------------------------
  // Memoize availableRooms to prevent unnecessary re-renders of EditBookingSheet
  const availableRooms = useMemo(() => {
    return resources.flatMap((group) => {
      // Each group has children (individual rooms)
      if (!group.children) return [];

      return group.children.map((room, index) => {
        // Extract room number from title (e.g., "Presidential Suite - 101")
        const titleParts = room.title.split(" - ");
        const roomNumber =
          titleParts.length > 1 ? titleParts[1] : `${index + 101}`;

        // Create proper room data
        return {
          id: room.id,
          name: room.title,
          number: roomNumber,
          type: group.id.toLowerCase().replace(/\s+/g, "_"),
          typeDisplayName: group.id,
          capacity: 4, // Placeholder - should come from room data
          basePrice: room.basePrice || 0, // Use basePrice from room type
          available: true, // Will be updated by availability check
          isCurrentRoom: editingReservation?.roomId === room.id
        };
      });
    });
  }, [resources, editingReservation?.roomId]);

  // Memoize onUpdate callback to prevent unnecessary re-renders
  // Note: This depends on reload which is defined later, but we'll use a workaround
  const handleEditBookingUpdate = useCallback(
    async (reservationId: string, data: Partial<EditBookingFormData>) => {
      // Get the current reload function from the component scope
      const orgId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("orgId="))
        ?.split("=")[1];

      // If data is empty, just refresh the calendar (e.g., after status change or payment)
      if (Object.keys(data).length === 0) {
        try {
          console.log(`🔄 Refreshing calendar after payment/status change...`);
          console.log(`📍 Using orgId: ${orgId}`);
          const timestamp = Date.now();
          const res = await fetch(
            `/api/reservations?orgId=${orgId}&t=${timestamp}`,
            {
              credentials: "include"
            }
          );

          console.log(`📊 API Response Status: ${res.status}`);
          if (res.ok) {
            const responseData = await res.json();
            console.log(
              `📦 Received ${
                responseData.reservations?.length || 0
              } reservations`
            );

            // Update state with fresh data
            setEvents(responseData.reservations || []);
            setResources(responseData.rooms || []);

            // Force calendar refresh by removing all events and re-adding them
            const api = calendarRef.current?.getApi();
            if (api) {
              console.log(`🔄 Starting calendar refresh sequence...`);

              // Remove all existing events
              api.removeAllEvents();
              console.log(`✓ All events removed`);

              // Wait a bit for removal to complete
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Convert reservations to calendar events and add them directly
              const calendarEvents = (responseData.reservations || []).map(
                (r: Reservation) => {
                  const colors = getEventColor(r.status, isDarkMode);
                  return {
                    id: r.id,
                    resourceId: r.roomId,
                    title: formatGuestNameForCalendar(r.guestName),
                    start: r.checkIn,
                    end: r.checkOut,
                    allDay: true,
                    backgroundColor: colors.backgroundColor,
                    borderColor: colors.backgroundColor,
                    textColor: colors.textColor,
                    extendedProps: {
                      isPartialDay: true,
                      status: r.status,
                      paymentStatus: r.paymentStatus
                    }
                  };
                }
              );

              // Add events directly to calendar
              api.addEventSource(calendarEvents);
              console.log(
                `✅ ${calendarEvents.length} events added to calendar`
              );
            } else {
              console.warn("⚠️ Calendar API not available");
            }
          } else {
            console.error(`❌ API returned status ${res.status}`);
            const errorData = await res.json();
            console.error("Error response:", errorData);
          }
        } catch (error) {
          console.error("Failed to refresh calendar:", error);
          toast.error("Failed to refresh calendar data");
        }
        return;
      }

      await handleUpdateBooking({
        reservationId,
        data: {
          guestName: data.guestName || "",
          checkIn: data.checkIn || "",
          checkOut: data.checkOut || "",
          adults: data.adults || 1,
          children: data.children || 0,
          roomId: data.roomId,
          notes: data.notes || ""
        },
        reload: async () => {
          // Inline reload logic to avoid dependency on reload function
          try {
            console.log(`🔄 Reloading reservations...`);
            const timestamp = Date.now();
            const res = await fetch(
              `/api/reservations?orgId=${orgId}&t=${timestamp}`,
              {
                credentials: "include"
              }
            );

            if (res.ok) {
              const data = await res.json();
              setEvents(data.reservations || []);
              setResources(data.rooms || []);

              // Force calendar refresh
              const api = calendarRef.current?.getApi();
              if (api) {
                api.removeAllEvents();
                await new Promise((resolve) => setTimeout(resolve, 50));
                api.refetchEvents();
                console.log(`✅ Calendar refetch triggered`);
              }
            }
          } catch (error) {
            console.error("Failed to reload reservations:", error);
            toast.error("Failed to refresh calendar data");
          }
        },
        onClose: () => setEditingReservation(null)
      });
    },
    [isDarkMode]
  );

  // Memoize onDelete callback to prevent unnecessary re-renders
  const handleEditBookingDelete = useCallback(async (reservationId: string) => {
    const orgId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("orgId="))
      ?.split("=")[1];

    await handleDeleteBooking(reservationId, async () => {
      try {
        console.log(`🔄 Reloading reservations...`);
        const timestamp = Date.now();
        const res = await fetch(
          `/api/reservations?orgId=${orgId}&t=${timestamp}`,
          {
            credentials: "include"
          }
        );

        if (res.ok) {
          const data = await res.json();
          setEvents(data.reservations || []);
          setResources(data.rooms || []);

          // Force calendar refresh
          const api = calendarRef.current?.getApi();
          if (api) {
            api.removeAllEvents();
            await new Promise((resolve) => setTimeout(resolve, 50));
            api.refetchEvents();
            console.log(`✅ Calendar refetch triggered`);
          }
        }
      } catch (error) {
        console.error("Failed to reload reservations:", error);
        toast.error("Failed to refresh calendar data");
      }
    });
    setEditingReservation(null);
  }, []);

  // Click-outside listener for flyout
  // ------------------------
  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyout(null);
      }
    };
    if (flyout) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [flyout]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6">Bookings Calendar</h1>
        <LoadingSpinner
          text="Loading Calendar..."
          size="lg"
          variant={"secondary"}
          fullScreen={true}
          className="text-purple-600"
        />
      </div>
    );
  }

  // FIXED: Optimized reload function with forced calendar refresh
  const reload = async () => {
    try {
      console.log(`🔄 Reloading reservations...`);
      // Get orgId from cookies for API calls
      const orgId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("orgId="))
        ?.split("=")[1];

      // Add timestamp to force cache bust
      const timestamp = Date.now();
      const res = await fetch(`/api/reservations?t=${timestamp}`, {
        credentials: "include",
        // FIXED: Force fresh data after payment updates
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          // FIXED: Include organization context
          ...(orgId && { "x-organization-id": orgId })
        }
      });

      if (res.ok) {
        const { reservations } = await res.json();
        console.log(`📊 Loaded ${reservations.length} reservations`);

        // Update local state first
        setEvents(reservations);

        // FIXED: Force immediate calendar refresh by removing and re-adding events
        console.log(`🔄 Refreshing calendar events...`);
        const api = calendarRef.current?.getApi();
        if (api) {
          // Remove all events
          api.removeAllEvents();
          console.log(`✓ Events removed from calendar`);

          // Wait for removal to complete
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Convert reservations to calendar events and add them directly
          const calendarEvents = (reservations || []).map((r: Reservation) => {
            const colors = getEventColor(r.status, isDarkMode);
            return {
              id: r.id,
              resourceId: r.roomId,
              title: formatGuestNameForCalendar(r.guestName),
              start: r.checkIn,
              end: r.checkOut,
              allDay: true,
              backgroundColor: colors.backgroundColor,
              borderColor: colors.backgroundColor,
              textColor: colors.textColor,
              extendedProps: {
                isPartialDay: true,
                status: r.status,
                paymentStatus: r.paymentStatus
              }
            };
          });

          // Add events directly to calendar
          api.addEventSource(calendarEvents);
          console.log(`✅ ${calendarEvents.length} events added to calendar`);
        }
      } else {
        console.error("Reload failed:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Failed to reload reservations:", error);
      toast.error("Failed to refresh calendar data");
    }
  };

  return (
    <div ref={containerRef} className="relative p-6">
      <h1 className="text-2xl font-semibold mb-4">Booking Calendar</h1>

      {/* Toolbar */}
      <CalendarToolbar
        datePickerDate={datePickerDate}
        setDatePickerDate={setDatePickerDate}
        handlePrev={handlePrev}
        handleNext={handleNext}
        handleToday={handleToday}
        setSelectedDate={setSelectedDate}
        calendarRef={calendarRef}
      />

      {/* FullCalendar with Row Style */}
      <CalendarViewRowStyle
        calendarRef={calendarRef}
        resources={resources}
        eventSources={eventSources}
        handleEventClick={handleEventClick}
        handleDateClick={handleDateClick}
        handleEventDrop={handleEventDrop}
        selectedDate={selectedDate}
        selectedResource={selectedResource}
        holidays={holidays}
        isToday={isToday}
        setSelectedResource={setSelectedResource}
        events={events}
      />

      {/* New Booking Dialog */}
      <NewBookingModalFixed
        handleCreate={(bookingData) => {
          if (!selectedSlot) return;
          handleCreateBooking({
            selectedSlot,
            data: {
              guestName: bookingData.fullName,
              phone: bookingData.phone,
              email: bookingData.email,
              idType: bookingData.idType,
              idNumber: bookingData.idNumber,
              issuingCountry: bookingData.issuingCountry,
              checkIn: bookingData.checkIn,
              checkOut: bookingData.checkOut,
              adults: bookingData.adults,
              children: bookingData.childrenCount,
              // Add payment data
              payment: bookingData.payment,
              addons: bookingData.addons
            },
            reload,
            onClose: () => setSelectedSlot(null)
          });
        }}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        fullName={fullName}
        setFullName={setFullName}
        phone={phone}
        setPhone={setPhone}
        email={email}
        setEmail={setEmail}
        idType={idType}
        setIdType={setIdType}
        idNumber={idNumber}
        setIdNumber={setIdNumber}
        issuingCountry={issuingCountry}
        setIssuingCountry={setIssuingCountry}
        adults={adults}
        setAdults={setAdults}
        childrenCount={children}
        setChildrenCount={setChildren}
        showScanner={showScanner}
        setShowScanner={setShowScanner}
        setOcrEnabled={setOcrEnabled}
        handleScanComplete={(result) => {
          if (!ocrEnabled) return;
          setIdNumber(result.idNumber);
          setFullName(result.fullName);
          setIssuingCountry(result.issuingCountry);
          setShowScanner(false);
          setOcrEnabled(false);
        }}
        handleScanError={(err) => {
          toast.error("Scan failed: " + err.message);
        }}
        setLastScannedSlot={setLastScannedSlot}
      />

      {/* Scanner Overlay */}
      {showScanner && (
        <IDScannerWithOCR
          onComplete={(result) => {
            if (!ocrEnabled) return;
            setIdNumber(result.idNumber);
            setFullName(result.fullName);
            setIssuingCountry(result.issuingCountry);
            setShowScanner(false);
            setOcrEnabled(false);
          }}
          onError={(err) => {
            toast.error("Scan failed: " + err.message);
          }}
          onClose={() => {
            setShowScanner(false);
            if (lastScannedSlot) setSelectedSlot(lastScannedSlot);
          }}
        />
      )}

      {/* Flyout Menu */}
      {flyout && (
        <FlyoutMenu
          flyout={flyout}
          flyoutRef={flyoutRef}
          setFlyout={setFlyout}
          setEditingReservation={setEditingReservation}
          setViewReservation={setViewReservation}
          handleCheckOut={async (id) => {
            await handleCheckOut(id, reload);
            setFlyout(null);
          }}
          handleDelete={(id) =>
            handleDeleteBooking(id, async () => {
              setFlyout(null);
              await reload();
            })
          }
          handleStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Edit Booking Sheet - Only render when editing a reservation */}
      {editingReservation && (
        <EditBookingSheet
          editingReservation={editingReservation}
          setEditingReservation={setEditingReservation}
          availableRooms={availableRooms}
          onUpdate={handleEditBookingUpdate}
          onDelete={handleEditBookingDelete}
        />
      )}

      {/* View Booking Sheet */}
      <ViewBookingSheet
        viewReservation={viewReservation}
        setViewReservation={setViewReservation}
      />

      {/* Legend Bar */}
      <div className="mt-4 text-left text-md">
        <button
          type="button"
          onClick={() => setShowLegend(true)}
          className="underline text-gray-900 dark:text-white font-bold hover:text-purple-600 cursor-pointer"
        >
          Legend
        </button>
      </div>

      <LegendModal open={showLegend} onClose={() => setShowLegend(false)} />
    </div>
  );
}
