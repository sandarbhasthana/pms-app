"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  error?: string;
}

export function TimePicker({
  value,
  onChange,
  id,
  className,
  error
}: TimePickerProps) {
  const [hours, minutes] = value.split(":");
  const [period, setPeriod] = React.useState<"AM" | "PM">(
    parseInt(hours) >= 12 ? "PM" : "AM"
  );
  const [displayHours, setDisplayHours] = React.useState(
    parseInt(hours) === 0
      ? "12"
      : parseInt(hours) > 12
      ? String(parseInt(hours) - 12)
      : hours
  );
  const [displayMinutes, setDisplayMinutes] = React.useState(minutes || "00");

  const updateTime = (
    newHours: string,
    newMinutes: string,
    newPeriod: "AM" | "PM"
  ) => {
    let hour24 = parseInt(newHours);

    if (newPeriod === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (newPeriod === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    const formattedTime = `${String(hour24).padStart(2, "0")}:${newMinutes}`;
    onChange(formattedTime);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val === "") {
      setDisplayHours("");
      return;
    }

    let num = parseInt(val);
    if (num > 12) num = 12;
    if (num < 1) num = 1;

    const formatted = String(num);
    setDisplayHours(formatted);
    updateTime(formatted, displayMinutes, period);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val === "") {
      setDisplayMinutes("");
      return;
    }

    let num = parseInt(val);
    if (num > 59) num = 59;
    if (num < 0) num = 0;

    const formatted = String(num).padStart(2, "0");
    setDisplayMinutes(formatted);
    updateTime(displayHours, formatted, period);
  };

  const handlePeriodToggle = () => {
    const newPeriod = period === "AM" ? "PM" : "AM";
    setPeriod(newPeriod);
    updateTime(displayHours, displayMinutes, newPeriod);
  };

  const handleHoursBlur = () => {
    if (displayHours === "") {
      setDisplayHours("12");
      updateTime("12", displayMinutes, period);
    }
  };

  const handleMinutesBlur = () => {
    if (displayMinutes === "") {
      setDisplayMinutes("00");
      updateTime(displayHours, "00", period);
    } else if (displayMinutes.length === 1) {
      const formatted = displayMinutes.padStart(2, "0");
      setDisplayMinutes(formatted);
      updateTime(displayHours, formatted, period);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200",
          "bg-transparent",
          error
            ? "border-red-400 focus-within:border-red-500"
            : "border-gray-200 dark:border-gray-700 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10"
        )}
      >
        <Clock className="h-5 w-5 text-gray-400" />

        <input
          id={id}
          type="text"
          value={displayHours}
          onChange={handleHoursChange}
          onBlur={handleHoursBlur}
          placeholder="12"
          maxLength={2}
          className="w-12 text-center text-lg font-semibold bg-transparent border-none outline-none focus:outline-none text-gray-900 dark:text-gray-100"
        />

        <span className="text-2xl font-light text-gray-400">:</span>

        <input
          type="text"
          value={displayMinutes}
          onChange={handleMinutesChange}
          onBlur={handleMinutesBlur}
          placeholder="00"
          maxLength={2}
          className="w-12 text-center text-lg font-semibold bg-transparent border-none outline-none focus:outline-none text-gray-900 dark:text-gray-100"
        />

        <button
          type="button"
          onClick={handlePeriodToggle}
          className={
            period === "AM"
              ? "ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              : "ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
          }
        >
          {period}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 px-1">{error}</p>}
    </div>
  );
}
