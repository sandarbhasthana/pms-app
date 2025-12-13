// components/CalendarToolbar.tsx

"use client";

import React from "react";
import DatePicker from "react-datepicker";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import FullCalendar from "@fullcalendar/react";
import { CalendarIcon } from "lucide-react";

interface CalendarToolbarProps {
  datePickerDate: Date | null;
  setDatePickerDate: (date: Date | null) => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleToday: () => void;
  setSelectedDate: (d: string) => void;
  calendarRef: React.RefObject<FullCalendar | null>;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  datePickerDate,
  setDatePickerDate,
  handlePrev,
  handleNext,
  handleToday,
  setSelectedDate,
  calendarRef
}) => {
  return (
    <div className="flex items-center gap-4" role="toolbar">
      <div className="flex items-center justify-center rounded-bl-sm rounded-tl-sm">
        <div className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 flex items-center justify-center rounded-bl-sm rounded-tl-sm border-r border-purple-600">
          <button
            onClick={handlePrev}
            className="h-[50px] w-[30px] ml-[5px] flex items-center text-[#f0f8ff] cursor-pointer"
            aria-label="Go to previous week"
            title="Go to previous week"
          >
            <ChevronLeftIcon
              className="h-6 w-6"
              vectorEffect="non-scaling-stroke"
            />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-2 py-1 rounded-0 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 h-[50px] text-[#f0f8ff] cursor-pointer"
        >
          Today
        </button>
        <div className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 flex items-center justify-center rounded-br-sm rounded-tr-sm border-l border-purple-600">
          <button
            onClick={handleNext}
            className="h-[50px] w-[30px] ml-[5px] flex items-center text-[#f0f8f9] cursor-pointer"
            aria-label="Go to next week"
            title="Go to next week"
          >
            <ChevronRightIcon
              className="h-6 w-6"
              vectorEffect="non-scaling-stroke"
            />
          </button>
        </div>
      </div>
      <div className="w-[120px]">
        <DatePicker
          selected={datePickerDate}
          onChange={(date: Date | null) => {
            setDatePickerDate(date);
            if (date) {
              const formattedDate = date.toISOString().slice(0, 10);
              setSelectedDate(formattedDate);
              const api = calendarRef.current?.getApi();
              if (api) api.gotoDate(date);
            }
          }}
          dateFormat="yyyy-MM-dd"
          className="border-purple-600 border-2 p-2 rounded-sm h-[50px] z-100 w-[120px]"
          popperPlacement="bottom-end"
          customInput={
            <div className="flex items-center cursor-pointer border-purple-600 dark:border-[#8b5cf6] border-2 p-2 rounded-sm h-[50px] w-[120px]">
              <input
                className="outline-none w-full bg-transparent text-sm"
                readOnly
                value={
                  datePickerDate
                    ? datePickerDate.toISOString().slice(0, 10)
                    : ""
                }
              />
              <CalendarIcon
                vectorEffect="non-scaling-stroke"
                className="text-purple-600 dark:text-[#8b5cf6] h-4 w-4 mr-1 font-bold shrink-0"
                strokeWidth={2}
              />
            </div>
          }
        />
      </div>
    </div>
  );
};

export default CalendarToolbar;
