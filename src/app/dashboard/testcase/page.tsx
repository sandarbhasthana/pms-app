//import dynamic from 'next/dynamic';
import React from "react";
import SchedulerWithResources from "@/components/Scheduler";

export default function SchedulerPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">
        Room Timeline (Date & Resource View)
      </h1>
      <SchedulerWithResources />
    </div>
  );
}
