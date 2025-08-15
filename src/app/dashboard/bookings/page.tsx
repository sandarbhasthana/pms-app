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
import LegendModal from "@/components/bookings/LegendModal";
import { LoadingSpinner } from "@/components/ui/spinner";

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
}

export default function BookingsRowStylePage() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Add refetch control state
  const [lastRefetch, setLastRefetch] = useState<number>(0);
  const [isRefetching, setIsRefetching] = useState(false);

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
    showAddNote: boolean;
    noteText: string;
  } | null>(null);

  // View‐Details modal state
  const [viewReservation, setViewReservation] = useState<Reservation | null>(
    null
  );

  // Holiday & geolocation state
  const [country, setCountry] = useState<string>("");
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // FIXED: Stable today highlight using local timezone consistently
  const todayDateString = useMemo(() => {
    const now = new Date();
    // Use local timezone instead of UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // YYYY-MM-DD format in local timezone
  }, []); // Only compute once on mount

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  // FIXED: Use stable date for today highlight in local timezone
  const startOfToday = useMemo(() => {
    const [year, month, day] = todayDateString.split("-").map(Number);
    return new Date(year, month - 1, day); // Local timezone
  }, [todayDateString]);

  const endOfToday = useMemo(() => {
    const dt = new Date(startOfToday);
    dt.setDate(dt.getDate() + 1);
    return dt;
  }, [startOfToday]);

  // FIXED: Debounced refetch function to prevent rapid successive calls
  const debouncedRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetch < 2000 || isRefetching) {
      // Minimum 2 second gap
      return;
    }

    setLastRefetch(now);
    setIsRefetching(true);

    setTimeout(() => {
      calendarRef.current?.getApi().refetchEvents();
      setIsRefetching(false);
    }, 100);
  }, [lastRefetch, isRefetching]);

  // FIXED: Optimized eventSources without caching to ensure fresh payment status
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
            end: fetchInfo.endStr
          });
          const res = await fetch(`/api/reservations?${params}`, {
            credentials: "include",
            // FIXED: Ensure fresh data for payment status updates
            cache: "no-cache",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              // FIXED: Include organization context
              ...(orgId && { "x-organization-id": orgId })
            }
          });
          const { reservations } = await res.json();

          success(
            reservations.map((r: Reservation) => ({
              id: r.id,
              resourceId: r.roomId,
              title: r.guestName,
              start: r.checkIn,
              end: r.checkOut,
              allDay: true,
              extendedProps: {
                isPartialDay: true,
                status: r.status,
                paymentStatus: r.paymentStatus
              }
            }))
          );
        } catch (e) {
          failure(e as Error);
        }
      },
      // FIXED: Static today highlight that doesn't cause re-renders
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
      // Weekend highlight function - Friday & Saturday only (yellow color)
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
  }, [startOfToday, endOfToday]); // FIXED: Stable dependencies

  // ------------------------
  // Load rooms function (separated for reuse)
  // ------------------------
  const loadRooms = useCallback(async () => {
    try {
      const roomsRes = await fetch("/api/rooms", {
        credentials: "include"
      });
      if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
      const roomsJson = await roomsRes.json();
      type RawRoom = { id: string; name: string; type: string };
      const roomsData: RawRoom[] = Array.isArray(roomsJson)
        ? roomsJson
        : roomsJson.rooms;

      interface GroupedResource {
        id: string;
        title: string;
        children: Array<{ id: string; title: string; order: string }>;
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
          order: room.name // Add explicit order field for FullCalendar
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
      const res = await fetch("/api/reservations", {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch reservations");
      const { reservations, count } = (await res.json()) as {
        reservations: Reservation[];
        count: number;
      };
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
  // ------------------------
  useEffect(() => {
    if (!country) return;
    (async () => {
      try {
        const year = new Date().getFullYear();
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
        setHolidays(map);
      } catch (e) {
        console.error("Failed to fetch holidays:", e);
        setHolidays({});
      }
    })();
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
        showDetails: false,
        showAddNote: false,
        noteText: resv.notes || ""
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
      // Get orgId from cookies for API calls
      const orgId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("orgId="))
        ?.split("=")[1];

      const res = await fetch("/api/reservations", {
        credentials: "include",
        // FIXED: Force fresh data after payment updates
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          // FIXED: Include organization context
          ...(orgId && { "x-organization-id": orgId })
        }
      });

      if (res.ok) {
        const { reservations } = await res.json();

        setEvents(reservations);

        // FIXED: Force immediate calendar refetch to show updated payment status
        calendarRef.current?.getApi().refetchEvents();
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
      <h1 className="text-2xl font-semibold mb-4">
        Booking Calendar (Row Style)
      </h1>

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
      />

      {/* New Booking Dialog */}
      <NewBookingModalFixed
        handleCreate={(bookingData) => {
          if (!selectedSlot) return;
          handleCreateBooking({
            selectedSlot,
            data: {
              guestName: bookingData.guestName,
              phone: bookingData.phone,
              email: bookingData.email,
              idType: bookingData.idType,
              idNumber: bookingData.idNumber,
              issuingCountry: bookingData.issuingCountry,
              checkIn: bookingData.checkIn,
              checkOut: bookingData.checkOut,
              adults: bookingData.adults,
              children: bookingData.children
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
          handleNoteSave={async (id, note) => {
            if (!note.trim()) return toast.error("Please type a note.");
            try {
              const res = await fetch(`/api/reservations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: note })
              });
              if (!res.ok) throw new Error("Failed to save note");
              const updated = await res.json();
              setEvents((evs) =>
                evs.map((e) =>
                  e.id === id ? { ...e, notes: updated.notes ?? note } : e
                )
              );
              if (viewReservation?.id === id)
                setViewReservation(
                  (v) => v && { ...v, notes: updated.notes ?? note }
                );
              setFlyout(null);
              toast.success("Note saved!");
            } catch (err: unknown) {
              toast.error(
                err instanceof Error ? err.message : "Could not save note"
              );
            }
          }}
          setFlyoutNote={(text) =>
            setFlyout((f) => (f ? { ...f, noteText: text } : null))
          }
          onPaymentAdded={reload}
        />
      )}

      {/* Edit Booking Sheet */}
      <EditBookingSheet
        editingReservation={editingReservation}
        setEditingReservation={setEditingReservation}
        availableRooms={resources.map((room, index) => {
          // Extract room type and number from title (e.g., "Presidential Suite - 101")
          const titleParts = room.title.split(" - ");
          const roomType = titleParts.length > 1 ? titleParts[0] : room.title;
          const roomNumber =
            titleParts.length > 1 ? titleParts[1] : `${index + 101}`;

          // Create proper room data
          return {
            id: room.id,
            name: room.title,
            number: roomNumber,
            type: roomType.toLowerCase().replace(/\s+/g, "_"),
            typeDisplayName: roomType,
            capacity: 4, // Placeholder - should come from room data
            basePrice: roomType.toLowerCase().includes("presidential")
              ? 5000
              : roomType.toLowerCase().includes("deluxe")
              ? 3500
              : roomType.toLowerCase().includes("suite")
              ? 4000
              : 2500,
            available: true, // Will be updated by availability check
            isCurrentRoom: editingReservation?.roomId === room.id
          };
        })}
        onUpdate={async (reservationId, data) => {
          await handleUpdateBooking({
            reservationId,
            data: {
              guestName: data.guestName || "",
              checkIn: data.checkIn || "",
              checkOut: data.checkOut || "",
              adults: data.adults || 1,
              children: data.children || 0,
              roomId: data.roomId, // ✅ ADD ROOM ID TO UPDATE
              notes: data.notes || ""
            },
            reload,
            onClose: () => setEditingReservation(null)
          });
        }}
        onDelete={async (reservationId) => {
          await handleDeleteBooking(reservationId, reload);
          setEditingReservation(null);
        }}
      />

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

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <p>
            🔧 Debug: Last refetch: {new Date(lastRefetch).toLocaleTimeString()}
          </p>
          <p>🔧 Debug: Is refetching: {isRefetching ? "Yes" : "No"}</p>
          <p>🔧 Debug: Events count: {events.length}</p>
        </div>
      )}
    </div>
  );
}
