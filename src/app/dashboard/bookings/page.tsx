// File: src/app/dashboard/bookings/page.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg, EventDropArg } from "@fullcalendar/core";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import { Dialog } from "@headlessui/react";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  XCircleIcon,
  PencilSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/globals.css";

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
}
interface Room {
  id: string;
  title: string;
}

export default function BookingsCalendarPage() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [datePickerDate, setDatePickerDate] = useState<Date | null>(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [events, setEvents] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [today, setToday] = useState(new Date());

  // Create modal state
  const [selectedSlot, setSelectedSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
  } | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

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

  // View Details modal state
  const [viewReservation, setViewReservation] = useState<Reservation | null>(
    null
  );

  // --- holiday state & geolocation ---
  const [country, setCountry] = useState<string>("");
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // Compute today’s range for highlighting
  const startOfToday = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );
  const endOfToday = useMemo(() => {
    const dt = new Date(startOfToday);
    dt.setDate(dt.getDate() + 1);
    return dt;
  }, [startOfToday]);

  // ------------------------
  // Memoized Handlers
  // ------------------------
  const handlePrev = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const date = api.getDate();
    date.setDate(date.getDate() - 1);
    api.gotoDate(date);
    setSelectedDate(date.toISOString().slice(0, 10));
  }, []);

  const handleNext = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const date = api.getDate();
    date.setDate(date.getDate() + 1);
    api.gotoDate(date);
    setSelectedDate(date.toISOString().slice(0, 10));
  }, []);

  const handleToday = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const now = new Date();
    api.gotoDate(now);
    setSelectedDate(now.toISOString().slice(0, 10));
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
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
    if (roomId && roomName) {
      setSelectedSlot({ roomId, roomName, date: dateTab });
      setAdults(1);
      setChildren(0);
    }
  }, []);

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
        calendarRef.current?.getApi().refetchEvents();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Could not update");
        arg.revert();
      }
    },
    [viewReservation]
  );

  // ------------------------
  // Memoized eventSources
  // ------------------------
  const eventSources = useMemo(
    () => [
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
          const params = new URLSearchParams({
            start: fetchInfo.startStr,
            end: fetchInfo.endStr
          });
          const res = await fetch(`/api/reservations?${params}`, {
            credentials: "include"
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
              extendedProps: { isPartialDay: true, status: r.status }
            }))
          );
        } catch (e) {
          failure(e as Error);
        }
      },
      {
        events: [
          {
            id: "todayHighlight",
            start: startOfToday.toISOString(),
            end: endOfToday.toISOString(),
            display: "background" as const,
            //backgroundColor: "#008080",
            backgroundColor: "#574964",
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
          if (dow === 5 || dow === 6) {
            const s = new Date(d);
            const e = new Date(d);
            e.setDate(e.getDate() + 1);
            wknd.push({
              id: `wknd-${s.toISOString()}`,
              start: s.toISOString(),
              end: e.toISOString(),
              display: "background",
              classNames: ["weekend-highlight"],
              allDay: true
            });
          } else if (dow === 0) {
            const s = new Date(d);
            const e = new Date(d);
            e.setDate(e.getDate() + 1);
            wknd.push({
              id: `wknd-${s.toISOString()}`,
              start: s.toISOString(),
              end: e.toISOString(),
              display: "background",
              classNames: ["sunday-highlight"],
              allDay: true
            });
          }
        }
        success(wknd);
      }
    ],
    [startOfToday, endOfToday]
  );

  const isToday = (date: Date) => {
    const local = new Date();
    return (
      date.getFullYear() === local.getFullYear() &&
      date.getMonth() === local.getMonth() &&
      date.getDate() === local.getDate()
    );
  };

  // ------------------------
  // Memoized FullCalendar
  // ------------------------
  const calendar = useMemo(
    () => (
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineCustom"
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        views={{
          resourceTimelineCustom: {
            type: "resourceTimeline",
            duration: { days: 14 },
            slotDuration: { days: 1 },
            slotLabelInterval: { days: 1 },
            slotLabelFormat: {
              weekday: "short",
              day: "numeric"
            }
          }
        }}
        resources={resources}
        eventSources={eventSources}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        editable
        headerToolbar={false}
        navLinks={false}
        weekends
        slotDuration={{ hours: 12 }}
        slotLabelInterval={{ days: 1 }}
        slotLabelContent={(args) => {
          if (args.date.getHours() !== 0) return null;
          const iso = args.date.toISOString().slice(0, 10);
          const name = holidays[iso];
          return (
            <div className="flex flex-col items-center px-2 py-1 text-sm">
              <div className="font-small">
                {args.date.toLocaleDateString(undefined, { month: "short" })}
              </div>
              <div className="font-medium">
                {args.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric"
                })}
              </div>
              {name && <div className="mt-1 text-xs text-red-600">{name}</div>}
            </div>
          );
        }}
        eventDidMount={(info) => {
          if (info.event.display === "background") return;
          const { isPartialDay } = info.event.extendedProps as {
            isPartialDay?: boolean;
          };
          if (isPartialDay) {
            const slotEl = document.querySelector(
              ".fc-timeline-slot"
            ) as HTMLElement;
            const colW = slotEl?.clientWidth ?? 100;
            info.el.style.marginLeft = `${colW * 0.45}px`;
            info.el.style.width = `${info.el.clientWidth + colW * 0.4}px`;
            info.el.style.borderRadius = "4px";
          }
          info.el.style.minHeight = "24px";
          info.el.style.whiteSpace = "normal";
          info.el.style.padding = "2px 4px";
        }}
        eventClassNames={({ event }) => {
          const status = event.extendedProps.status as string | undefined;
          if (status === "CHECKED_IN") return ["checked_in_date"];
          if (status === "CHECKED_OUT") return ["checked_out_date"];
          if (status === "PENDING") return ["pending_booking"];
          return [];
        }}
        dayHeaderContent={(args) => (
          <span
            className={cn(
              args.date.toLocaleDateString("en-CA") === selectedDate &&
                "bg-purple-300",
              isToday(args.date) && "bg-[#008080]",
              "px-2 py-1 text-sm"
            )}
          >
            {args.date.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric"
            })}
          </span>
        )}
        eventContent={(arg) =>
          arg.event.display !== "background" ? (
            <div
              style={{
                whiteSpace: "normal",
                lineHeight: "1.2",
                fontSize: "0.8rem",
                padding: "2px",
                overflow: "hidden",
                fontWeight: "bold"
              }}
            >
              {arg.event.title}
            </div>
          ) : null
        }
        resourceAreaHeaderContent={<div className="pl-2">All Room Types</div>}
        resourceAreaHeaderClassNames={[
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white pl-6"
        ]}
        resourceAreaWidth="300px"
        resourceLabelContent={(info) => (
          <span
            onClick={() => setSelectedResource(info.resource.id)}
            className={cn(
              info.resource.id === selectedResource && "bg-blue-50",
              "block px-2 py-1 cursor-pointer text-sm"
            )}
          >
            {info.resource.title}
          </span>
        )}
        slotLabelClassNames={({ date }) => {
          const cls: string[] = [
            "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          ];
          const dow = date.getDay();
          if (dow === 5 || dow === 6 || dow === 0) cls.push("bg-pink-100");
          if (date.toLocaleDateString("en-CA") === selectedDate)
            cls.push("bg-blue-100");
          if (isToday(date)) cls.push("bg-[#008080]");
          return cls;
        }}
        resourceLaneClassNames={({ resource }) =>
          resource.id === selectedResource ? ["bg-blue-50"] : []
        }
        height="auto"
        slotMinWidth={50}
      />
    ),
    [
      resources,
      eventSources,
      handleEventClick,
      handleDateClick,
      handleEventDrop,
      selectedDate,
      selectedResource,
      holidays
    ]
  );

  // 1) Determine country via geolocation, fallback to browser locale
  useEffect(() => {
    const localeFallback = () =>
      (navigator.language.split("-")[1] || "US").toUpperCase();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const resp = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (!resp.ok) throw new Error("Reverse-geocode failed");
            const geo = await resp.json();
            setCountry((geo.countryCode || localeFallback()).toUpperCase());
            //console.log("Country:", geo.countryCode);
          } catch {
            setCountry(localeFallback());
          }
        },
        () => {
          setCountry(localeFallback());
        }
      );
    } else {
      setCountry(localeFallback());
    }
  }, []);

  // 2) Fetch holidays from Calendarific once we know `country`
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
      } catch (err) {
        console.error("Failed to fetch Calendarific holidays:", err);
        setHolidays({});
      }
    })();
  }, [country]);

  // Load rooms + reservations on mount
  useEffect(() => {
    async function loadAll() {
      try {
        // rooms
        const roomsRes = await fetch("/api/rooms", {
          credentials: "include"
        });
        if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
        const roomsJson = await roomsRes.json();
        type RawRoom = { id: string; name: string };
        const roomsData: RawRoom[] = Array.isArray(roomsJson)
          ? roomsJson
          : roomsJson.rooms;
        setResources(
          roomsData.map((r) => ({
            id: r.id,
            title: r.name
          }))
        );

        // reservations
        const res = await fetch("/api/reservations", {
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to fetch reservations");
        const { reservations, count } = (await res.json()) as {
          reservations: Reservation[];
          count: number;
        };
        setEvents(reservations);
        toast.success(`Loaded ${count} reservation(s)`);
      } catch (err: unknown) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load calendar data"
        );
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // Sync “today” each minute & on tab focus
  useEffect(() => {
    const update = () => setToday(new Date());
    const iv = setInterval(update, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") update();
    });
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Click‐outside to close flyout
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyout(null);
      }
    }
    if (flyout) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [flyout]);

  if (loading) {
    return <p className="text-center mt-10">Loading calendar...</p>;
  }
  // ------------------------
  // Create / Update / Delete / Checkout handlers (unchanged)
  // ------------------------
  const reload = async () => {
    const res = await fetch("/api/reservations", {
      credentials: "include"
    });
    if (res.ok) {
      const { reservations } = await res.json();
      setEvents(reservations);
      calendarRef.current?.getApi().refetchEvents();
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSlot) return;
    const guestName = e.currentTarget.guestName.value;
    const checkIn = e.currentTarget.checkIn.value;
    const checkOut = e.currentTarget.checkOut.value;
    if (!guestName || !checkIn || !checkOut) {
      toast.error("Fill all fields");
      return;
    }
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedSlot.roomId,
          guestName,
          checkIn,
          checkOut,
          adults,
          children
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Created!");
      setSelectedSlot(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingReservation) return;
    const guestName = e.currentTarget.guestName.value;
    const checkIn = e.currentTarget.checkIn.value;
    const checkOut = e.currentTarget.checkOut.value;
    try {
      const res = await fetch(`/api/reservations/${editingReservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          checkIn,
          checkOut,
          adults,
          children
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Updated!");
      setEditingReservation(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Deleted!");
      setFlyout(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CHECKED_OUT" })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Checked out!");
      setFlyout(null);
      const ev = calendarRef.current?.getApi().getEventById(id);
      if (ev) ev.setExtendedProp("status", "CHECKED_OUT");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div ref={containerRef} className="relative p-6">
      <h1 className="text-2xl font-semibold mb-4">Booking Calendar</h1>

      {/* Toolbar */}
      <div className={cn("flex items-center gap-4 mb-6")} role="toolbar">
        <div className="flex items-center justify-center rounded-bl-sm rounded-tl-sm">
          <div className="bg-purple-500 flex items-center justify-center rounded-bl-sm rounded-tl-sm border-r border-purple-600">
            <button
              onClick={handlePrev}
              className="h-[50px] w-[30px] ml-[5px] flex items-center text-white hover:text-gray-900 cursor-pointer"
              aria-label="Go to previous day"
              title="Go to previous day"
            >
              <ChevronLeftIcon
                className="h-6 w-6"
                vectorEffect="non-scaling-stroke"
              />
            </button>
          </div>
          <button
            onClick={handleToday}
            className="px-2 py-1 bg-purple-500 h-[50px] text-white hover:text-gray-900 cursor-pointer"
          >
            Today
          </button>
          <div className="bg-purple-500 flex items-center justify-center rounded-br-sm rounded-tr-sm border-l border-purple-600">
            <button
              onClick={handleNext}
              className="h-[50px] w-[30px] ml-[5px] flex items-center text-white hover:text-gray-900 cursor-pointer"
              aria-label="Go to next day"
              title="Go to next day"
            >
              <ChevronRightIcon
                className="h-6 w-6"
                vectorEffect="non-scaling-stroke"
              />
            </button>
          </div>
        </div>
        <div className="w-[100px]">
          <DatePicker
            selected={datePickerDate}
            onChange={(date: Date | null) => {
              setDatePickerDate(date);
              if (date) {
                const formattedDate = date.toISOString().slice(0, 10);
                setSelectedDate(formattedDate);

                // If you need to update the calendar view
                const api = calendarRef.current?.getApi();
                if (api) {
                  api.gotoDate(date);
                }
              }
            }}
            dateFormat="yyyy-MM-dd"
            className="border-purple-600 border-2 p-2 rounded h-[50px] z-[100] w-[150px]"
            popperPlacement="bottom-end"
          />
        </div>
      </div>

      {/* Memoized Calendar */}
      {calendar}

      {/* Flyout Menu */}
      {flyout && (
        <div
          ref={flyoutRef}
          className="absolute bg-yellow-50 dark:bg-blue-950 text-black dark:text-white rounded-xl shadow-lg z-50 text-sm"
          style={{ top: flyout.y - 60, left: flyout.x + 20 }}
        >
          {/* Menu options */}
          <ul>
            <li>
              <button
                onClick={async () => {
                  // ① close the flyout immediately
                  setFlyout(null);

                  // ② fetch the up‐to‐date reservation from the server
                  try {
                    const res = await fetch(
                      `/api/reservations/${flyout!.reservation.id}`,
                      { credentials: "include" }
                    );
                    if (!res.ok) {
                      const payload = await res.json().catch(() => ({}));
                      throw new Error(
                        payload.error || "Failed to load reservation"
                      );
                    }
                    const freshReservation: Reservation = await res.json();

                    // ③ open the “View Details” modal with the fresh data
                    setViewReservation(freshReservation);
                  } catch (err: unknown) {
                    console.error(err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Could not load details"
                    );
                  }
                }}
                className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900 hover:rounded-t-xl"
              >
                <EyeIcon className="h-4 w-4 mr-2 font-semibold text-orange-600" />
                View Details
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  handleCheckOut(flyout.reservation.id);
                  //console.log("Checked out!");
                }}
                className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900"
              >
                <CheckIcon className="h-4 w-4 mr-2 font-semibold text-green-600" />
                Check Out
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setEditingReservation(flyout.reservation);
                  setFlyout(null);
                }}
                className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900"
              >
                <PencilIcon className="h-4 w-4 mr-2 font-semibold text-blue-600" />
                Modify Booking
              </button>
            </li>
            <li>
              <button
                onClick={() => handleDelete(flyout.reservation.id)}
                className="flex items-center w-full text-left px-4 py-2 font-semibold text-red-600 hover:bg-red-100"
              >
                <XCircleIcon className="h-4 w-4 mr-2 font-semibold text-red-600" />
                Cancel Booking
              </button>
            </li>
            <li>
              <button
                onClick={() =>
                  setFlyout((f) =>
                    f ? { ...f, showAddNote: !f.showAddNote } : null
                  )
                }
                className="flex items-center w-full text-left px-4 py-2 font-semibold hover:bg-[#f3ddff] hover:text-gray-900 rounded-b-xl"
              >
                <PencilSquareIcon className="h-4 w-4 mr-2 font-semibold text-indigo-600" />
                Add Note
              </button>
            </li>
          </ul>

          {/* ───────────────────── INLINE “Add Note” SECTION ───────────────────── */}
          {flyout?.showAddNote && (
            <div className="px-4 py-2 border-t border-gray-200 space-y-2">
              <textarea
                value={flyout.noteText}
                onChange={(e) =>
                  setFlyout((f) =>
                    f ? { ...f, noteText: e.target.value } : null
                  )
                }
                placeholder="Type your note here..."
                className="block w-full h-20 border border-gray-300 rounded p-2 text-sm"
              />
              <button
                onClick={async () => {
                  if (!flyout || !flyout.noteText.trim()) {
                    toast.error("Please type a note.");
                    return;
                  }

                  try {
                    // ① Send PATCH request to save the note on the server
                    const res = await fetch(
                      `/api/reservations/${flyout.reservation.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ notes: flyout.noteText.trim() })
                      }
                    );
                    if (!res.ok) {
                      const payload = await res.json().catch(() => ({}));
                      throw new Error(payload.error || "Failed to save note");
                    }

                    // Assume the API returns the updated Reservation as JSON.
                    // If your API does NOT return the updated object, you can skip
                    // this await and instead re‐fetch below.
                    const updatedReservation: Reservation = await res.json();
                    console.log(
                      "PATCH ➔ updatedReservation.status:",
                      updatedReservation.status
                    );

                    // ② If the “View Details” modal is open for this same reservation,
                    //     update its state so the newly‐saved notes appear instantly:
                    if (viewReservation?.id === flyout.reservation.id) {
                      setViewReservation((prev) =>
                        prev
                          ? {
                              ...prev,
                              notes:
                                updatedReservation.notes ??
                                flyout.noteText.trim()
                            }
                          : prev
                      );
                    }

                    // ③ Update your master `events` array (so FullCalendar’s eventSource
                    //     shows the new notes on hover/flyout in the future):
                    setEvents((all) =>
                      all.map((r) =>
                        r.id === flyout.reservation.id
                          ? {
                              ...r,
                              // Prefer whatever the API returned; fallback to our trimmed text:
                              notes:
                                updatedReservation.notes ??
                                flyout.noteText.trim()
                            }
                          : r
                      )
                    );

                    // ④ Close the flyout’s “Add Note” section and show success toast
                    setFlyout(null);
                    toast.success("Note saved!");
                  } catch (err: unknown) {
                    console.error(err);
                    toast.error(
                      err instanceof Error ? err.message : "Could not save note"
                    );
                  }
                }}
                className="mt-1 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────── */}
        </div>
      )}

      <Dialog
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        className="fixed inset-0 z-50"
      >
        <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded-lg shadow-xl max-w-md w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">
              New Booking
            </Dialog.Title>
            {selectedSlot && (
              <form onSubmit={handleCreate} className="space-y-4 text-sm">
                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-white">
                    Room
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded">
                    {selectedSlot.roomName}
                  </div>
                </div>
                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-white">
                    Guest Name
                  </label>
                  <input
                    name="guestName"
                    type="text"
                    placeholder="John Doe"
                    className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    title="Enter guest’s name"
                  />
                </div>
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="checkIn"
                      className="block text-sm font-medium text-gray-600 dark:text-white"
                    >
                      Check-In
                    </label>
                    <input
                      id="checkIn"
                      name="checkIn"
                      type="date"
                      defaultValue={selectedSlot.date}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                      title="Select check-in date"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkOut"
                      className="block text-sm font-medium text-gray-600 dark:text-white"
                    >
                      Check-Out
                    </label>
                    <input
                      id="checkOut"
                      name="checkOut"
                      type="date"
                      defaultValue={
                        new Date(
                          new Date(selectedSlot.date).getTime() + 86400000
                        )
                          .toISOString()
                          .split("T")[0]
                      }
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                      title="Select check-out date"
                    />
                  </div>
                </div>
                {/* Steppers */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-white">
                      Adults
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Decrease adults"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-sm">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdults(adults + 1)}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Increase adults"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-white">
                      Children
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Decrease children"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-sm">
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Increase children"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="text-right pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="mr-2 px-4 py-2 text-sm bg-white border border-gray-600 text-gray-900 rounded hover:bg-gray-300"
                    title="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    title="Submit"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* --------------- EDIT/DELETE MODAL --------------- */}
      <Dialog
        open={!!editingReservation}
        onClose={() => setEditingReservation(null)}
        className="fixed inset-0 z-50"
      >
        <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-xl max-w-md w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">
              Edit Booking
            </Dialog.Title>
            {editingReservation && (
              <form onSubmit={handleUpdate} className="space-y-4 text-sm">
                {/* Room (read‐only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-white">
                    Room
                  </label>
                  <div
                    className="mt-1 p-2 bg-white dark:bg-gray-900 texxt-gray-900 dark:text-white rounded"
                    title="Room"
                  >
                    {
                      resources.find((r) => r.id === editingReservation.roomId)
                        ?.title
                    }
                  </div>
                </div>
                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-white">
                    Guest Name
                  </label>
                  <input
                    name="guestName"
                    defaultValue={editingReservation.guestName}
                    className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    title="Guest Name"
                  />
                </div>
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="editCheckIn">Check-In</label>
                    <input
                      id="editCheckIn"
                      type="date"
                      name="checkIn"
                      defaultValue={editingReservation.checkIn.split("T")[0]}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                      title="Check-In Date"
                    />
                  </div>
                  <div>
                    <label htmlFor="editCheckOut">Check-Out</label>
                    <input
                      id="editCheckOut"
                      type="date"
                      name="checkOut"
                      defaultValue={editingReservation.checkOut.split("T")[0]}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                      title="Check-Out Date"
                    />
                  </div>
                </div>
                {/* Steppers */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-white">
                      Adults
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Decrease adults"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-sm">
                        {adults}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdults(adults + 1)}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Increase adults"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-white">
                      Children
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Decrease children"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-sm">
                        {children}
                      </span>
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        className="w-8 text-lg font-bold text-gray-600 dark:text-white"
                        title="Increase children"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => handleDelete(editingReservation.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    title="Delete"
                  >
                    Delete
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setEditingReservation(null)}
                      className="mr-2 px-4 py-2 bg-white border border-gray-600 text-gray-900 rounded hover:bg-gray-300 text-sm"
                      title="Cancel"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                      title="Save"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ─────────────────────────────── VIEW DETAILS MODAL ─────────────────────────────── */}
      <Dialog
        open={!!viewReservation}
        onClose={() => setViewReservation(null)}
        className="fixed inset-0 z-50"
      >
        <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
          <Dialog.Panel className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg shadow-xl max-w-md w-full p-6 text-sm">
            <Dialog.Title className="text-lg font-bold mb-2">
              Reservation Details
            </Dialog.Title>
            {viewReservation && (
              <div className="space-y-3">
                {/* Guest Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-white">
                    Guest:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                    {viewReservation.guestName}
                  </div>
                </div>

                {/* Check‐In / Check‐Out */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-white">
                      Check-In:
                    </label>
                    <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                      {new Date(viewReservation.checkIn).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium ttext-gray-600 dark:text-white">
                      Check-Out:
                    </label>
                    <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                      {new Date(viewReservation.checkOut).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </div>
                  </div>
                </div>

                {/* Total Nights */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-white">
                    Nights:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                    {Math.ceil(
                      (new Date(viewReservation.checkOut).getTime() -
                        new Date(viewReservation.checkIn).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}
                  </div>
                </div>

                {/* Rate Plan */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-white">
                    Rate Plan:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                    {viewReservation.ratePlan || "—"}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-white">
                    Status:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                    {viewReservation.status || "—"}
                  </div>
                </div>

                {/* Room Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-white">
                    Room:
                  </label>
                  <div className="mt-1 p-2 bg-white dark:bg-gray-900 text-gray-900 border border-gray-600 dark:text-white rounded">
                    {viewReservation.roomNumber || "—"}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-white">
                    Notes:
                  </label>
                  <textarea
                    readOnly
                    value={viewReservation.notes || "No notes available."}
                    className="mt-1 block w-full border border-gray-600 rounded p-2 text-xs bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white"
                    rows={4}
                  />
                </div>

                {/* Close Button */}
                <div className="text-right pt-4">
                  <button
                    type="button"
                    onClick={() => setViewReservation(null)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
