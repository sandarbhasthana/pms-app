// File: src/app/dashboard/bookings/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { registerLicense } from "@syncfusion/ej2-base";
import {
  ScheduleComponent,
  ResourcesDirective,
  ResourceDirective,
  ViewsDirective,
  ViewDirective,
  HeaderRowsDirective,
  HeaderRowDirective,
  Inject,
  TimelineViews,
  CellClickEventArgs,
  ActionEventArgs,
  EventClickArgs
} from "@syncfusion/ej2-react-schedule";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";
import {
  EyeIcon,
  CheckIcon,
  PencilIcon,
  XCircleIcon,
  PencilSquareIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import "@/app/globals.css";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-schedule/styles/material.css";

// Register Syncfusion license key
registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1NNaF1cVGhOYVJpR2Nbek51flBFal1ZVAciSV9jS3tTcEVmWHlcdHdVRmRbUE90Vg=="
);

interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  checkIn: string; // ISO “YYYY-MM-DD”
  checkOut: string; // ISO “YYYY-MM-DD”
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

interface RoomResource {
  id: string;
  name: string;
  color?: string;
}

export default function BookingsCalendarPage() {
  // Refs
  const scheduleRef = useRef<ScheduleComponent>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // State
  const [resources, setResources] = useState<Room[]>([]);
  const [roomsData, setRoomsData] = useState<RoomResource[]>([]);
  const [events, setEvents] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // For toolbar / date tracking
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Flyout state
  const [flyout, setFlyout] = useState<{
    reservation: Reservation;
    x: number;
    y: number;
    showDetails: boolean;
    showAddNote: boolean;
    noteText: string;
  } | null>(null);

  // Create-modal state
  const [selectedSlot, setSelectedSlot] = useState<{
    roomId: string;
    roomName: string;
    date: string;
  } | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Edit-modal state
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);

  // View-Details modal
  const [viewReservation, setViewReservation] = useState<Reservation | null>(
    null
  );

  // For “today” highlighting in header / cells
  const [today, setToday] = useState(new Date());

  // Compute start/end of today (midnight to midnight)
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // ------------------------------------------------------
  // 1. Load Rooms + Reservations on mount
  // ------------------------------------------------------
  useEffect(() => {
    async function loadAll() {
      try {
        // 1.a Fetch rooms
        const roomsRes = await fetch(`/api/rooms`, { credentials: "include" });
        if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
        const roomsJson = await roomsRes.json();
        type RawRoom = { id: string; name: string; color?: string };
        const rawRooms: RawRoom[] = Array.isArray(roomsJson)
          ? roomsJson
          : roomsJson.rooms;
        setResources(rawRooms.map((r) => ({ id: r.id, title: r.name })));
        setRoomsData(
          rawRooms.map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color ?? undefined
          }))
        );

        // 1.b Fetch reservations (for a 14-day window around “today” by default)
        await loadReservations();
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

  // Fetch reservations helper (reloads state + refreshes Scheduler)
  const loadReservations = async () => {
    try {
      // We’ll load two weeks: from today–7d to today+7d
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const params = new URLSearchParams({
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10)
      });
      const res = await fetch(`/api/reservations?${params.toString()}`, {
        credentials: "include"
      });
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

  // ------------------------------------------------------
  // 2. Sync “today” every minute & on tab focus (for highlighting)
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // 3. Click‐outside listener to close flyout
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // 4. Utility: check if a Date is “today”
  // ------------------------------------------------------
  const isToday = (date: Date) => {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // ------------------------------------------------------
  // 5. Navigation: Prev / Today / Next (one day at a time)
  // ------------------------------------------------------
  const goPrev = () => {
    const sched = scheduleRef.current;
    if (!sched) return;
    // Syncfusion’s built-in method: move one day backward
    const currentDate = new Date(sched.selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    sched.selectedDate = currentDate; // set to previous day
    const newDate = new Date(sched.getCurrentViewDates()[0]);
    setSelectedDate(newDate.toISOString().slice(0, 10));
  };
  const goNext = () => {
    const sched = scheduleRef.current;
    if (!sched) return;
    const currentDate = new Date(sched.selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    sched.selectedDate = currentDate; // set to next day
    const newDate = new Date(sched.getCurrentViewDates()[0]);
    setSelectedDate(newDate.toISOString().slice(0, 10));
  };
  const goToday = () => {
    const sched = scheduleRef.current;
    if (!sched) return;
    sched.selectedDate = new Date();
    const now = new Date();
    setSelectedDate(now.toISOString().slice(0, 10));
  };

  // ------------------------------------------------------
  // 6. “Create” via cellClick (similar to FullCalendar’s dateClick)
  // ------------------------------------------------------
  const onCellClick = (args: CellClickEventArgs) => {
    // args.resource: the clicked room resource
    // args.startTime: a JS Date at midnight of that day
    const roomId = Array.isArray(args.element)
      ? args.element[0]?.parentElement?.getAttribute("data-group-id") || ""
      : args.element?.parentElement?.getAttribute("data-group-id") || "";
    const roomName = roomsData.find((r) => r.id === roomId)?.name || "";
    const date = args.startTime.toISOString().slice(0, 10);

    // Prevent past booking creation:
    const clicked = new Date(date);
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    if (clicked < today0) {
      toast.error("Cannot create bookings in the past.");
      return;
    }

    setSelectedSlot({ roomId, roomName, date });
    setAdults(1);
    setChildren(0);
  };

  // ------------------------------------------------------
  // 7. Drag-and-Drop: update checkIn/checkOut
  // ------------------------------------------------------
  const onActionBegin = async (args: ActionEventArgs) => {
    // When an event is moved or resized, args.requestType === "eventChange"
    if (args.requestType === "eventChange") {
      const changed = Array.isArray(args.data)
        ? (args.data[0] as Record<string, unknown>)
        : (args.data as Record<string, unknown>);
      const reservationId = String(changed.Id);
      // Syncfusion flips start/end to JS Date at midday by default; we want only YYYY-MM-DD
      const toYMD = (d: Date) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
      };
      const newCheckIn = toYMD(changed.StartTime as Date);
      const newCheckOut = toYMD(changed.EndTime as Date);

      try {
        const patchRes = await fetch(`/api/reservations/${reservationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkIn: newCheckIn, checkOut: newCheckOut })
        });
        if (!patchRes.ok) {
          const payload = await patchRes.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to update booking dates");
        }
        toast.success("Booking dates updated!");

        // Update local state so UI stays in sync:
        const updatedReservation: Reservation = await patchRes.json();
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
      } catch (err: unknown) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Could not update booking"
        );
        args.cancel = true; // revert visually
      }
    }
  };

  // ------------------------------------------------------
  // 8. Event click → flyout menu
  // ------------------------------------------------------
  const onEventClick = (args: EventClickArgs) => {
    args.cancel = true; // prevent Syncfusion’s default editor popup
    const reservationId = String((args.event as { Id: string | number }).Id);
    const found = events.find((e) => e.id === reservationId);
    if (!found) return;

    // Compute screen‐coords for popover
    const rect = (
      args.event as { element: HTMLElement }
    ).element.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.bottom + window.scrollY;

    setFlyout({
      reservation: found,
      x,
      y,
      showDetails: false,
      showAddNote: false,
      noteText: found.notes || ""
    });
  };

  // ------------------------------------------------------
  // 9. Create handler (submit new booking)
  // ------------------------------------------------------
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSlot) return;
    const guestName = (e.currentTarget as HTMLFormElement).guestName
      .value as string;
    const checkIn = (e.currentTarget as HTMLFormElement).checkIn
      .value as string;
    const checkOut = (e.currentTarget as HTMLFormElement).checkOut
      .value as string;
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
      await loadReservations();
      scheduleRef.current?.refresh(); // refresh Scheduler
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // ------------------------------------------------------
  // 10. Update handler (edit existing booking)
  // ------------------------------------------------------
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingReservation) return;
    const guestName = (e.currentTarget as HTMLFormElement).guestName
      .value as string;
    const checkIn = (e.currentTarget as HTMLFormElement).checkIn
      .value as string;
    const checkOut = (e.currentTarget as HTMLFormElement).checkOut
      .value as string;

    try {
      const res = await fetch(`/api/reservations/${editingReservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, checkIn, checkOut, adults, children })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Updated!");
      setEditingReservation(null);
      await loadReservations();
      scheduleRef.current?.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // ------------------------------------------------------
  // 11. Delete handler
  // ------------------------------------------------------
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Deleted!");
      setFlyout(null);
      await loadReservations();
      scheduleRef.current?.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // ------------------------------------------------------
  // 12. Check-Out handler (PATCH only status)
  // ------------------------------------------------------
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
      await loadReservations();
      scheduleRef.current?.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    }
  };

  // ------------------------------------------------------
  // 13. Render
  // ------------------------------------------------------
  return (
    <div className="relative p-6">
      <h1 className="text-2xl font-semibold mb-4">Booking Calendar</h1>

      {/* ─────────── Toolbar: Prev / Today / Next / Date Picker ─────────── */}
      <div className={cn("flex items-center space-x-2 mb-6")} role="toolbar">
        <button onClick={goPrev} className="px-2 py-1 bg-purple-200 rounded">
          ‹
        </button>
        <button onClick={goToday} className="px-2 py-1 bg-purple-200 rounded">
          Today
        </button>
        <button onClick={goNext} className="px-2 py-1 bg-purple-200 rounded">
          ›
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            const d = e.target.value;
            setSelectedDate(d);
            const dt = new Date(d);
            scheduleRef.current?.scrollTo(dt.toISOString());
          }}
          className="border border-purple-200 rounded p-1 text-sm"
          title="Select date"
        />
      </div>

      {/* ─────────── Syncfusion Scheduler ─────────── */}
      <ScheduleComponent
        ref={scheduleRef}
        height="auto"
        selectedDate={new Date(selectedDate)}
        // TimelineWeek: 14 days, 1-day slots
        currentView="TimelineWeek"
        group={{ resources: ["Rooms"], byGroupID: false }}
        views={[
          {
            option: "TimelineWeek",
            interval: 14, // show 14-day range
            timeScale: { enable: false },
            workDays: [0, 1, 2, 3, 4, 5, 6]
          }
        ]}
        eventSettings={{
          dataSource: events.map((r) => ({
            Id: Number(r.id),
            Subject: r.guestName,
            StartTime: new Date(r.checkIn),
            EndTime: new Date(r.checkOut),
            IsAllDay: true,
            RoomId: Number(r.roomId)
            // Add custom props for rendering, e.g. ratePlan or status if needed
          })),
          resourceColorField: "color"
        }}
        resourceHeaderTemplate={(props: { resource: { name: string } }) => {
          // Custom resource label, including clickable highlight
          return (
            <div
              className={cn(
                props.resource.name === selectedDate ? "bg-blue-50" : "",
                "px-2 py-1 text-sm cursor-pointer"
              )}
              onClick={() => {
                setSelectedDate(selectedDate);
              }}
            >
              {props.resource.name}
            </div>
          );
        }}
        headerRows={[
          { option: "Date" } // only show “Wed 10”, “Thu 11”, etc.
        ]}
        dateHeaderTemplate={(props: { date: Date }) => {
          // Customize top-header (weekday + day num)
          const dt: Date = props.date;
          return (
            <span
              className={cn(
                dt.toISOString().slice(0, 10) === selectedDate &&
                  "bg-purple-300",
                isToday(dt) && "bg-[#8cc182]",
                "px-2 py-1 text-sm block"
              )}
            >
              {dt.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric"
              })}
            </span>
          );
        }}
        cellTemplate={(props: { date: Date }) => {
          // Customize each day cell: highlight weekends/past
          const dt: Date = props.date;
          const dow = dt.getDay();
          const classes = ["h-full w-full"];
          if (dow === 5 || dow === 6 || dow === 0) classes.push("bg-pink-100");
          if (dt.toISOString().slice(0, 10) === selectedDate)
            classes.push("bg-blue-100");
          if (isToday(dt)) classes.push("bg-[#8cc182]");
          return (
            <div className={classes.join(" ")} style={{ height: "100%" }} />
          );
        }}
        eventClick={onEventClick}
        cellClick={onCellClick}
        actionBegin={onActionBegin}
        dataBound={() => {
          /* Prevent Syncfusion’s built-in popup from showing */
          // No extra action needed; we already canceled in eventClick
        }}
      >
        {/* 1. Define the 14-day timeline view */}
        <ViewsDirective>
          <ViewDirective option="TimelineWeek" />
        </ViewsDirective>

        {/* 2. Header: only “Date” row */}
        <HeaderRowsDirective>
          <HeaderRowDirective option="Date" />
        </HeaderRowsDirective>

        {/* 3. Resources: “Rooms” on leftmost column */}
        <ResourcesDirective>
          <ResourceDirective
            field="RoomId"
            title="Room"
            name="Rooms"
            dataSource={roomsData}
            textField="name"
            idField="id"
            colorField="color"
          />
        </ResourcesDirective>

        {/* 4. Inject TimelineViews service */}
        <Inject services={[TimelineViews]} />
      </ScheduleComponent>

      {/* ─────────── FLYOUT MENU ─────────── */}
      {flyout && (
        <div
          ref={flyoutRef}
          className="absolute bg-yellow-50 outline-1 outline-gray-500 rounded-xl shadow-lg w-50 z-50 text-sm"
          style={{ top: flyout.y - 60, left: flyout.x + 20 }}
        >
          <ul>
            <li>
              <button
                onClick={async () => {
                  setFlyout(null);
                  try {
                    const res = await fetch(
                      `/api/reservations/${flyout.reservation.id}`,
                      {
                        credentials: "include"
                      }
                    );
                    if (!res.ok) {
                      const payload = await res.json().catch(() => ({}));
                      throw new Error(
                        payload.error || "Failed to load reservation"
                      );
                    }
                    const fresh: Reservation = await res.json();
                    setViewReservation(fresh);
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
                title="View Details"
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
                title="Check Out"
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
                title="Modify Booking"
              >
                <PencilIcon className="h-4 w-4 mr-2 text-blue-600" />
                Modify Booking
              </button>
            </li>
            <li>
              <button
                onClick={() => handleDelete(flyout.reservation.id)}
                className="flex items-center w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                title="Cancel Booking"
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
                title="Add Note"
              >
                <PencilSquareIcon className="h-4 w-4 mr-2 text-indigo-600" />
                Add Note
              </button>
            </li>
          </ul>

          {/* Inline “Add Note” section */}
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
                    const updatedReservation: Reservation = await res.json();
                    // Update viewDetails if open
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
                    // Update events state
                    setEvents((all) =>
                      all.map((r) =>
                        r.id === flyout.reservation.id
                          ? {
                              ...r,
                              notes:
                                updatedReservation.notes ??
                                flyout.noteText.trim()
                            }
                          : r
                      )
                    );
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
        </div>
      )}

      {/* ─────────── CREATE MODAL ─────────── */}
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
                {/* Room (read-only) */}
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
                      defaultValue={new Date(
                        new Date(selectedSlot.date).getTime() + 86400000
                      )
                        .toISOString()
                        .slice(0, 10)}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    />
                  </div>
                </div>
                {/* Steppers: Adults / Children */}
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
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ─────────── EDIT / DELETE MODAL ─────────── */}
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
                {/* Room (read-only) */}
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
                    <label
                      htmlFor="editCheckIn"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Check-In
                    </label>
                    <input
                      id="editCheckIn"
                      type="date"
                      name="checkIn"
                      defaultValue={editingReservation.checkIn}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                      title="Check-In Date"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="editCheckOut"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Check-Out
                    </label>
                    <input
                      id="editCheckOut"
                      type="date"
                      name="checkOut"
                      defaultValue={editingReservation.checkOut}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                      title="Check-Out Date"
                    />
                  </div>
                </div>
                {/* Steppers: Adults / Children */}
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
                  >
                    Delete
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setEditingReservation(null)}
                      className="mr-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
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

      {/* ─────────── VIEW DETAILS MODAL ─────────── */}
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
                {/* Check-In / Check-Out */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Check-In:
                    </label>
                    <div className="mt-1 p-2 bg-gray-100 rounded">
                      {new Date(viewReservation.checkIn).toLocaleDateString(
                        undefined,
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric"
                        }
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
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric"
                        }
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
    </div>
  );
}
