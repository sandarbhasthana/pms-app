"use client";
import React from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventSourceInput,
  EventClickArg,
  EventDropArg
} from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import { cn } from "@/lib/utils";

interface CalendarResource {
  id: string;
  title: string;
}

interface CalendarViewProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  resources: CalendarResource[];
  eventSources: EventSourceInput[];
  handleEventClick: (arg: EventClickArg) => void;
  handleDateClick: (arg: DateClickArg) => void;
  handleEventDrop: (arg: EventDropArg) => void;
  selectedDate: string;
  selectedResource: string | null;
  holidays: Record<string, string>;
  isToday: (date: Date) => boolean;
  setSelectedResource: (id: string) => void;
}

export default function CalendarView({
  calendarRef,
  resources,
  eventSources,
  handleEventClick,
  handleDateClick,
  handleEventDrop,
  selectedDate,
  selectedResource,
  holidays,
  isToday,
  setSelectedResource
}: CalendarViewProps) {
  return (
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
        const paymentStatus = event.extendedProps.paymentStatus as
          | "PAID"
          | "PARTIALLY_PAID"
          | "UNPAID"
          | "UNKNOWN";

        console.log(
          "Event class names - Title:",
          event.title,
          "Status:",
          status,
          "PaymentStatus:",
          paymentStatus
        );

        // Prioritize payment status over reservation status for color coding
        if (paymentStatus === "PARTIALLY_PAID") return ["partially_paid"];
        if (paymentStatus === "UNPAID") return ["pending_booking"];
        if (paymentStatus === "PAID") return ["paid"];

        // Fallback to reservation status if no payment status
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
  );
}
