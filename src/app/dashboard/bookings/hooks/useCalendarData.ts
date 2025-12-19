// File: src/app/dashboard/bookings/hooks/useCalendarData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Reservation, RoomBlock, Room } from "../types";
import { getOrgIdFromCookies } from "../utils/calendarHelpers";

/**
 * Custom hook for fetching and managing calendar data
 * Handles reservations, room blocks, and room resources
 */
export function useCalendarData() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [resources, setResources] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [country, setCountry] = useState<string>("");

  /**
   * Fetch room resources (room types and individual rooms)
   */
  const fetchResources = useCallback(async () => {
    try {
      const orgId = getOrgIdFromCookies();
      const res = await fetch("/api/rooms", {
        credentials: "include",
        headers: {
          ...(orgId && { "x-organization-id": orgId })
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch rooms");
      }

      const data = await res.json();
      setResources(data.rooms || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load rooms");
    }
  }, []);

  /**
   * Fetch room blocks
   */
  const fetchBlocks = useCallback(async () => {
    try {
      const orgId = getOrgIdFromCookies();
      const res = await fetch("/api/room-blocks", {
        credentials: "include",
        headers: {
          ...(orgId && { "x-organization-id": orgId })
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch room blocks");
      }

      const data = await res.json();
      console.log(`🔒 Fetched ${data.blocks?.length || 0} room blocks`);
      setBlocks(data.blocks || []);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      toast.error("Failed to load room blocks");
    }
  }, []);

  /**
   * Fetch holidays based on user's geolocation
   */
  const fetchHolidays = useCallback(async () => {
    try {
      // Get user's country from geolocation
      const geoRes = await fetch("https://ipapi.co/json/");
      const geoData = await geoRes.json();
      const userCountry = geoData.country_code || "US";
      setCountry(userCountry);

      // Fetch holidays for the current year
      const year = new Date().getFullYear();
      const holidayRes = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${userCountry}`
      );

      if (holidayRes.ok) {
        const holidayData = await holidayRes.json();
        const holidayMap: Record<string, string> = {};
        holidayData.forEach((holiday: { date: string; localName: string }) => {
          holidayMap[holiday.date] = holiday.localName;
        });
        setHolidays(holidayMap);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      // Don't show error toast for holidays - it's not critical
    }
  }, []);

  /**
   * Reload all calendar data
   */
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchResources(), fetchBlocks(), fetchHolidays()]);
    } catch (error) {
      console.error("Error reloading calendar data:", error);
      toast.error("Failed to reload calendar data");
    } finally {
      setLoading(false);
    }
  }, [fetchResources, fetchBlocks, fetchHolidays]);

  /**
   * Initial data load
   */
  useEffect(() => {
    if (session?.user) {
      reload();
    }
  }, [session?.user, reload]);

  return {
    // Data
    events,
    blocks,
    resources,
    holidays,
    country,
    loading,

    // Setters (for external updates)
    setEvents,
    setBlocks,
    setResources,

    // Actions
    reload,
    fetchResources,
    fetchBlocks,
    fetchHolidays
  };
}

