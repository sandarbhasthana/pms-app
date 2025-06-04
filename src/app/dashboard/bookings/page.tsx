// File: src/app/dashboard/bookings/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg, EventDropArg } from "@fullcalendar/core";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import toast from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  XCircleIcon,
  PencilSquareIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
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

  const [events, setEvents] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [today, setToday] = useState(new Date());

  // for Create
  const [selectedSlot, setSelectedSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
  } | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // for Edit/Delete modal
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);

  // For flyout menu
  const [flyout, setFlyout] = useState<{
    reservation: Reservation;
    x: number;
    y: number;
    showDetails: boolean;
    showAddNote: boolean;
    noteText: string;
  } | null>(null);

  // ◼️ New: State for “View Details” modal
  const [viewReservation, setViewReservation] = useState<Reservation | null>(
    null
  );

  // compute today’s range for background highlight
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // ------------------------
  // Helper to load reservations into state
  // ------------------------
  const loadReservations = async () => {
    try {
      const res = await fetch("/api/reservations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reservations");
      const {
        reservations,
        count
      }: { reservations: Reservation[]; count: number } = await res.json();
      setEvents(reservations);
      toast.success(`Loaded ${count} reservation(s)`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load reservations"
      );
    }
  };

  // ------------------------
  // Combined reload: update state _and_ refetch FullCalendar’s eventSource
  // ------------------------
  const reload = async () => {
    await loadReservations();
    calendarRef.current?.getApi().refetchEvents();
  };

  // ------------------------
  // Sync “today” every minute & on tab focus
  // ------------------------
  useEffect(() => {
    const updateToday = () => setToday(new Date());
    const interval = setInterval(updateToday, 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") updateToday();
    });
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", updateToday);
    };
  }, []);

  // ------------------------
  // Initial load: rooms + reservations
  // ------------------------
  useEffect(() => {
    async function loadAll() {
      try {
        // fetch rooms
        const roomsRes = await fetch(`/api/rooms`, { credentials: "include" });
        if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
        const roomsJson = await roomsRes.json();
        type RawRoom = { id: string; name: string };
        const roomsData: RawRoom[] = Array.isArray(roomsJson)
          ? roomsJson
          : roomsJson.rooms;
        setResources(roomsData.map((r) => ({ id: r.id, title: r.name })));

        // fetch reservations
        await loadReservations();
      } catch (e: unknown) {
        console.error(e instanceof Error ? e.message : "Unknown error");
        toast.error(
          e instanceof Error ? e.message : "Failed to load calendar data"
        );
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ------------------------
  // Click‐outside listener to close flyout
  // ------------------------
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(event.target as Node)
      ) {
        setFlyout(null);
      }
    }
    if (flyout) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [flyout]);

  if (loading) {
    return <p className="text-center mt-10">Loading calendar...</p>;
  }

  const api = calendarRef.current?.getApi();

  // ------------------------
  // NAVIGATION by **one day** (instead of 14 days)
  // ------------------------
  const prev = () => {
    if (!api) return;
    const current = api.getDate();
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() - 1);
    api.gotoDate(newDate);
    setSelectedDate(newDate.toISOString().slice(0, 10));
  };
  const next = () => {
    if (!api) return;
    const current = api.getDate();
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + 1);
    api.gotoDate(newDate);
    setSelectedDate(newDate.toISOString().slice(0, 10));
  };
  const todayFn = () => {
    if (!api) return;
    const newToday = new Date();
    api.gotoDate(newToday);
    setSelectedDate(newToday.toISOString().slice(0, 10));
  };

  // ------------------------
  // “Create” modal opener
  // ------------------------
  const onDateClick = (arg: DateClickArg) => {
    arg.jsEvent.preventDefault();
    arg.jsEvent.stopPropagation();
    const roomId = arg.resource?.id;
    const roomName = arg.resource?.title;
    // produce “YYYY-MM-DD” in local
    const dateTab = arg.date.toLocaleDateString("en-CA");
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    if (arg.date < today0) {
      toast.error("Cannot create bookings in the past.");
      return;
    }
    if (roomId && roomName) {
      setSelectedSlot({ roomId, roomName, date: dateTab });
      setAdults(1);
      setChildren(0);
    }
  };

  // ------------------------
  // “Flyout menu” opener (instead of immediate edit modal)
  // ------------------------
  const onEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    arg.jsEvent.stopPropagation();

    // find the reservation object
    const r = events.find((e) => e.id === arg.event.id);
    if (!r) return;

    // get element coordinates for popover
    const rect = arg.el.getBoundingClientRect();
    // position just beneath left edge of clicked element
    const x = rect.left + window.scrollX;
    const y = rect.bottom + window.scrollY;

    setFlyout({
      reservation: r,
      x,
      y,
      showDetails: false,
      showAddNote: false,
      noteText: r.notes || ""
    });
  };

  // —————————————————————————————————————————————————————————————
  // NEW: “Drag‐and‐Drop” handler. Fires whenever user drags an event
  // horizontally to a new date. We PATCH the updated checkIn/checkOut.
  // —————————————————————————————————————————————————————————————
  const onEventDrop = async (arg: EventDropArg) => {
    const ev = arg.event;
    const reservationId = ev.id;
    // ev.start and ev.end are JS Dates corresponding to the new “noon-to-noon” times,
    // so we must convert them back to pure “YYYY-MM-DD” strings for our database.
    const newStart: Date = ev.start!; // guaranteed present when drop occurs
    const newEnd: Date = ev.end!; // guaranteed present when drop occurs

    // Turn “noon‐time” JS Date into “YYYY-MM-DD” string
    const toYMD = (d: Date) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    };

    // Build patch payload
    const patchBody = {
      checkIn: toYMD(newStart),
      checkOut: toYMD(newEnd)
    };

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody)
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to update booking dates");
      }
      toast.success("Booking dates updated!");

      // Immediately update local state so the calendar re‐renders with fresh data
      const updatedReservation: Reservation = await res.json();
      setEvents((all) =>
        all.map((r) =>
          r.id === reservationId
            ? {
                ...r,
                checkIn: updatedReservation.checkIn,
                checkOut: updatedReservation.checkOut
              }
            : r
        )
      );

      // If the “View Details” modal is currently open for this reservation, update it immediately:
      if (viewReservation?.id === reservationId) {
        setViewReservation((prev) =>
          prev
            ? {
                ...prev,
                checkIn: updatedReservation.checkIn,
                checkOut: updatedReservation.checkOut
              }
            : prev
        );
      }
      // Tell FullCalendar to re‐fetch, in case something else changed
      calendarRef.current?.getApi().refetchEvents();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not update booking"
      );
      // revert visually if API call failed
      arg.revert();
    }
  };

  // ------------------------
  // Create handler
  // ------------------------
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "An unknown error occurred");
    }
  };

  // ------------------------
  // Update handler
  // ------------------------
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "An unknown error occurred");
    }
  };

  // ------------------------
  // Delete (Cancel) handler
  // ------------------------
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Deleted!");
      setFlyout(null);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "An unknown error occurred");
    }
  };

  // ------------------------
  // Check-Out handler (PATCH status)
  // ------------------------
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
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "An unknown error occurred");
    }
  };

  const isToday = (date: Date) => {
    const local = new Date();
    return (
      date.getFullYear() === local.getFullYear() &&
      date.getMonth() === local.getMonth() &&
      date.getDate() === local.getDate()
    );
  };

  return (
    <div ref={containerRef} className="relative p-6">
      <h1 className="text-2xl font-semibold mb-4">Booking Calendar</h1>

      {/* Toolbar */}
      <div className={cn("flex items-center space-x-2 mb-6")} role="toolbar">
        <button onClick={prev} className="px-2 py-1 bg-purple-200 rounded">
          ‹
        </button>
        <button onClick={todayFn} className="px-2 py-1 bg-purple-200 rounded">
          Today
        </button>
        <button onClick={next} className="px-2 py-1 bg-purple-200 rounded">
          ›
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-purple-200 rounded p-1 text-sm"
          title="Select date"
        />
      </div>

      {/* FullCalendar */}
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineCustom"
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        views={{
          resourceTimelineCustom: {
            type: "resourceTimeline",
            duration: { days: 14 }, // still show 14 calendar days in the timeline
            slotDuration: { days: 1 }, // Each slot is a full day
            slotLabelInterval: { days: 1 },
            slotLabelFormat: {
              weekday: "short",
              day: "numeric"
            }
          }
        }}
        editable={true}
        eventDrop={onEventDrop}
        // Event sources: dynamic + today highlight
        eventSources={[
          // 1) Dynamic fetch with visual offset
          async (fetchInfo, successCallback, failureCallback) => {
            try {
              const params = new URLSearchParams({
                start: fetchInfo.startStr,
                end: fetchInfo.endStr
              });
              const res = await fetch(
                `/api/reservations?${params.toString()}`,
                { credentials: "include" }
              );
              const { reservations } = await res.json();
              successCallback(
                reservations.map((r: Reservation) => {
                  return {
                    id: r.id,
                    resourceId: r.roomId,
                    title: r.guestName,
                    start: r.checkIn,
                    end: r.checkOut,
                    allDay: true,
                    // Add custom properties for rendering
                    extendedProps: {
                      isPartialDay: true
                    }
                  };
                })
              );
            } catch (err) {
              failureCallback(err as Error);
            }
          },
          // 2) “Today” highlight
          {
            events: [
              {
                id: "todayHighlight",
                start: startOfToday.toISOString(),
                end: endOfToday.toISOString(),
                display: "background" as const,
                rendering: "background" as const,
                backgroundColor: "#8cc182",
                overlap: false,
                allDay: true
              }
            ]
          },
          // Weekend highlight
          (info, successCallback) => {
            const events = [];
            const start = new Date(info.start);
            const end = new Date(info.end);

            // Loop through each day in the range
            for (
              let day = new Date(start);
              day < end;
              day.setDate(day.getDate() + 1)
            ) {
              const dayOfWeek = day.getDay();
              // If it's Friday (5), Saturday (6), or Sunday (0)
              if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
                const dayStart = new Date(day);
                const dayEnd = new Date(day);
                dayEnd.setDate(dayEnd.getDate() + 1); // End is exclusive

                events.push({
                  id: `weekend-${dayStart.toISOString()}`,
                  start: dayStart.toISOString(),
                  end: dayEnd.toISOString(),
                  display: "background",
                  backgroundColor: "#fce7f3", // pink-100 equivalent
                  classNames: ["weekend-highlight"],
                  allDay: true
                });
              }
            }

            successCallback(events);
          }
        ]}
        eventDidMount={(info) => {
          if (info.event.display === "background") return;

          // Apply custom styling for partial day events
          if (info.event.extendedProps.isPartialDay) {
            // Get the column width by examining the grid
            const dayCol = document.querySelector(".fc-timeline-slot");
            const colWidth = dayCol ? dayCol.clientWidth : 100; // fallback to 100px

            // Apply fixed pixel margin instead of percentage
            info.el.style.marginLeft = `${colWidth * 0.2}px`; // 20% of one column width

            // FullCalendar's default behavior is to make the event end at the start of the checkout day
            // We need to extend it to the middle of the checkout day (80% of the way through)
            const originalWidth = info.el.clientWidth;
            info.el.style.width = `${originalWidth + colWidth * 0.8}px`;

            info.el.style.borderRadius = "4px";
          }

          info.el.style.minHeight = "24px";
          info.el.style.whiteSpace = "normal";
          info.el.style.padding = "2px 4px";
        }}
        headerToolbar={false}
        navLinks={false}
        weekends={true}
        slotDuration={{ hours: 12 }}
        slotLabelInterval={{ days: 1 }}
        slotLabelContent={(args) => {
          if (args.date.getHours() === 0) {
            return (
              <div className="flex flex-col items-center px-2 py-1 text-sm">
                <div className="font-medium">
                  {args.date.toLocaleDateString(undefined, { month: "short" })}
                </div>
                <div>
                  {args.date.toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric"
                  })}
                </div>
              </div>
            );
          }
          return <span />;
        }}
        eventClick={onEventClick}
        dayHeaderContent={(args) => (
          <span
            className={cn(
              args.date.toLocaleDateString("en-CA") === selectedDate &&
                "bg-purple-300",
              isToday(args.date) && "bg-[#8cc182]",
              "px-2 py-1 text-sm"
            )}
          >
            {args.date.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric"
            })}
          </span>
        )}
        resources={resources}
        eventContent={(arg) => {
          if (arg.event.display === "background") return null;
          return (
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
          );
        }}
        dateClick={onDateClick}
        resourceAreaHeaderContent="All Room Types"
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
          if (isToday(date)) cls.push("bg-[#8cc182]");
          return cls;
        }}
        resourceLaneClassNames={({ resource }) =>
          resource.id === selectedResource ? ["bg-blue-50"] : []
        }
        height="auto"
        slotMinWidth={50}
      />

      {/* --------------- FLYOUT MENU --------------- */}
      {flyout && (
        <div
          ref={flyoutRef}
          className="absolute bg-yellow-50 outline-1 outline-gray-500 rounded-xl shadow-lg w-50 z-50 text-sm"
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
                className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                <EyeIcon className="h-4 w-4 mr-2 text-gray-600" />
                View Details
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  handleCheckOut(flyout.reservation.id);
                }}
                className="flex items-center w-full text-left px-4 py-2 hover:bg-[#f3ddff]"
              >
                <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                Check Out
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setEditingReservation(flyout.reservation);
                  setFlyout(null);
                }}
                className="flex items-center w-full text-left px-4 py-2 hover:bg-[#f3ddff]"
              >
                <PencilIcon className="h-4 w-4 mr-2 text-blue-600" />
                Modify Booking
              </button>
            </li>
            <li>
              <button
                onClick={() => handleDelete(flyout.reservation.id)}
                className="flex items-center w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
              >
                <XCircleIcon className="h-4 w-4 mr-2 text-red-600" />
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
                className="flex items-center w-full text-left px-4 py-2 hover:bg-[#f3ddff]"
              >
                <PencilSquareIcon className="h-4 w-4 mr-2 text-indigo-600" />
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

      {/* --------------- CREATE MODAL --------------- */}
      <Dialog
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        className="fixed inset-0 z-50"
      >
        <div className="flex items-center justify-center min-h-screen bg-black/70 p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">
              New Booking
            </Dialog.Title>
            {selectedSlot && (
              <form onSubmit={handleCreate} className="space-y-4 text-sm">
                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    {selectedSlot.roomName}
                  </div>
                </div>
                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
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
                      className="block text-sm font-medium text-gray-700"
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
                      className="block text-sm font-medium text-gray-700"
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
                    <label className="block text-sm font-medium text-gray-700">
                      Adults
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-8 text-lg font-bold text-gray-600"
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
                        className="w-8 text-lg font-bold text-gray-600"
                        title="Increase adults"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Children
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-8 text-lg font-bold text-gray-600"
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
                        className="w-8 text-lg font-bold text-gray-600"
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
                    className="mr-2 px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
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
          <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">
              Edit Booking
            </Dialog.Title>
            {editingReservation && (
              <form onSubmit={handleUpdate} className="space-y-4 text-sm">
                {/* Room (read‐only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded" title="Room">
                    {
                      resources.find((r) => r.id === editingReservation.roomId)
                        ?.title
                    }
                  </div>
                </div>
                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
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
                    <label className="block text-sm font-medium text-gray-700">
                      Adults
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-8 text-lg font-bold text-gray-600"
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
                        className="w-8 text-lg font-bold text-gray-600"
                        title="Increase adults"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Children
                    </label>
                    <div className="mt-1 flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-8 text-lg font-bold text-gray-600"
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
                        className="w-8 text-lg font-bold text-gray-600"
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
                      className="mr-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
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
          <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-sm">
            <Dialog.Title className="text-lg font-bold mb-2">
              Reservation Details
            </Dialog.Title>
            {viewReservation && (
              <div className="space-y-3">
                {/* Guest Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Guest:
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    {viewReservation.guestName}
                  </div>
                </div>

                {/* Check‐In / Check‐Out */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Check-In:
                    </label>
                    <div className="mt-1 p-2 bg-gray-100 rounded">
                      {new Date(viewReservation.checkIn).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Check-Out:
                    </label>
                    <div className="mt-1 p-2 bg-gray-100 rounded">
                      {new Date(viewReservation.checkOut).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </div>
                  </div>
                </div>

                {/* Total Nights */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Nights:
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    {Math.ceil(
                      (new Date(viewReservation.checkOut).getTime() -
                        new Date(viewReservation.checkIn).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}
                  </div>
                </div>

                {/* Rate Plan */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Rate Plan:
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    {viewReservation.ratePlan || "—"}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Status:
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    {viewReservation.status || "—"}
                  </div>
                </div>

                {/* Room Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Room:
                  </label>
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    {viewReservation.roomNumber || "—"}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Notes:
                  </label>
                  <textarea
                    readOnly
                    value={viewReservation.notes || "No notes available."}
                    className="mt-1 block w-full border border-gray-300 rounded p-2 text-xs bg-gray-50"
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
      {/* ──────────────────────────────────────────────────────────────────────────────── */}
    </div>
  );
}
