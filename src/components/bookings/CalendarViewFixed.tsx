// FIXED VERSION - Optimized CalendarView for bookings-fixed page
"use client";
import React, { useCallback, useMemo, useEffect } from "react";
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
  order?: string;
  children?: CalendarResource[];
}

interface CalendarViewFixedProps {
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

export default function CalendarViewFixed({
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
}: CalendarViewFixedProps) {
  // FIXED: One-time debug log on component mount
  useEffect(() => {
    // Component mounted
  }, [resources]);
  // FIXED: Memoized stable occupancy data to prevent random re-renders
  const occupancyData = useMemo(() => {
    const data: Record<string, { rate: number; available: number }> = {};
    resources.forEach((resource) => {
      if (resource.children) {
        // Generate stable occupancy data based on resource ID (not random)
        const hash = resource.id.split("").reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0);
          return a & a;
        }, 0);
        const rate = Math.abs(hash % 100);
        const available = Math.max(
          1,
          resource.children.length - Math.abs(hash % resource.children.length)
        );
        data[resource.id] = { rate, available };
      }
    });
    return data;
  }, [resources]);

  // FIXED: Memoized resourceGroupLabelContent to prevent re-creation
  const resourceGroupLabelContent = useCallback(
    (info: any) => (
      <div className="flex items-center justify-between px-2">
        <div>
          <span>{info.groupValue}</span>
          <span className="ml-2 text-xs text-purple-600 dark:text-purple-300">
            ({info.resource?.getChildren()?.length || 0} rooms)
          </span>
        </div>
        <div className="text-xs">
          <button
            type="button"
            className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded-md mr-2"
          >
            Add Room
          </button>
          <button
            type="button"
            className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-md"
          >
            Stats
          </button>
        </div>
      </div>
    ),
    []
  );

  // FIXED: Memoized resourceLaneContent to prevent re-creation
  const resourceLaneContent = useCallback((info: any) => {
    // Only add content to parent resources
    if (!info.resource.getParent()) {
      return (
        <div className="h-full w-full absolute top-0 left-0 pointer-events-none">
          <div className="h-full w-full bg-purple-50/30 dark:bg-purple-900/20"></div>
        </div>
      );
    }
    return null;
  }, []);

  // FIXED: Memoized resourceLaneClassNames to prevent re-creation
  const resourceLaneClassNames = useCallback(
    (info: any) => {
      const classes = [];

      // Add a class for parent resources
      if (!info.resource.getParent()) {
        classes.push("parent-resource-row");
      }

      // Add a class for the selected resource
      if (info.resource.id === selectedResource) {
        classes.push("bg-blue-50 dark:bg-blue-900/30");
      }

      // Add a bottom border to create separation between resource groups
      if (
        info.resource.getChildren().length > 0 &&
        !info.resource.getParent()
      ) {
        classes.push("border-b-2 border-purple-200 dark:border-purple-800");
      }

      return classes;
    },
    [selectedResource]
  );

  // FIXED: Stable dayCellContent with no random values
  const dayCellContent = useCallback(
    (info: any) => {
      // Get the resource for this cell
      const resource = info.resource;

      // Only add content to parent resources
      if (resource && !resource.getParent()) {
        // FIXED: Use stable occupancy data instead of random values
        const data = occupancyData[resource.id];
        if (!data) return null;

        const { rate: occupancyRate, available: availableRooms } = data;

        return (
          <div className="text-xs text-center mt-1 pointer-events-none">
            <div
              className={`font-semibold ${
                occupancyRate > 80
                  ? "text-red-600"
                  : occupancyRate > 50
                  ? "text-orange-600"
                  : "text-green-600"
              }`}
            >
              {occupancyRate}% Occupied
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              {availableRooms} Available
            </div>
          </div>
        );
      }
      return null;
    },
    [occupancyData]
  );

  // FIXED: Memoized slotLabelContent to prevent re-creation
  const slotLabelContent = useCallback(
    (args: any) => {
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
    },
    [holidays]
  );

  // FIXED: Memoized eventDidMount to prevent re-creation
  const eventDidMount = useCallback((info: any) => {
    if (info.event.display === "background") return;
    const { isPartialDay } = info.event.extendedProps as {
      isPartialDay?: boolean;
    };
    if (isPartialDay) {
      const slotEl = document.querySelector(".fc-timeline-slot") as HTMLElement;
      const colW = slotEl?.clientWidth ?? 100;
      info.el.style.marginLeft = `${colW * 0.45}px`;
      info.el.style.width = `${info.el.clientWidth + colW * 0.4}px`;
      info.el.style.borderRadius = "4px";
    }
    info.el.style.minHeight = "24px";
    info.el.style.whiteSpace = "normal";
    info.el.style.padding = "2px 4px";
  }, []);

  // FIXED: Optimized eventClassNames with correct CSS class names
  const eventClassNames = useCallback(({ event }: any) => {
    const status = event.extendedProps.status as string | undefined;
    const paymentStatus = event.extendedProps.paymentStatus as
      | "PAID"
      | "PARTIALLY_PAID"
      | "UNPAID"
      | "UNKNOWN";

    // FIXED: Prioritize payment status over reservation status for color coding
    // These class names match the CSS in globals.css
    if (paymentStatus === "PAID") return ["paid"];
    if (paymentStatus === "PARTIALLY_PAID") return ["partially_paid"];
    if (paymentStatus === "UNPAID") return ["unpaid"];

    // FIXED: Fallback to reservation status if no payment status
    if (status === "CHECKED_IN") return ["checked-in-date"];
    if (status === "CHECKED_OUT") return ["checked-out-date"];
    if (status === "PENDING") return ["pending_booking"];

    // Default fallback for any room type
    return ["unpaid"];
  }, []);

  // FIXED: Memoized dayHeaderContent to prevent re-creation
  const dayHeaderContent = useCallback(
    (args: any) => (
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
    ),
    [selectedDate, isToday]
  );

  // FIXED: Memoized eventContent to prevent re-creation
  const eventContent = useCallback(
    (arg: any) =>
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
      ) : null,
    []
  );

  // FIXED: Memoized resourceLabelContent to prevent re-creation
  const resourceLabelContent = useCallback(
    (info: any) => (
      <span
        onClick={() => setSelectedResource(info.resource.id)}
        className={cn(
          info.resource.id === selectedResource && "bg-blue-50",
          "block px-2 py-1 cursor-pointer text-sm"
        )}
      >
        {info.resource.title}
      </span>
    ),
    [selectedResource, setSelectedResource]
  );

  // FIXED: Memoized slotLabelClassNames to prevent re-creation
  const slotLabelClassNames = useCallback(
    ({ date }: any) => {
      const cls: string[] = [
        "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      ];
      const dow = date.getDay();
      if (dow === 5 || dow === 6 || dow === 0) cls.push("bg-pink-100");
      if (date.toLocaleDateString("en-CA") === selectedDate)
        cls.push("bg-blue-100");
      if (isToday(date)) cls.push("bg-[#008080]");
      return cls;
    },
    [selectedDate, isToday]
  );

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
      resourceOrder="order"
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
      // Add custom styling for parent resources
      resourceGroupLabelClassNames="font-bold text-purple-800 bg-purple-50 dark:bg-purple-900 dark:text-white py-2"
      // FIXED: Use memoized functions
      resourceGroupLabelContent={resourceGroupLabelContent}
      resourceAreaWidth="300px"
      resourcesInitiallyExpanded={true}
      resourceLaneContent={resourceLaneContent}
      resourceLaneClassNames={resourceLaneClassNames}
      dayCellContent={dayCellContent}
      slotLabelContent={slotLabelContent}
      eventDidMount={eventDidMount}
      eventClassNames={eventClassNames}
      dayHeaderContent={dayHeaderContent}
      eventContent={eventContent}
      resourceAreaHeaderContent={
        <div className="pl-2">All Room Types (Fixed)</div>
      }
      resourceAreaHeaderClassNames={[
        "bg-white dark:bg-gray-900 text-gray-900 dark:text-white pl-6"
      ]}
      resourceLabelContent={resourceLabelContent}
      slotLabelClassNames={slotLabelClassNames}
      height="auto"
      slotMinWidth={50}
    />
  );
}
