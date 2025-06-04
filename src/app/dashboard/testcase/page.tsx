"use client";

import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

const CalendarWithHover = () => {
  const handleCellHover = (info: { el: HTMLElement }) => {
    const cell = info.el;
    cell.addEventListener("mouseenter", () => {
      cell.style.backgroundColor = "#f00"; // Light blue hover effect
    });
    cell.addEventListener("mouseleave", () => {
      cell.style.backgroundColor = "#fff"; // Reset background color
    });
  };

  return (
    <FullCalendar
      //   plugins={[resourceTimelinePlugin]}
    //   initialView="resourceTimelineCustom"
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      //   views={{
      //     resourceTimelineCustom: {
      //       type: "resourceTimeline",
      //       duration: { days: 14 }
      //     }
      //   }}
      //slotDuration={{ hours: 12 }}
      // Render date label only at 00:00
      //slotLabelInterval={{ days: 1 }}
      dayCellDidMount={handleCellHover} // Hook to customize day cells
    />
  );
};

export default CalendarWithHover;
