"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption:
          "flex justify-center pt-1 relative items-center mb-4 text-slate-900 dark:text-slate-100",
        caption_label: "text-base font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "text-slate-600 dark:text-slate-400 rounded-md flex-1 font-semibold text-xs uppercase tracking-wider text-center",
        row: "flex w-full mt-2",
        cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-purple-100/50 dark:[&:has([aria-selected].day-outside)]:bg-purple-900/20 [&:has([aria-selected])]:bg-purple-100 dark:[&:has([aria-selected])]:bg-purple-900/30 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-purple-600 dark:bg-purple-600 text-white hover:bg-purple-700 dark:hover:bg-purple-700 hover:text-white focus:bg-purple-600 focus:text-white font-semibold",
        day_today:
          "bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-semibold border border-purple-300 dark:border-purple-700",
        day_outside:
          "day-outside text-slate-400 dark:text-slate-600 opacity-50 aria-selected:bg-purple-100/50 dark:aria-selected:bg-purple-900/20 aria-selected:text-slate-500 dark:aria-selected:text-slate-500 aria-selected:opacity-30",
        day_disabled: "text-slate-300 dark:text-slate-700 opacity-50",
        day_range_middle:
          "aria-selected:bg-purple-100 dark:aria-selected:bg-purple-900/30 aria-selected:text-slate-900 dark:aria-selected:text-slate-100",
        day_hidden: "invisible",
        ...classNames
      }}
      components={{
        Chevron: (props) => {
          const { orientation = "left", ...rest } = props;
          if (orientation === "left") {
            return (
              <ChevronLeft
                className="h-4 w-4 text-slate-600 dark:text-slate-400"
                {...rest}
              />
            );
          }
          return (
            <ChevronRight
              className="h-4 w-4 text-slate-600 dark:text-slate-400"
              {...rest}
            />
          );
        }
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
