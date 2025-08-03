"use client";
import React, { useMemo } from "react";
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
import { useRatesData } from "@/lib/hooks/useRatesData";
import { addDays, format } from "date-fns";

interface CalendarResource {
  id: string;
  title: string;
  order?: string;
  children?: CalendarResource[];
}

interface CalendarViewRowStyleProps {
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

export default function CalendarViewRowStyle({
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
}: CalendarViewRowStyleProps) {
  // State to track calendar view changes
  const [calendarStartDate, setCalendarStartDate] = React.useState(
    () => new Date(selectedDate)
  );

  // Update calendar start date when selectedDate changes or calendar view changes
  React.useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      const view = api.view;
      const start = view.activeStart;
      if (start) {
        setCalendarStartDate(start);
        return;
      }
    }
    // Fallback to selectedDate
    setCalendarStartDate(new Date(selectedDate));
  }, [selectedDate, calendarRef]);

  // Fetch rates data for the 14-day calendar view
  const { data: ratesData, isLoading: ratesLoading } = useRatesData(
    calendarStartDate,
    14, // 14 days to match calendar duration
    "base" // Using base rate plan
  );

  // Create a mapping between calendar room types and database room type names
  const roomTypeMapping = useMemo(() => {
    return {
      Standard: "Standard Room",
      Deluxe: "Deluxe Room",
      Suite: "Executive Suite",
      Presidential: "Presidential Suite"
    };
  }, []);

  // Create a lookup map for rates by room type and date
  const ratesLookup = useMemo(() => {
    if (!ratesData || ratesData.length === 0) return {};

    const lookup: Record<string, Record<string, number>> = {};

    ratesData.forEach((roomTypeRates) => {
      // Find the calendar room type that maps to this database room type name
      const calendarRoomType = Object.keys(roomTypeMapping).find(
        (key) =>
          roomTypeMapping[key as keyof typeof roomTypeMapping] ===
          roomTypeRates.roomTypeName
      );

      if (calendarRoomType) {
        lookup[calendarRoomType] = {};
        Object.entries(roomTypeRates.dates).forEach(([dateStr, rateData]) => {
          lookup[calendarRoomType][dateStr] = rateData.finalPrice;
        });
      }
    });

    return lookup;
  }, [ratesData, roomTypeMapping]);

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
      // Listen for view changes to update calendar start date
      datesSet={(dateInfo) => {
        setCalendarStartDate(dateInfo.start);
      }}
      // Enhanced styling for parent resources (room type headers)
      resourceGroupLabelClassNames="font-bold text-purple-800 bg-white dark:bg-purple-900 dark:text-white py-3 border-b-2 border-purple-200"
      // Enhanced content for parent resource rows with more detailed info
      resourceGroupLabelContent={(info) => (
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-semibold">{info.groupValue}</span>
            <span className="text-sm text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded-full">
              {info.resource?.getChildren()?.length || 0} rooms
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
            >
              Add Room
            </button>
            <button
              type="button"
              className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 px-3 py-1 rounded-md transition-colors"
            >
              Analytics
            </button>
          </div>
        </div>
      )}
      // Enhanced resource area width for better visibility
      resourceAreaWidth="320px"
      resourcesInitiallyExpanded={true}
      // Enhanced background for parent resources with white background AND pricing values
      resourceLaneContent={(info) => {
        // Only add content to parent resources (room type rows)
        if (!info.resource.getParent()) {
          const calendarRoomType = info.resource.title; // This is like "Standard", "Deluxe", etc.
          const roomTypeRates = ratesLookup[calendarRoomType];

          // Show pricing for room types that have rates data, otherwise show test values
          return (
            <div className="h-full w-full absolute top-0 left-0 pointer-events-none z-0">
              <div className="h-full w-full !bg-white dark:!bg-gray-800 border-b-2 border-purple-200 dark:border-purple-700 flex">
                {/* Create 14 day columns with pricing values */}
                {Array.from({ length: 14 }, (_, i) => {
                  let displayPrice;

                  if (roomTypeRates && !ratesLoading) {
                    // Use real rates data if available
                    const currentDate = addDays(calendarStartDate, i);
                    const dateStr = format(currentDate, "yyyy-MM-dd");
                    const price = roomTypeRates[dateStr];
                    displayPrice =
                      price !== undefined ? `₹${Math.round(price)}` : "--";
                  } else {
                    // Fallback to test values for demonstration
                    const basePrice =
                      calendarRoomType === "Standard"
                        ? 2500
                        : calendarRoomType === "Deluxe"
                        ? 3500
                        : calendarRoomType === "Suite"
                        ? 5500
                        : calendarRoomType === "Presidential"
                        ? 12000
                        : 1000;
                    displayPrice = `₹${basePrice + i * 100}`;
                  }

                  return (
                    <div
                      key={i}
                      className="flex-1 h-full flex items-center justify-center border-r border-gray-200 dark:border-gray-600"
                    >
                      {ratesLoading ? (
                        <div className="text-blue-500 dark:text-blue-400 font-bold text-sm">
                          ...
                        </div>
                      ) : (
                        <div className="text-green-600 dark:text-green-400 font-bold text-lg">
                          {displayPrice}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      }}
      // Enhanced styling for resource lanes (rows)
      resourceLaneClassNames={(info) => {
        const classes = [];

        // Enhanced styling for parent resources (room type rows)
        if (!info.resource.getParent()) {
          classes.push("parent-resource-row", "!bg-white", "dark:!bg-gray-800");
        }

        // Add a class for the selected resource
        if (info.resource.id === selectedResource) {
          classes.push("bg-blue-50 dark:bg-blue-900/30");
        }

        // Enhanced bottom border for room type separation
        if (
          info.resource.getChildren().length > 0 &&
          !info.resource.getParent()
        ) {
          classes.push("border-b-2 border-purple-200 dark:border-purple-800");
        }

        return classes;
      }}
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
        // Don't apply payment status classes to background events (weekend/today highlights)
        if (event.display === "background") {
          // Allow specific background event classes but no payment status classes
          return [];
        }

        const status = event.extendedProps.status as string | undefined;
        const paymentStatus = event.extendedProps.paymentStatus as
          | "PAID"
          | "PARTIALLY_PAID"
          | "UNPAID"
          | "UNKNOWN";

        // Prioritize payment status over reservation status for color coding
        if (paymentStatus === "PAID") return ["paid"];
        if (paymentStatus === "PARTIALLY_PAID") return ["partially_paid"];
        if (paymentStatus === "UNPAID") return ["unpaid"];

        // Fallback to reservation status if no payment status
        if (status === "CHECKED_IN") return ["checked_in_date"];
        if (status === "CHECKED_OUT") return ["checked_out_date"];
        if (status === "PENDING") return ["pending_booking"];

        // Default fallback for non-background events only
        return ["unpaid"];
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
      resourceAreaHeaderContent={<div className="pl-2">Room Types & Rooms</div>}
      resourceAreaHeaderClassNames={[
        "bg-white dark:bg-gray-900 text-gray-900 dark:text-white pl-6"
      ]}
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
        // Highlight Friday (5) and Saturday (6) only - no Sunday
        if (dow === 5 || dow === 6) cls.push("bg-pink-100");
        if (date.toLocaleDateString("en-CA") === selectedDate)
          cls.push("bg-blue-100");
        if (isToday(date)) cls.push("bg-[#008080]");
        return cls;
      }}
      height="auto"
      slotMinWidth={80} // Increased for better visibility of daily info
    />
  );
}
