// File: src/app/dashboard/bookings/hooks/useCalendarEvents.ts
"use client";

import { useMemo } from "react";
import { formatGuestNameForCalendar } from "@/lib/utils/nameFormatter";
import { getEventColor, getBlockColor } from "../utils/eventColors";
import {
  generateWeekendHighlights,
  getOrgIdFromCookies
} from "../utils/calendarHelpers";
import type {
  Reservation,
  RoomBlock,
  EventSourceFunction,
  CalendarEvent
} from "../types";

interface UseCalendarEventsProps {
  isDarkMode: boolean;
  blocks: RoomBlock[];
}

/**
 * Custom hook for managing calendar event sources
 * Provides event sources for reservations, weekends, and blocks
 */
export function useCalendarEvents({
  isDarkMode,
  blocks
}: UseCalendarEventsProps) {
  /**
   * Event sources for FullCalendar
   * Memoized to prevent unnecessary re-renders
   */
  const eventSources = useMemo(() => {
    const sources: EventSourceFunction[] = [
      // Reservation events source
      async (
        fetchInfo: { startStr: string; endStr: string },
        success: (events: CalendarEvent[]) => void,
        failure: (error: Error) => void
      ) => {
        try {
          const orgId = getOrgIdFromCookies();
          const params = new URLSearchParams({
            start: fetchInfo.startStr,
            end: fetchInfo.endStr,
            t: Date.now().toString(), // Cache bust
            r: Math.random().toString() // Extra cache busting
          });

          const res = await fetch(`/api/reservations?${params}`, {
            credentials: "include",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
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

      // Weekend highlight events source
      (
        info: { start: Date; end: Date },
        success: (events: CalendarEvent[]) => void
      ) => {
        const weekendEvents = generateWeekendHighlights(info.start, info.end);
        success(weekendEvents);
      },

      // Block events source
      (
        _info: { start: Date; end: Date },
        success: (events: CalendarEvent[]) => void
      ) => {
        console.log(`🔒 Rendering ${blocks.length} blocks in calendar`);
        const blockEvents = blocks.map((block) => {
          const colors = getBlockColor(block.blockType, isDarkMode);
          return {
            id: `block-${block.id}`,
            resourceId: block.roomId,
            title: `🚫 ${block.blockType}`,
            start: block.startDate,
            end: block.endDate,
            allDay: true,
            backgroundColor: colors.backgroundColor,
            borderColor: colors.backgroundColor,
            textColor: colors.textColor,
            classNames: ["block-event"],
            extendedProps: {
              isBlock: true,
              blockId: block.id,
              blockType: block.blockType,
              reason: block.reason,
              isPartialDay: true
            }
          };
        });
        success(blockEvents);
      }
    ];

    return sources;
  }, [isDarkMode, blocks]);

  return { eventSources };
}
