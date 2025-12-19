// File: src/app/dashboard/bookings/page-refactored.tsx
// 🔄 REFACTORING IN PROGRESS (Option A: Gradual Integration)
//
// ✅ Completed Refactorings:
// - getEventColor() → ./utils/eventColors.ts
// - isToday() → ./utils/calendarHelpers.ts
// - addDays() → ./utils/calendarHelpers.ts (used in handlePrev/handleNext)
// - toISODateString() → ./utils/calendarHelpers.ts (used in handlePrev/handleNext)
//
// 📦 Available for future use:
// - Custom hooks in ./hooks/ (useCalendarData, useCalendarEvents, etc.)
// - Additional utilities in ./utils/
// - Type definitions in ./types/
//
// 🎯 Next steps:
// - Gradually replace more inline functions with utilities
// - Consider using custom hooks for state management
// - Test thoroughly after each change
//
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  lazy,
  Suspense
} from "react";
import { useSession } from "next-auth/react";
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
import { RefreshCw, Plus } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/globals.css";
// ⚡ EAGER LOAD: Calendar is the main component - always needed on this page
import CalendarViewRowStyle from "@/components/bookings/CalendarViewRowStyle";
import AddButtonDropdown from "@/components/bookings/AddButtonDropdown";
import CalendarToolbar from "@/components/bookings/CalendarToolbar";
import { formatGuestNameForCalendar } from "@/lib/utils/nameFormatter";
import { LoadingSpinner } from "@/components/ui/spinner";
import { apiDeduplicator } from "@/lib/api-deduplication";
import { EditBookingFormData } from "@/components/bookings/edit-tabs/types";
import { DayTransitionIssue } from "@/types/day-transition";
import LocaleSwitcher from "@/components/dev/LocaleSwitcher";

// Import refactored utilities (Option A: Gradual Integration)
import { getEventColor } from "./utils/eventColors";
import { isToday, addDays, toISODateString } from "./utils/calendarHelpers";

// ⚡ EAGER IMPORTS: Small, frequently-used components (keep in main bundle)
import FlyoutMenu from "@/components/bookings/FlyoutMenu";
import CalendarCellFlyout from "@/components/bookings/CalendarCellFlyout";
import BlockEventFlyout from "@/components/bookings/BlockEventFlyout";
import LegendModal from "@/components/bookings/LegendModal";
import { DayTransitionBlockerModal } from "@/components/bookings/DayTransitionBlockerModal";

// 🔄 LAZY IMPORTS: Large, rarely-used components (code split for performance)
// Only lazy load components with heavy dependencies or large bundle size
// NOTE: IDScannerWithOCR removed - now using IDScannerWithEdgeRefinement (AI-based) inside BookingDetailsTab
const NewBookingModalFixed = lazy(
  () => import("@/components/bookings/NewBookingSheet")
);
const EditBookingSheet = lazy(
  () => import("@/components/bookings/EditBookingSheet")
);
const BlockRoomSheet = lazy(
  () => import("@/components/bookings/BlockRoomSheet")
);
const ViewBookingSheet = lazy(
  () => import("@/components/bookings/ViewBookingSheet")
);

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

interface RoomBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  blockType: string;
  reason: string;
}

interface Room {
  id: string;
  title: string;
  children?: Array<{ id: string; title: string; basePrice?: number }>;
}

// ✅ REFACTORED: getEventColor moved to ./utils/eventColors.ts
// Now imported at the top of the file

export default function BookingsRowStylePage() {
  const { data: session, status: sessionStatus } = useSession();
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
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [resources, setResources] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [ocrEnabled, setOcrEnabled] = useState(false);

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
  const [guestImageUrl, setGuestImageUrl] = useState<string | undefined>();
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | undefined>();
  const [idExpiryDate, setIdExpiryDate] = useState<string | undefined>();
  const [idDocumentExpired, setIdDocumentExpired] = useState<
    boolean | undefined
  >();
  const [showScanner, setShowScanner] = useState(false);

  // Edit/Delete modal state
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);

  // Flyout menu state (for reservation events)
  const [flyout, setFlyout] = useState<{
    reservation: Reservation;
    x: number;
    y: number;
    showDetails: boolean;
  } | null>(null);

  // Cell flyout menu state (for empty cells)
  const [cellFlyout, setCellFlyout] = useState<{
    roomId: string;
    roomName: string;
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const cellFlyoutRef = useRef<HTMLDivElement>(null);

  // Block room state
  const [blockData, setBlockData] = useState<{
    roomId: string;
    roomName: string;
    startDate: string;
    blockId?: string;
  } | null>(null);

  // Block event flyout state
  const [blockFlyout, setBlockFlyout] = useState<{
    blockId: string;
    roomId: string;
    roomName: string;
    blockType: string;
    reason: string;
    x: number;
    y: number;
  } | null>(null);
  const blockFlyoutRef = useRef<HTMLDivElement>(null);

  // Add button dropdown state
  const [addDropdown, setAddDropdown] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // View‐Details modal state
  const [viewReservation, setViewReservation] = useState<Reservation | null>(
    null
  );

  // Holiday & geolocation state
  const [country, setCountry] = useState<string>("");
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // Day Transition Blocker Modal state
  const [dayTransitionBlockerOpen, setDayTransitionBlockerOpen] =
    useState(false);
  const [dayTransitionIssues, setDayTransitionIssues] = useState<
    DayTransitionIssue[]
  >([]);
  const [dayTransitionLoading, setDayTransitionLoading] = useState(false);
  const [pendingDateNavigation, setPendingDateNavigation] =
    useState<Date | null>(null);

  // Get current property ID from session/cookies
  const currentPropertyId = useMemo(() => {
    const propertyIdCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("propertyId="));
    return (
      propertyIdCookie?.split("=")[1] ||
      session?.user?.currentPropertyId ||
      session?.user?.availableProperties?.[0]?.id ||
      ""
    );
  }, [session?.user?.currentPropertyId, session?.user?.availableProperties]);

  // Get property timezone from session for operational day boundaries (6 AM start)
  const propertyTimezone = useMemo(() => {
    const currentProperty = session?.user?.availableProperties?.find(
      (p) => p.id === currentPropertyId
    );
    return currentProperty?.timezone || "UTC";
  }, [session?.user?.availableProperties, currentPropertyId]);

  // Day Transition Blocker Modal handlers - MUST be defined before any conditional returns
  const handleDayTransitionProceed = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api || !pendingDateNavigation) return;

    // Proceed to the pending date
    api.gotoDate(pendingDateNavigation);
    setSelectedDate(pendingDateNavigation.toISOString().slice(0, 10));

    // Close modal and reset state
    setDayTransitionBlockerOpen(false);
    setDayTransitionIssues([]);
    setPendingDateNavigation(null);

    toast.success("Proceeded to next day");
  }, [pendingDateNavigation]);

  const handleDayTransitionStay = useCallback(() => {
    // Close modal and reset state without navigating
    setDayTransitionBlockerOpen(false);
    setDayTransitionIssues([]);
    setPendingDateNavigation(null);

    toast.info("Staying on current day");
  }, []);

  // ✅ REFACTORED: isToday moved to ./utils/calendarHelpers.ts
  // Now imported at the top of the file

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

  // Optimized eventSources - faster initial load
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

          const cacheKey = `reservations-${fetchInfo.startStr}-${fetchInfo.endStr}`;

          // ⚡ OPTIMIZATION: Use request deduplication to prevent multiple concurrent calls
          const data = await apiDeduplicator.deduplicate(cacheKey, async () => {
            const params = new URLSearchParams({
              start: fetchInfo.startStr,
              end: fetchInfo.endStr
            });
            const res = await fetch(`/api/reservations?${params}`, {
              credentials: "include",
              headers: orgId ? { "x-organization-id": orgId } : {}
            });
            return await res.json();
          });

          const { reservations } = data;

          // No need to filter - backend now excludes soft-deleted reservations (deletedAt != null)
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
      },

      // Block events source
      (
        _info: { start: Date; end: Date },
        success: (
          events: {
            id: string;
            resourceId: string;
            title: string;
            start: string;
            end: string;
            allDay: boolean;
            backgroundColor: string;
            borderColor: string;
            textColor: string;
            classNames: string[];
            extendedProps: {
              isBlock: boolean;
              blockId: string;
              blockType: string;
              reason: string;
            };
          }[]
        ) => void
      ) => {
        const blockEvents = blocks.map((block) => {
          // Blocks should render like reservations: from start date to end date
          // Use allDay: true with isPartialDay: true to match reservation rendering
          return {
            id: `block-${block.id}`,
            resourceId: block.roomId,
            title: `🔒 ${block.blockType.replace(/_/g, " ")}`,
            start: block.startDate,
            end: block.endDate,
            allDay: true, // Use allDay like reservations
            backgroundColor:
              "repeating-linear-gradient(45deg, #ff1744, #ff1744 6px, #ff4081 6px, #ff4081 20px)",
            borderColor: "#ff1744",
            textColor: "#ffffff",
            classNames: ["block-event"],
            extendedProps: {
              isBlock: true,
              blockId: block.id,
              blockType: block.blockType,
              reason: block.reason || "",
              isPartialDay: true
            }
          };
        });
        success(blockEvents);
      }
    ];
  }, [isDarkMode, blocks]); // Add blocks to dependencies

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
      toast.error(e instanceof Error ? e.message : "Failed to load room data");
    }
  }, []);

  // ------------------------
  // Load reservations function with date range filtering
  // ⚡ OPTIMIZATION: Only load visible date range to reduce memory usage
  // ------------------------
  const loadReservations = useCallback(
    async (showToast = false, startDate?: string, endDate?: string) => {
      try {
        // Build query params with date range if provided
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const queryString = params.toString();
        const url = `/api/reservations${queryString ? `?${queryString}` : ""}`;

        // OPTIMIZATION: Use request deduplication to prevent duplicate requests
        const { reservations, count } = await apiDeduplicator.deduplicate(
          `bookings-reservations-${queryString}`,
          async () => {
            const res = await fetch(url, {
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
        toast.error(
          e instanceof Error ? e.message : "Failed to load reservation data"
        );
      }
    },
    []
  );

  // Load blocks function
  const loadBlocks = useCallback(async () => {
    try {
      const propertyId = session?.user?.availableProperties?.[0]?.id;
      if (!propertyId) return;

      const timestamp = Date.now();
      const blocksRes = await fetch(
        `/api/room-blocks?propertyId=${propertyId}&t=${timestamp}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache"
          }
        }
      );

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        setBlocks(blocksData);
      }
    } catch {
      // Silently fail - blocks are not critical
    }
  }, [session?.user?.availableProperties]);

  // ------------------------
  // Initial load: ONLY rooms (required for calendar structure)
  // ------------------------
  // Initial load: rooms + blocks
  // ------------------------
  useEffect(() => {
    async function loadAll() {
      try {
        await Promise.all([loadRooms(), loadBlocks()]);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [loadRooms, loadBlocks]);

  // NOTE: Reservations are NOT loaded here anymore!
  // FullCalendar's eventSources handles fetching reservations when the calendar renders
  // This prevents double-fetching and speeds up initial load

  // ------------------------
  // TEMPORARY: Load Eruda for mobile debugging
  // ------------------------
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/eruda";
      document.body.appendChild(script);
      script.onload = () => {
        // @ts-expect-error - Eruda is loaded dynamically
        window.eruda?.init();
      };
    }
  }, []);

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
        } catch {
          // Silently fail
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
  // OPTIMIZATION: Cache location in localStorage to avoid repeated permission requests
  // ------------------------
  useEffect(() => {
    const fallback = () =>
      (navigator.language.split("-")[1] || "US").toUpperCase();

    // Check if we have cached location data
    const cachedLocation = localStorage.getItem("user_location");
    if (cachedLocation) {
      try {
        const locationData = JSON.parse(cachedLocation);
        // Check if cache is still valid (e.g., 30 days)
        const cacheAge = Date.now() - locationData.timestamp;
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        if (cacheAge < thirtyDaysInMs) {
          setCountry(locationData.countryCode);
          return; // Use cached data, skip geolocation request
        }
      } catch {
        // Invalid cache, proceed with geolocation
      }
    }

    // No valid cache, request geolocation
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
            const countryCode = (geo.countryCode || fallback()).toUpperCase();

            // Cache the location data
            localStorage.setItem(
              "user_location",
              JSON.stringify({
                countryCode,
                latitude,
                longitude,
                timestamp: Date.now()
              })
            );

            setCountry(countryCode);
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
            return;
          } catch {
            // Cached data invalid, fetch fresh
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
      } catch {
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
  // Button handlers: Move 7 days at a time
  // ✅ REFACTORED: Using addDays and toISODateString from calendarHelpers
  const handlePrev = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = api.getDate();
    const newDate = addDays(d, -7); // Move 1 week backward
    api.gotoDate(newDate);
    setSelectedDate(toISODateString(newDate));
  }, []);

  const handleNext = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = api.getDate();
    const newDate = addDays(d, 7); // Move 1 week forward
    api.gotoDate(newDate);
    setSelectedDate(toISODateString(newDate));
  }, []);

  const handleToday = useCallback(async () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    const now = new Date();

    // Check if we're already on today's date
    const currentDate = api.getDate();
    const isAlreadyToday =
      currentDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);

    if (isAlreadyToday) {
      return; // Already on today, no need to check
    }

    // Get propertyId from cookies
    const propertyId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("propertyId="))
      ?.split("=")[1];

    if (!propertyId) {
      // Fallback: just navigate to today
      api.gotoDate(now);
      setSelectedDate(now.toISOString().slice(0, 10));
      return;
    }

    // Get property timezone from session
    const currentProperty = session?.user?.availableProperties?.find(
      (p) => p.id === propertyId
    );
    const propertyTimezone = currentProperty?.timezone || "UTC";

    // Validate day transition
    try {
      setDayTransitionLoading(true);
      const params = new URLSearchParams({
        propertyId,
        timezone: propertyTimezone
      });

      const response = await fetch(
        `/api/reservations/day-transition/validate?${params}`,
        {
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to validate day transition");
      }

      const validationResult = await response.json();

      if (validationResult.canTransition) {
        // No issues, proceed to today
        api.gotoDate(now);
        setSelectedDate(now.toISOString().slice(0, 10));
      } else {
        // Issues found, show modal
        setDayTransitionIssues(validationResult.issues);
        setPendingDateNavigation(now);
        setDayTransitionBlockerOpen(true);
      }
    } catch {
      // On error, allow navigation anyway
      api.gotoDate(now);
      setSelectedDate(now.toISOString().slice(0, 10));
      toast.error("Failed to validate day transition, proceeding anyway");
    } finally {
      setDayTransitionLoading(false);
    }
  }, [session?.user?.availableProperties]);

  // ------------------------
  // Date‐click handler shows context menu
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

      // Only allow on individual rooms (children), not room types (parents)
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

        // Check if this date/room combination is blocked
        const isBlocked = blocks.some((block) => {
          if (block.roomId !== roomId) return false;

          const blockStart = new Date(block.startDate);
          const blockEnd = new Date(block.endDate);

          // Check if the clicked date falls within a block
          return clickedDate >= blockStart && clickedDate < blockEnd;
        });

        if (isBlocked) {
          toast.error(
            "This room is blocked for the selected date. Please choose a different date or room."
          );
          return;
        }

        // Get the clicked cell's bounding rect for proper positioning
        const target = arg.jsEvent.target as HTMLElement;
        const cell = target.closest(".fc-timeline-slot") || target;
        const rect = cell.getBoundingClientRect();

        // Show context menu flyout instead of opening NewBookingSheet directly
        // Position similar to reservation flyout: slightly to the right and below the cell
        setCellFlyout({
          roomId,
          roomName,
          date: dateTab,
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY
        });
      }
    },
    [events, blocks]
  );

  // ------------------------
  // Context menu handlers
  // ------------------------
  const handleCreateBookingFromMenu = useCallback(
    (roomId: string, roomName: string, date: string) => {
      // Open NewBookingSheet with pre-filled data
      setSelectedSlot({ roomId, roomName, date });
      setAdults(1);
      setChildren(0);
      // Reset customer fields
      setFullName("");
      setPhone("");
      setEmail("");
      setIdType("passport");
      setIdNumber("");
      setIssuingCountry("");
    },
    []
  );

  const handleBlockRoomFromMenu = useCallback(
    (roomId: string, roomName: string, date: string) => {
      // Open BlockRoomSheet with pre-filled data
      setBlockData({
        roomId,
        roomName,
        startDate: date
      });
    },
    []
  );

  const handleRoomInfoFromMenu = useCallback(
    (_roomId: string, roomName: string) => {
      // TODO: Open RoomInfoModal (Phase 3)
      toast.info(`Room Information feature coming soon: ${roomName}`);
    },
    []
  );

  // ------------------------
  // Handle calendar date range changes (for windowed loading)
  // ⚡ OPTIMIZATION: Load data only for visible date range when user scrolls
  // ------------------------
  const handleDatesSet = useCallback(
    (start: Date, end: Date) => {
      const startDateStr = start.toISOString().split("T")[0];
      const endDateStr = end.toISOString().split("T")[0];

      // Load reservations for the new visible range
      loadReservations(false, startDateStr, endDateStr);
    },
    [loadReservations]
  );

  // ------------------------
  // Add button dropdown handlers
  // ------------------------
  const handleAddReservationFromDropdown = useCallback(() => {
    // Open NewBookingSheet in empty mode (no pre-selected room/date)
    setSelectedSlot({
      roomId: "", // Empty - will be selected by user
      roomName: "",
      date: new Date().toISOString().split("T")[0] // Today's date
    });
  }, []);

  const handleBlockDatesFromDropdown = useCallback(() => {
    // Open BlockRoomSheet in empty mode (no pre-selected room/date)
    setBlockData({
      roomId: "", // Empty - will be selected by user
      roomName: "",
      startDate: new Date().toISOString().split("T")[0] // Today's date
    });
  }, []);

  // Callback to fetch available rooms for a date range
  const fetchAvailableRooms = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        // Get propertyId from cookie (same as calendar uses)
        const propertyIdCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("propertyId="));

        const propertyId = propertyIdCookie
          ? propertyIdCookie.split("=")[1]
          : session?.user?.currentPropertyId ||
            session?.user?.availableProperties?.[0]?.id;

        if (!propertyId) return [];

        const response = await fetch(
          `/api/rooms/available?propertyId=${propertyId}&startDate=${startDate}&endDate=${endDate}`
        );

        if (!response.ok) {
          return [];
        }

        const data = await response.json();

        return data.map(
          (room: {
            id: string;
            name: string;
            type: string;
            roomType?: { id: string; name: string; basePrice: number };
          }) => ({
            id: room.id,
            name: room.name,
            type: room.type,
            roomType: room.roomType
          })
        );
      } catch {
        return [];
      }
    },
    [session?.user?.currentPropertyId, session?.user?.availableProperties]
  );

  // ------------------------
  // Event‐click handler opens flyout menu
  // ------------------------
  const handleEventClick = useCallback(
    async (arg: EventClickArg) => {
      arg.jsEvent.preventDefault();
      arg.jsEvent.stopPropagation();

      // Check if this is a block event
      const isBlock = arg.event.extendedProps?.isBlock;
      if (isBlock) {
        const rect = arg.el.getBoundingClientRect();
        const roomId = arg.event.getResources()[0]?.id || "";
        const roomName = arg.event.getResources()[0]?.title || "";

        setBlockFlyout({
          blockId: arg.event.extendedProps.blockId,
          roomId,
          roomName,
          blockType: arg.event.extendedProps.blockType,
          reason: arg.event.extendedProps.reason || "",
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY
        });
        return;
      }

      const resv = events.find((e) => e.id === arg.event.id);
      if (!resv) return;

      // Fetch fresh reservation data to ensure we have the latest status
      try {
        const res = await fetch(`/api/reservations/${resv.id}`, {
          credentials: "include"
        });
        if (res.ok) {
          const freshResv = await res.json();
          const rect = arg.el.getBoundingClientRect();
          setFlyout({
            reservation: freshResv,
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY,
            showDetails: false
          });
        } else {
          // Fallback to cached data if fetch fails
          const rect = arg.el.getBoundingClientRect();
          setFlyout({
            reservation: resv,
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY,
            showDetails: false
          });
        }
      } catch {
        // Fallback to cached data if fetch fails
        const rect = arg.el.getBoundingClientRect();
        setFlyout({
          reservation: resv,
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY,
          showDetails: false
        });
      }
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

          // Build detailed error message from validation details
          let errorMessage = error.error || "Failed to update status";
          if (
            error.details &&
            Array.isArray(error.details) &&
            error.details.length > 0
          ) {
            errorMessage = error.details[0]; // Show first validation error
          }

          // Create error object with isValidationError flag to suppress console logging
          const validationError = new Error(errorMessage);
          Object.defineProperty(validationError, "isValidationError", {
            value: true,
            enumerable: false
          });
          throw validationError;
        }

        // Refresh the calendar to show updated status
        debouncedRefetch();

        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      } catch (error) {
        // Only log to console if it's not a validation error (those are expected and already shown as toast)
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
          const timestamp = Date.now();
          const res = await fetch(
            `/api/reservations?orgId=${orgId}&t=${timestamp}`,
            {
              credentials: "include"
            }
          );

          if (res.ok) {
            const responseData = await res.json();

            // Update state with fresh data
            setEvents(responseData.reservations || []);
            setResources(responseData.rooms || []);

            // Force calendar refresh by removing all events and re-adding them
            const api = calendarRef.current?.getApi();
            if (api) {
              api.removeAllEvents();
              await new Promise((resolve) => setTimeout(resolve, 100));

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

              api.addEventSource(calendarEvents);
            }
          }
        } catch {
          toast.error("Failed to refresh calendar data");
        }
        return;
      }

      await handleUpdateBooking(
        reservationId,
        {
          guestName: data.guestName || "",
          checkIn: data.checkIn || "",
          checkOut: data.checkOut || "",
          adults: data.adults || 1,
          children: data.children || 0,
          roomId: data.roomId,
          notes: data.notes || ""
        },
        async () => {
          // Inline reload logic to avoid dependency on reload function
          try {
            const timestamp = Date.now();
            const res = await fetch(
              `/api/reservations?orgId=${orgId}&t=${timestamp}`,
              {
                credentials: "include"
              }
            );

            if (res.ok) {
              const data = await res.json();
              const activeReservations = (data.reservations || []).filter(
                (r: Reservation) =>
                  r.status !== "CANCELLED" && r.status !== "NO_SHOW"
              );
              setEvents(activeReservations);
              setResources(data.rooms || []);

              const api = calendarRef.current?.getApi();
              if (api) {
                api.removeAllEvents();
                await new Promise((resolve) => setTimeout(resolve, 50));
                api.refetchEvents();
              }
            }
          } catch {
            toast.error("Failed to refresh calendar data");
          }
        }
      );
      setEditingReservation(null);
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
        const timestamp = Date.now();
        const res = await fetch(
          `/api/reservations?orgId=${orgId}&t=${timestamp}`,
          {
            credentials: "include"
          }
        );

        if (res.ok) {
          const data = await res.json();
          const activeReservations = (data.reservations || []).filter(
            (r: Reservation) =>
              r.status !== "CANCELLED" && r.status !== "NO_SHOW"
          );
          setEvents(activeReservations);
          setResources(data.rooms || []);

          const api = calendarRef.current?.getApi();
          if (api) {
            api.removeAllEvents();
            await new Promise((resolve) => setTimeout(resolve, 50));
            api.refetchEvents();
          }
        }
      } catch {
        toast.error("Failed to refresh calendar data");
      }
    });
    setEditingReservation(null);
  }, []);

  // Handle refresh button click
  const handleRefreshClick = useCallback(async () => {
    setIsRefetching(true);
    try {
      // Get orgId from cookies for API calls
      const orgId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("orgId="))
        ?.split("=")[1];

      // Add timestamp to force cache bust
      const timestamp = Date.now();
      const res = await fetch(`/api/reservations?t=${timestamp}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          ...(orgId && { "x-organization-id": orgId })
        }
      });

      if (res.ok) {
        const { reservations } = await res.json();
        setEvents(reservations);

        const api = calendarRef.current?.getApi();
        if (api) {
          api.removeAllEvents();
          await new Promise((resolve) => setTimeout(resolve, 100));
          api.refetchEvents();
        }
        toast.success("Calendar refreshed");
      }
    } catch {
      toast.error("Failed to refresh calendar");
    } finally {
      setIsRefetching(false);
    }
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

  // FIXED: Optimized reload function with forced calendar refresh
  const reload = useCallback(async () => {
    try {
      const orgId = document.cookie
        .split("; ")
        .find((row) => row.startsWith("orgId="))
        ?.split("=")[1];

      const timestamp = Date.now();
      const res = await fetch(`/api/reservations?t=${timestamp}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          ...(orgId && { "x-organization-id": orgId })
        }
      });

      if (res.ok) {
        const { reservations } = await res.json();
        setEvents(reservations);
        await loadBlocks();

        const api = calendarRef.current?.getApi();
        if (api) {
          api.removeAllEvents();
          await new Promise((resolve) => setTimeout(resolve, 100));
          api.refetchEvents();
        }
      }
    } catch {
      toast.error("Failed to refresh calendar data");
    }
  }, [calendarRef, loadBlocks]);

  // Block event handlers
  const handleUnblockRoom = useCallback(
    async (blockId: string) => {
      try {
        const response = await fetch(`/api/room-blocks/${blockId}`, {
          method: "DELETE",
          credentials: "include"
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || "Failed to unblock room");
          return;
        }

        toast.success("Room unblocked successfully");
        reload();
      } catch {
        toast.error("Failed to unblock room");
      }
    },
    [reload]
  );

  const handleEditBlock = useCallback(
    async (blockId: string, roomId: string, roomName: string) => {
      try {
        const response = await fetch(`/api/room-blocks/${blockId}`, {
          credentials: "include"
        });

        if (!response.ok) {
          toast.error("Failed to load block details");
          return;
        }

        const block = await response.json();
        setBlockData({
          roomId,
          roomName,
          startDate: new Date(block.startDate).toISOString().split("T")[0],
          blockId
        });
      } catch {
        toast.error("Failed to load block details");
      }
    },
    []
  );

  // ✅ PERFORMANCE: Memoize inline callbacks to prevent re-renders in child components
  const handleNewBookingCreate = useCallback(
    async (bookingData: {
      fullName: string;
      phone: string;
      email: string;
      idType: string;
      idNumber: string;
      issuingCountry: string;
      checkIn: string;
      checkOut: string;
      adults: number;
      childrenCount: number;
      guestImageUrl?: string;
      idDocumentUrl?: string;
      idExpiryDate?: string;
      idDocumentExpired?: boolean;
      payment?: unknown;
      addons?: unknown;
    }) => {
      if (!selectedSlot) return;
      await handleCreateBooking(
        {
          roomId: selectedSlot.roomId,
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
          guestImageUrl: bookingData.guestImageUrl,
          idDocumentUrl: bookingData.idDocumentUrl,
          idExpiryDate: bookingData.idExpiryDate,
          idDocumentExpired: bookingData.idDocumentExpired,
          payment: bookingData.payment,
          addons: bookingData.addons
        },
        reload
      );
      setSelectedSlot(null);
    },
    [selectedSlot, reload]
  );

  const handleFlyoutCheckOut = useCallback(
    async (id: string) => {
      await handleCheckOut(id, reload);
      setFlyout(null);
    },
    [reload]
  );

  const handleFlyoutDelete = useCallback(
    (id: string) =>
      handleDeleteBooking(id, async () => {
        setFlyout(null);
        await reload();
      }),
    [reload]
  );

  const handleScanComplete = useCallback(
    (result: {
      idNumber: string;
      fullName: string;
      issuingCountry: string;
      idType?: string;
      guestImageUrl?: string;
      idDocumentUrl?: string;
      idExpiryDate?: string;
      idDocumentExpired?: boolean;
    }) => {
      if (!ocrEnabled) return;
      setIdNumber(result.idNumber);
      setFullName(result.fullName);
      setIssuingCountry(result.issuingCountry);
      setIdType(result.idType || "passport");
      setGuestImageUrl(result.guestImageUrl);
      setIdDocumentUrl(result.idDocumentUrl);
      setIdExpiryDate(result.idExpiryDate);
      setIdDocumentExpired(result.idDocumentExpired);
      setShowScanner(false);
      setOcrEnabled(false);
    },
    [ocrEnabled]
  );

  const handleScanError = useCallback((err: Error) => {
    toast.error("Scan failed: " + err.message);
  }, []);

  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
  }, []);

  const handleLegendOpen = useCallback(() => {
    setShowLegend(true);
  }, []);

  const handleLegendClose = useCallback(() => {
    setShowLegend(false);
  }, []);

  const handleAddDropdownClose = useCallback(() => {
    setAddDropdown(null);
  }, []);

  // ✅ PERFORMANCE: Memoize organization ID to prevent recalculation
  const organizationId = useMemo(() => {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("orgId="))
        ?.split("=")[1] || ""
    );
  }, []);

  // Show single loading state while session or data is loading
  if (sessionStatus === "loading" || loading) {
    return <LoadingSpinner text="Loading Calendar..." fullScreen />;
  }

  return (
    <div ref={containerRef} className="relative p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          Booking Calendar (TEST - Refactored)
        </h1>
        <div className="flex items-center gap-4">
          {/* Refresh Button */}
          <button
            type="button"
            title="Refresh Calendar"
            onClick={handleRefreshClick}
            disabled={isRefetching}
            className={`h-[50px] w-[50px] rounded-lg transition-colors flex items-center justify-center ${
              isRefetching
                ? "text-slate-600 dark:text-slate-400 cursor-not-allowed"
                : "text-[#f0f8f9] dark:text-slate-300 hover:text-[#f0f8f9] bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 cursor-pointer"
            }`}
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefetching ? "refresh-spinning" : ""}`}
            />
          </button>

          {/* Add Button (+ icon) */}
          <button
            ref={addButtonRef}
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              // Position dropdown to align with the right edge of the button
              // Dropdown width is 220px, button width is 50px
              setAddDropdown({
                x: rect.right - 220, // Align right edge of dropdown with right edge of button
                y: rect.bottom
              });
            }}
            aria-label="Add new reservation or block dates"
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white w-[50px] h-[50px] rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="h-6 w-6" />
          </button>

          {/* Toolbar - moved to right side */}
          <CalendarToolbar
            datePickerDate={datePickerDate}
            setDatePickerDate={setDatePickerDate}
            handlePrev={handlePrev}
            handleNext={handleNext}
            handleToday={handleToday}
            setSelectedDate={setSelectedDate}
            calendarRef={calendarRef}
          />
        </div>
      </div>

      {/* FullCalendar with Custom Swipe Integration */}
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
        onDateChange={handleDateChange}
        onDatesSet={handleDatesSet}
        propertyTimezone={propertyTimezone}
      />

      {/* New Booking Dialog - Only render when needed */}
      {selectedSlot && (
        <Suspense fallback={<LoadingSpinner />}>
          <NewBookingModalFixed
            handleCreate={handleNewBookingCreate}
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
            guestImageUrl={guestImageUrl}
            setGuestImageUrl={setGuestImageUrl}
            idDocumentUrl={idDocumentUrl}
            setIdDocumentUrl={setIdDocumentUrl}
            idExpiryDate={idExpiryDate}
            setIdExpiryDate={setIdExpiryDate}
            idDocumentExpired={idDocumentExpired}
            setIdDocumentExpired={setIdDocumentExpired}
            adults={adults}
            setAdults={setAdults}
            childrenCount={children}
            setChildrenCount={setChildren}
            showScanner={showScanner}
            setShowScanner={setShowScanner}
            setOcrEnabled={setOcrEnabled}
            handleScanComplete={handleScanComplete}
            handleScanError={handleScanError}
            onFetchAvailableRooms={fetchAvailableRooms}
          />
        </Suspense>
      )}

      {/* Scanner Overlay - REMOVED: Now using IDScannerWithEdgeRefinement inside BookingDetailsTab */}

      {/* Flyout Menu for Reservations - Eager loaded (small, frequently used) */}
      {flyout && (
        <FlyoutMenu
          flyout={flyout}
          flyoutRef={flyoutRef}
          setFlyout={setFlyout}
          setEditingReservation={setEditingReservation}
          setViewReservation={setViewReservation}
          handleCheckOut={handleFlyoutCheckOut}
          handleDelete={handleFlyoutDelete}
          handleStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Cell Flyout Menu for Empty Cells - Eager loaded */}
      {cellFlyout && (
        <CalendarCellFlyout
          flyout={cellFlyout}
          flyoutRef={cellFlyoutRef}
          setFlyout={setCellFlyout}
          onCreateBooking={handleCreateBookingFromMenu}
          onBlockRoom={handleBlockRoomFromMenu}
          onRoomInfo={handleRoomInfoFromMenu}
        />
      )}

      {/* Block Event Flyout - Eager loaded */}
      {blockFlyout && (
        <BlockEventFlyout
          flyout={blockFlyout}
          flyoutRef={blockFlyoutRef}
          setFlyout={setBlockFlyout}
          onUnblock={handleUnblockRoom}
          onEdit={handleEditBlock}
        />
      )}

      {/* Add Button Dropdown */}
      {addDropdown && (
        <AddButtonDropdown
          position={addDropdown}
          onClose={handleAddDropdownClose}
          onAddReservation={handleAddReservationFromDropdown}
          onBlockDates={handleBlockDatesFromDropdown}
        />
      )}

      {/* Block Room Sheet */}
      {blockData && (
        <Suspense fallback={<LoadingSpinner />}>
          <BlockRoomSheet
            blockData={blockData}
            setBlockData={setBlockData}
            onBlockCreated={reload}
            organizationId={organizationId}
            propertyId={currentPropertyId}
            onFetchAvailableRooms={fetchAvailableRooms}
          />
        </Suspense>
      )}

      {/* Edit Booking Sheet - Only render when editing a reservation */}
      {editingReservation && (
        <Suspense fallback={<LoadingSpinner />}>
          <EditBookingSheet
            editingReservation={editingReservation}
            setEditingReservation={setEditingReservation}
            availableRooms={availableRooms}
            onUpdate={handleEditBookingUpdate}
            onDelete={handleEditBookingDelete}
          />
        </Suspense>
      )}

      {/* View Booking Sheet - Only render when viewing a reservation */}
      {viewReservation && (
        <Suspense fallback={<LoadingSpinner />}>
          <ViewBookingSheet
            viewReservation={viewReservation}
            setViewReservation={setViewReservation}
          />
        </Suspense>
      )}

      {/* Legend Bar */}
      <div className="mt-4 text-left text-md">
        <button
          type="button"
          onClick={handleLegendOpen}
          className="underline text-gray-900 dark:text-white font-bold hover:text-purple-600 cursor-pointer"
        >
          Legend
        </button>
      </div>

      {/* Legend Modal - Eager loaded (tiny component) */}
      <LegendModal open={showLegend} onClose={handleLegendClose} />

      {/* Day Transition Blocker Modal - Eager loaded */}
      <DayTransitionBlockerModal
        isOpen={dayTransitionBlockerOpen}
        issues={dayTransitionIssues}
        onProceed={handleDayTransitionProceed}
        onStay={handleDayTransitionStay}
        isLoading={dayTransitionLoading}
      />

      {/* Developer Tool: Locale Switcher (only visible in development) */}
      <LocaleSwitcher />
    </div>
  );
}
