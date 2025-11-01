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

interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status?: string;
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
  events: Reservation[];
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
  setSelectedResource,
  events
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
  const {
    data: ratesData,
    isLoading: ratesLoading,
    error: ratesError
  } = useRatesData(
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

  // Calculate room occupancy for each room type and date
  const calculateOccupancy = useMemo(() => {
    return (
      roomType: string,
      date: Date
    ): { occupied: number; total: number } => {
      const dateStr = format(date, "yyyy-MM-dd");

      // Find the resource group for this room type
      const resourceGroup = resources.find((r) => r.title === roomType);
      const totalRooms = resourceGroup?.children?.length || 0;

      // Count occupied rooms for this room type on this date
      // TODO: Update to use operational day boundaries (6 AM start) when timezone is available
      const occupiedRooms = events.filter((event) => {
        // Check if this reservation overlaps with the given date
        // Parse dates consistently using UTC to avoid timezone mismatches
        const checkIn = new Date(event.checkIn);
        const checkOut = new Date(event.checkOut);

        // Create target date at UTC midnight to match the API date format
        // NOTE: This should use operational day boundaries (6 AM) instead of midnight
        const [year, month, day] = dateStr.split("-").map(Number);
        const targetDate = new Date(Date.UTC(year, month - 1, day));

        // Check if the room belongs to this room type
        const roomBelongsToType = resourceGroup?.children?.some(
          (child) => child.id === event.roomId
        );

        // Check if the date falls within the reservation period
        // Using UTC midnight for now - should use operational day boundaries
        const dateInRange = targetDate >= checkIn && targetDate < checkOut;

        return (
          roomBelongsToType &&
          dateInRange &&
          (event.status === "CONFIRMED" || event.status === "CHECKED_IN")
        );
      }).length;

      // Calculate available rooms (total - occupied)
      const availableRooms = totalRooms - occupiedRooms;

      return { occupied: availableRooms, total: totalRooms };
    };
  }, [resources, events]);

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
      resourceGroupLabelClassNames="room-type-header font-bold text-xl text-purple-800 bg-white dark:bg-purple-900 dark:text-white py-4 border-b-2 border-purple-200 uppercase tracking-wide"
      // Enhanced content for parent resource rows with more detailed info
      resourceGroupLabelContent={(info) => (
        <div
          className="flex items-center justify-between px-3"
          data-group="true"
        >
          <div className="flex items-center space-x-3">
            <span
              className="room-type-title text-xl font-bold uppercase tracking-wide"
              data-group="true"
              style={{
                fontSize: "1.25rem",
                textTransform: "uppercase",
                fontWeight: "bold"
              }}
            >
              {info.groupValue}
            </span>
            <span className="font-bold text-sm text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded-full">
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
      resourceAreaWidth="320px"
      resourcesInitiallyExpanded={true}
      resourceLaneContent={(info) => {
        // Only add content to parent resources (room type rows)
        if (!info.resource.getParent()) {
          const calendarRoomType = info.resource.title;
          const roomTypeRates = ratesLookup[calendarRoomType];

          // Show pricing for room types that have rates data
          return (
            <div className="h-full w-full absolute top-0 left-0 pointer-events-none z-0">
              <div className="h-full w-full !bg-white dark:!bg-gray-800 border-b-2 border-purple-200 dark:border-purple-700 flex">
                {/* Create 14 day columns with pricing values */}
                {Array.from({ length: 14 }, (_, i) => {
                  let displayPrice;

                  if (ratesError) {
                    // Show error state when rates data fails to load
                    displayPrice = "Error";
                  } else if (roomTypeRates && !ratesLoading) {
                    // Use real rates data if available
                    const currentDate = addDays(calendarStartDate, i);
                    const dateStr = format(currentDate, "yyyy-MM-dd");
                    const price = roomTypeRates[dateStr];
                    displayPrice =
                      price !== undefined ? `₹${price.toFixed(2)}` : "--";
                  } else if (ratesLoading) {
                    // Show loading state
                    displayPrice = "...";
                  } else {
                    // No data available
                    displayPrice = "--";
                  }

                  // Calculate occupancy for this room type and date
                  const currentDate = addDays(calendarStartDate, i);
                  const occupancy = calculateOccupancy(
                    calendarRoomType,
                    currentDate
                  );

                  return (
                    <div
                      key={i}
                      className="flex-1 h-full flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-600"
                    >
                      {ratesLoading ? (
                        <div className="text-blue-500 dark:text-blue-400 font-bold text-sm">
                          ...
                        </div>
                      ) : ratesError ? (
                        <div className="text-red-500 dark:text-red-400 font-bold text-sm">
                          Error
                        </div>
                      ) : (
                        <>
                          {/* Room count display */}
                          <div className="text-gray-600 dark:text-gray-400 text-xs font-medium">
                            {occupancy.occupied}/{occupancy.total}
                          </div>
                          {/* Price display */}
                          <div className="text-green-600 dark:text-green-400 font-bold text-xs">
                            {displayPrice}
                          </div>
                        </>
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

        // // Add a class for the selected resource
        // if (info.resource.id === selectedResource) {
        //   classes.push("bg-blue-50 dark:bg-blue-900/30");
        // }

        // Enhanced bottom border for room type separation
        if (
          info.resource.getChildren().length > 0 &&
          !info.resource.getParent()
        ) {
          classes.push(
            "border-b-2 border-white dark:border-gray-200 dark:border-gray-300"
          );
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
            {name && (
              <div title={name} className="cursor-help">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  className="w-4 h-4 mt-0.5"
                >
                  <g fill="#00f4a8">
                    <path d="M181.353 202.389s14.871 49.664 3.024 98.339l2.194 3.761c22.43-23.163 46.808-64.273 1.992-109.454l-1.224-.415-5.985 1.949v5.82zM196.997 184.061s50.221 23.179 83.444 75.203l4.16 3.148c.753-37.124-11.402-91.524-89.362-90.539l-1.654 1.307-1.052 5.165zM110.003 7.107l-1.23 5.945s55.234 76.689 47.457 143.606l1.62 1.906 6.525-3.691 1.092-1.872c40.271-90.728-12.664-129.667-55.464-145.894zM28.817 99.586s57.093 9.193 92.462 40.996c2.245 2.019 4.346 3.904 6.317 5.671l10.681-3.313 1.769-1.915c-31.067-64.08-78.114-59.339-111.229-44.896zM71.258 168.608c-29.932 4.807-42.094 53.483-42.094 53.483l1.744 2.741c31.124-29.515 61.923-41.057 83.716-45.419l1.161-2.016-.578-10.774c-7.454-.708-23.001-1.38-43.949 1.985z" />
                  </g>
                  <path
                    fill="#00e49d"
                    d="M32.247 98.183c-1.506-.277-2.649-1.048-3.43-2.054-9.242 4.031-17.4 8.817-23.821 13.074-4.694 3.111-2.401 10.381 3.229 10.288 52.201-.858 87.932 15.554 108.634 29.361h2.36l10.783-3.345c-18.089-17.181-49.162-38.379-97.755-47.324zM160.468 156.217c.99-30.767-5.127-87.07-50.465-149.11-7.971-3.022-15.591-5.258-22.191-6.892-6.531-1.617-11.076 6.274-6.446 11.155 49.105 51.759 60.916 102.81 63.348 131.013l1.245 2.187 11.89 13.993 2.913-1.648z"
                  />
                  <path
                    fill="#00f4a8"
                    d="M317.199 171.86s-36.243-41.368-76.677-39.05c-27.423 1.572-48.909 17.077-59.906 26.898l10.214 6.905 2.753.388c26.356-6.441 69.691-10.094 123.617 10.7v-5.841z"
                  />
                  <path
                    fill="#00e49d"
                    d="M183.276 161.506c60.392-49.896 108.459-13.729 133.923 16.194.497.192.989.371 1.489.567 5.784 2.271 10.962-4.358 7.313-9.387-23.185-31.951-80.633-90.135-154.758-16.468l1.459 1.945zM192.345 179.266l-2.302 11.307.646 2.035c21.659 10.679 56.782 34.942 82.265 86.807 2.483 5.054 9.999 3.783 10.63-1.813a164.82 164.82 0 0 0 1.047-17.702c-31.117-49.416-68.811-71.254-92.286-80.634zM30.908 224.832c9.507-28.456 32.14-66.152 84.436-55.657l-.72-13.428-1.24-1.935c-63.461-15.254-85.043 38.599-91.927 67.158-1.189 4.934 4.785 8.326 8.445 4.81.335-.322.67-.63 1.006-.948zM186.663 302.523c11.784-49.063 2.387-85.35-6.287-105.636l-9.842 3.205-2.571 2.126c7.578 20.649 15.152 57.621.5 106.333-1.462 4.86 4.28 8.633 8.13 5.326a149.931 149.931 0 0 0 9.977-9.388 5.222 5.222 0 0 1 .093-1.966z"
                  />
                  <path
                    fill="#60b9fe"
                    d="M503.91 382.813a38.981 38.981 0 0 1-19.877 5.413c-10.866 0-20.697-4.423-27.794-11.567a10.799 10.799 0 0 0-15.346 0c-7.098 7.143-16.928 11.567-27.795 11.567s-20.697-4.423-27.794-11.567a10.799 10.799 0 0 0-15.346 0c-7.098 7.143-16.928 11.567-27.795 11.567-10.866 0-20.697-4.423-27.794-11.567-3.975-4-10.26-4.25-14.523-.749v8.262l40.042 71.597H506.01l5.991-13.92v-54.472c-.001-4.154-4.514-6.675-8.091-4.564z"
                  />
                  <path
                    fill="#1ca8ff"
                    d="M299.021 376.659c-7.098 7.143-16.928 11.567-27.795 11.567-1.224 0-2.432-.064-3.627-.173v2.043l49.691 62.262 4.725 3.412h34.817c-14.422-29.981-33.801-56.918-56.988-79.86-.283.233-.558.483-.823.749z"
                  />
                  <path
                    fill="#8bcaff"
                    d="M484.033 453.593c-10.866 0-20.697-4.423-27.794-11.567a10.799 10.799 0 0 0-15.346 0c-7.098 7.143-16.928 11.567-27.795 11.567s-20.697-4.423-27.794-11.567a10.799 10.799 0 0 0-15.346 0 39.15 39.15 0 0 1-16.899 10.019l16.585 55.925 7.476 4.03h121.163c7.575 0 13.716-6.141 13.716-13.717v-56.434c-7.112 7.245-17.011 11.744-27.966 11.744z"
                  />
                  <path
                    fill="#60b9fe"
                    d="M374.845 503.767a287.02 287.02 0 0 0-20.099-52.252 39.1 39.1 0 0 1-12.584 2.077c-10.866 0-20.697-4.423-27.794-11.567a10.79 10.79 0 0 0-1.246-1.062v1.5l27.585 65.459 4.35 4.077h32.063z"
                  />
                  <path
                    fill="#ffc365"
                    d="M429.606 218.664c-17.261 7.761-29.29 25.087-29.29 45.24s12.029 37.479 29.29 45.24c19.008-6.254 32.737-24.138 32.737-45.24s-13.729-38.987-32.737-45.24z"
                  />
                  <path
                    fill="#ffa90f"
                    d="M401.575 263.904c0-20.22 12.607-37.485 30.384-44.395a47.489 47.489 0 0 0-17.244-3.232c-26.304 0-47.628 21.324-47.628 47.628s21.324 47.628 47.628 47.628a47.489 47.489 0 0 0 17.244-3.232c-17.777-6.912-30.384-24.177-30.384-44.397z"
                  />
                  <path
                    fill="#ffc365"
                    d="M503.139 271.63H490.52a7.726 7.726 0 1 1 0-15.452h12.619a7.726 7.726 0 1 1 0 15.452zM338.909 271.63H326.29a7.726 7.726 0 1 1 0-15.452h12.619a7.726 7.726 0 1 1 0 15.452zM462.854 215.764a7.725 7.725 0 0 1 0-10.926l8.923-8.923a7.726 7.726 0 0 1 10.926.001 7.726 7.726 0 0 1 0 10.927l-8.923 8.922a7.726 7.726 0 0 1-10.926-.001zM346.726 331.894a7.725 7.725 0 0 1 0-10.926l8.923-8.923a7.727 7.727 0 0 1 10.927-.001 7.725 7.725 0 0 1 0 10.926l-8.923 8.924a7.727 7.727 0 0 1-10.927 0zM414.715 195.824a7.726 7.726 0 0 1-7.726-7.726v-12.619a7.726 7.726 0 1 1 15.452 0v12.619a7.726 7.726 0 0 1-7.726 7.726zM414.715 360.055a7.726 7.726 0 0 1-7.726-7.726V339.71a7.726 7.726 0 1 1 15.452 0v12.619a7.726 7.726 0 0 1-7.726 7.726zM355.649 215.765l-8.923-8.922a7.726 7.726 0 0 1 10.926-10.928l8.923 8.923a7.727 7.727 0 0 1-10.926 10.927zM471.777 331.893l-8.923-8.924a7.725 7.725 0 0 1 0-10.926 7.727 7.727 0 0 1 10.927.001l8.923 8.923a7.726 7.726 0 0 1-10.927 10.926z"
                  />
                  <path
                    fill="#ffdda8"
                    d="m115.234 323.998-17.993 10.159-29.278-2.173-4.387-6.474a256.489 256.489 0 0 0-30.892 5.979v169.179c0 5.055 3.077 9.422 7.449 11.332h304.924c-28.504-103.135-119.586-180.278-229.823-188.002z"
                  />
                  <path
                    fill="#ffc365"
                    d="M34.744 500.668V330.956a255.341 255.341 0 0 0-25.595 7.792A13.886 13.886 0 0 0 0 351.799v51.95l6.242 5.233.687 64.214L0 484.284v13.844C0 505.789 6.211 512 13.872 512h28.321c-4.372-1.911-7.449-6.278-7.449-11.332z"
                  />
                  <path
                    fill="#dd8858"
                    d="m149.093 184.061-4.59.932-4.458 17.398-65.593 126.461-69.068 96.785L0 439.959v44.325c106.332-100.578 146.276-228.731 159.354-284.707v-3.283z"
                  />
                  <path
                    fill="#cb6c35"
                    d="m148.905 184.099-15.393 3.127-3.218 2.803C119.537 227.742 87.661 310.911 0 403.749v36.21c100.663-111.536 136.562-208.829 148.905-255.86z"
                  />
                  <path
                    fill="#938493"
                    d="M180.82 154.481c-11.311 5.538-17.067 18.717-12.973 30.992 2.252 6.754 7.059 11.928 12.983 14.834 6.272-2.73 11.405-8.007 13.739-15.007 4.132-12.389-1.985-25.723-13.749-30.819z"
                  />
                  <path
                    fill="#7b6c79"
                    d="M168.137 185.301c-4.069-12.201 1.801-25.32 13.216-30.583a25.219 25.219 0 0 0-2.584-1.027c-7.05-2.351-14.404-1.38-20.376 2.056l-1.638 1.787-8.86 27.901v1.792c2.714 6.333 8.014 11.524 15.063 13.875a24.893 24.893 0 0 0 18.394-1.032c-6.031-2.794-10.946-7.966-13.215-14.769z"
                  />
                  <path
                    fill="#938493"
                    d="M144.797 142.418c-5.739 3.046-10.366 8.211-12.583 14.861-4.114 12.337 1.454 25.565 12.577 31.459 6.543-2.649 11.932-8.034 14.34-15.255 4.199-12.594-2.189-26.164-14.334-31.065z"
                  />
                  <path
                    fill="#7b6c79"
                    d="M132.868 157.672c2.259-6.773 7.14-11.929 13.135-14.73a25.352 25.352 0 0 0-2.672-1.07c-13.092-4.366-27.245 2.708-31.61 15.8-4.366 13.092 2.708 27.244 15.8 31.61 6.319 2.107 12.882 1.543 18.475-1.07-11.357-5.29-17.187-18.37-13.128-30.54z"
                  />
                </svg>
              </div>
            )}
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
        info.el.style.minHeight = "28px";
        info.el.style.whiteSpace = "normal";
        info.el.style.padding = "2px 4px";
        info.el.style.marginTop = "20px";
        // Apply text color from event with !important to all text elements
        if (info.event.textColor) {
          info.el.style.color = info.event.textColor;
          // Also apply to all child elements
          const allElements = info.el.querySelectorAll("*");
          allElements.forEach((el: Element) => {
            (el as HTMLElement).style.color = info.event.textColor;
          });
        }
      }}
      eventClassNames={() => {
        // Don't apply any classes - let the backgroundColor/borderColor from event source handle colors
        // This ensures status colors are displayed correctly
        return [];
      }}
      dayHeaderContent={(args) => (
        <span
          className={cn(
            args.date.toLocaleDateString("en-CA") === selectedDate &&
              "bg-purple-300",
            "px-2 py-1 text-sm"
          )}
          style={
            isToday(args.date)
              ? { color: "#008080", fontWeight: "bold" }
              : undefined
          }
        >
          {args.date.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric"
          })}
        </span>
      )}
      eventContent={(arg) => {
        const textColor = arg.event.textColor || "#f0f8ff";
        return arg.event.display !== "background" ? (
          <div
            style={
              {
                whiteSpace: "nowrap",
                lineHeight: "1.2",
                fontSize: "0.8rem",
                padding: "2px",
                overflow: "hidden",
                fontWeight: "bold",
                textOverflow: "ellipsis"
              } as React.CSSProperties & { "--event-text-color": string }
            }
          >
            <span style={{ color: textColor }}>{arg.event.title}</span>
          </div>
        ) : null;
      }}
      resourceAreaHeaderContent={<div className="pl-2">Room Types & Rooms</div>}
      resourceAreaHeaderClassNames={[
        "bg-white dark:bg-gray-900 text-gray-900 dark:text-white pl-6"
      ]}
      resourceLabelContent={(info) => (
        <span
          onClick={() => setSelectedResource(info.resource.id)}
          className={cn(
            info.resource.id === selectedResource &&
              "bg-white text-gray-[#121212] dark:bg-gray-600 text-[#f0f8f9]",
            "flex items-center justify-start px-3 py-3 cursor-pointer text-sm font-bold h-full"
          )}
        >
          {info.resource.title}
        </span>
      )}
      slotLaneClassNames={({ date }) => {
        // Highlight today's lane with a subtle background
        const isTodayLane = date && isToday(date);
        return isTodayLane ? ["today-lane-highlight"] : [];
      }}
      slotLabelClassNames={({ date }) => {
        const cls: string[] = [
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        ];
        if (date.toLocaleDateString("en-CA") === selectedDate)
          cls.push("bg-blue-100");
        // Don't highlight weekends or today's column
        return cls;
      }}
      height="auto"
      slotMinWidth={80}
    />
  );
}
