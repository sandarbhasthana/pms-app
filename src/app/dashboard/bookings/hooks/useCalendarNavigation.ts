// File: src/app/dashboard/bookings/hooks/useCalendarNavigation.ts
"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type FullCalendar from "@fullcalendar/react";
import { addDays, toISODateString, isToday } from "../utils/calendarHelpers";
import type { DayTransitionIssue } from "@/types/day-transition";

/**
 * Custom hook for calendar navigation and date management
 * Handles date navigation, day transitions, and calendar controls
 */
export function useCalendarNavigation() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [datePickerDate, setDatePickerDate] = useState<Date | null>(new Date());

  // Day Transition Blocker Modal state
  const [dayTransitionBlockerOpen, setDayTransitionBlockerOpen] = useState(false);
  const [dayTransitionIssues, setDayTransitionIssues] = useState<DayTransitionIssue[]>([]);
  const [dayTransitionLoading, setDayTransitionLoading] = useState(false);
  const [pendingDateNavigation, setPendingDateNavigation] = useState<Date | null>(null);

  /**
   * Navigate to previous week (7 days)
   */
  const handlePrev = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = api.getDate();
    const newDate = addDays(d, -7);
    api.gotoDate(newDate);
    setSelectedDate(toISODateString(newDate));
  }, []);

  /**
   * Navigate to next week (7 days)
   */
  const handleNext = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const d = api.getDate();
    const newDate = addDays(d, 7);
    api.gotoDate(newDate);
    setSelectedDate(toISODateString(newDate));
  }, []);

  /**
   * Navigate to today with day transition check
   */
  const handleToday = useCallback(async () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    const currentDate = api.getDate();
    const today = new Date();

    // If already on today, just return
    if (isToday(currentDate)) {
      toast.info("Already viewing today");
      return;
    }

    // Check if we're moving forward in time (potential day transition)
    if (currentDate < today) {
      // Check for day transition issues
      setDayTransitionLoading(true);
      try {
        const response = await fetch("/api/day-transition/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            currentDate: toISODateString(currentDate),
            targetDate: toISODateString(today)
          })
        });

        if (!response.ok) {
          throw new Error("Failed to check day transition");
        }

        const { issues } = await response.json();

        if (issues && issues.length > 0) {
          // Show blocker modal
          setDayTransitionIssues(issues);
          setPendingDateNavigation(today);
          setDayTransitionBlockerOpen(true);
          return;
        }
      } catch (error) {
        console.error("Error checking day transition:", error);
        toast.error("Failed to check day transition");
      } finally {
        setDayTransitionLoading(false);
      }
    }

    // No issues, proceed to today
    api.gotoDate(today);
    setSelectedDate(toISODateString(today));
  }, []);

  /**
   * Proceed with day transition despite issues
   */
  const handleDayTransitionProceed = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api || !pendingDateNavigation) return;

    // Proceed to the pending date
    api.gotoDate(pendingDateNavigation);
    setSelectedDate(toISODateString(pendingDateNavigation));

    // Close modal and reset state
    setDayTransitionBlockerOpen(false);
    setDayTransitionIssues([]);
    setPendingDateNavigation(null);

    toast.success("Proceeded to next day");
  }, [pendingDateNavigation]);

  /**
   * Stay on current day (cancel day transition)
   */
  const handleDayTransitionStay = useCallback(() => {
    // Close modal and reset state without navigating
    setDayTransitionBlockerOpen(false);
    setDayTransitionIssues([]);
    setPendingDateNavigation(null);

    toast.info("Staying on current day");
  }, []);

  /**
   * Navigate to a specific date
   */
  const gotoDate = useCallback((date: Date) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.gotoDate(date);
    setSelectedDate(toISODateString(date));
    setDatePickerDate(date);
  }, []);

  return {
    // Refs
    calendarRef,

    // State
    selectedDate,
    datePickerDate,
    dayTransitionBlockerOpen,
    dayTransitionIssues,
    dayTransitionLoading,
    pendingDateNavigation,

    // Setters
    setSelectedDate,
    setDatePickerDate,
    setDayTransitionBlockerOpen,
    setDayTransitionIssues,
    setDayTransitionLoading,
    setPendingDateNavigation,

    // Actions
    handlePrev,
    handleNext,
    handleToday,
    handleDayTransitionProceed,
    handleDayTransitionStay,
    gotoDate
  };
}

