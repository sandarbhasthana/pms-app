"use client";
import React, { useEffect, useState } from "react";
import {
  ScheduleComponent,
  Inject,
  TimelineViews,
  ViewDirective,
  ViewsDirective,
  HeaderRowsDirective,
  HeaderRowDirective,
  ResourcesDirective,
  ResourceDirective,
  GroupModel
} from "@syncfusion/ej2-react-schedule";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-schedule/styles/material.css";

export interface SchedulerEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  roomId: number; // must match the resource idField
}

export interface RoomResource {
  id: number;
  name: string;
  color?: string; // optional: if you want to assign a color per room
}

export default function SchedulerWithResources() {
  const [events, setEvents] = useState<SchedulerEvent[]>([]);
  const [rooms, setRooms] = useState<RoomResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch both rooms and events in parallel
  useEffect(() => {
    Promise.all([
      fetch("/api/rooms").then((res) => {
        if (!res.ok) throw new Error("Failed to load rooms");
        return res.json() as Promise<
          Array<{ id: number; name: string; color?: string }>
        >;
      }),
      fetch("/api/reservations").then((res) => {
        if (!res.ok) throw new Error("Failed to load events");
        return res.json() as Promise<
          Array<{
            id: number;
            title: string;
            startDate: string;
            endDate: string;
            allDay?: boolean;
            roomId: number;
          }>
        >;
      })
    ])
      .then(([rawRooms, rawEvents]) => {
        // Map rooms into RoomResource[]
        setRooms(
          rawRooms.map((r) => ({
            id: r.id,
            name: r.name,
            // optional: assign a default color if not provided
            color: r.color ?? undefined
          }))
        );

        // Map events into SchedulerEvent[]
        setEvents(
          rawEvents.map((evt) => ({
            id: evt.id,
            title: evt.title,
            start: new Date(evt.startDate),
            end: new Date(evt.endDate),
            isAllDay: evt.allDay ?? false,
            roomId: evt.roomId
          }))
        );
      })
      .catch((err) => {
        console.error("Error loading rooms or events:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading scheduler…</div>;
  }

  // Configure grouping by the "Rooms" resource
  const group: GroupModel = {
    byGroupID: false,
    resources: ["Rooms"],
    enableCompactView: false
  };

  return (
    <div className="p-4">
      <ScheduleComponent
        height="650px"
        selectedDate={new Date()}
        currentView="TimelineWeek"
        eventSettings={{
          dataSource: events,
          resourceColorField: "color" // if you provided a color field on RoomResource
        }}
        // Tells the scheduler to group by the "Rooms" resource—showing each room on its own row
        group={group}
      >
        {/* 1. Only show "Date" (day + date) header row, no "Hour" row */}
        <HeaderRowsDirective>
          <HeaderRowDirective option="Date" />
        </HeaderRowsDirective>

        {/* 2. Configure TimelineWeek so timeScale is disabled (one column per day) */}
        <ViewsDirective>
          <ViewDirective option="TimelineWeek" timeScale={{ enable: false }} />
        </ViewsDirective>

        {/* 3. Define the resource collection named "Rooms" */}
        <ResourcesDirective>
          <ResourceDirective
            field="roomId"
            title="Room"
            name="Rooms"
            dataSource={rooms}
            textField="name"
            idField="id"
            colorField="color"
          />
        </ResourcesDirective>

        {/* 4. Inject TimelineViews so that the component knows how to render TimelineWeek */}
        <Inject services={[TimelineViews]} />
      </ScheduleComponent>
    </div>
  );
}
