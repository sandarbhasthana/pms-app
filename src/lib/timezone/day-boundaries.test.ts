/**
 * Unit tests for timezone-aware day boundary utilities
 */

import {
  getOperationalDayStart,
  getOperationalDayEnd,
  getOperationalDate,
  calculateNightsWithSixAMBoundary,
  isWithinOperationalDay
} from "./day-boundaries";

describe("Day Boundary Utilities", () => {
  describe("getOperationalDayStart", () => {
    it("should return 6 AM UTC for Jan 15 in New York (EST = UTC-5)", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayStart(date, "America/New_York");

      // 6 AM EST = 11 AM UTC
      expect(result.getUTCHours()).toBe(11);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it("should return 6 AM UTC for Jan 15 in Los Angeles (PST = UTC-8)", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayStart(date, "America/Los_Angeles");

      // 6 AM PST = 2 PM UTC
      expect(result.getUTCHours()).toBe(14);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it("should return 6 AM UTC for Jan 15 in London (GMT = UTC+0)", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayStart(date, "Europe/London");

      // 6 AM GMT = 6 AM UTC
      expect(result.getUTCHours()).toBe(6);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it("should throw error for invalid timezone", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      expect(() => getOperationalDayStart(date, "Invalid/Timezone")).toThrow();
    });
  });

  describe("getOperationalDayEnd", () => {
    it("should return 5:59:59 AM UTC next day for Jan 15 in New York", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayEnd(date, "America/New_York");

      // 5:59:59 AM EST on Jan 16 = 10:59:59 AM UTC
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });

    it("should return correct end time for Los Angeles", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayEnd(date, "America/Los_Angeles");

      // 5:59:59 AM PST on Jan 16 = 1:59:59 PM UTC
      expect(result.getUTCHours()).toBe(13);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });
  });

  describe("getOperationalDate", () => {
    it("should return same date for 2 PM EST", () => {
      // 2 PM EST = 7 PM UTC
      const timestamp = new Date("2025-01-15T19:00:00Z");
      const result = getOperationalDate(timestamp, "America/New_York");

      expect(result).toBe("2025-01-15");
    });

    it("should return previous date for 5 AM EST (before 6 AM boundary)", () => {
      // 5 AM EST = 10 AM UTC
      const timestamp = new Date("2025-01-15T10:00:00Z");
      const result = getOperationalDate(timestamp, "America/New_York");

      expect(result).toBe("2025-01-14");
    });

    it("should return same date for 6 AM EST (at boundary)", () => {
      // 6 AM EST = 11 AM UTC
      const timestamp = new Date("2025-01-15T11:00:00Z");
      const result = getOperationalDate(timestamp, "America/New_York");

      expect(result).toBe("2025-01-15");
    });
  });

  describe("calculateNightsWithSixAMBoundary", () => {
    it("should calculate 1 night for same-day check-in/check-out", () => {
      const checkIn = new Date("2025-01-15T14:00:00Z");
      const checkOut = new Date("2025-01-16T11:00:00Z");

      const nights = calculateNightsWithSixAMBoundary(
        checkIn,
        checkOut,
        "America/New_York"
      );
      expect(nights).toBe(1);
    });

    it("should calculate 2 nights for two-day stay", () => {
      const checkIn = new Date("2025-01-15T14:00:00Z");
      const checkOut = new Date("2025-01-17T11:00:00Z");

      const nights = calculateNightsWithSixAMBoundary(
        checkIn,
        checkOut,
        "America/New_York"
      );
      expect(nights).toBe(2);
    });
  });

  describe("isWithinOperationalDay", () => {
    it("should return true for timestamp within operational day", () => {
      const timestamp = new Date("2025-01-15T19:00:00Z");
      const operationalDate = "2025-01-15";

      const result = isWithinOperationalDay(
        timestamp,
        operationalDate,
        "America/New_York"
      );
      expect(result).toBe(true);
    });

    it("should return false for timestamp before operational day start", () => {
      const timestamp = new Date("2025-01-15T10:00:00Z");
      const operationalDate = "2025-01-15";

      const result = isWithinOperationalDay(
        timestamp,
        operationalDate,
        "America/New_York"
      );
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle UTC timezone", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayStart(date, "UTC");

      expect(result.getUTCHours()).toBe(6);
    });

    it("should handle positive UTC offset (IST = UTC+5:30)", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = getOperationalDayStart(date, "Asia/Kolkata");

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(30);
    });
  });
});
