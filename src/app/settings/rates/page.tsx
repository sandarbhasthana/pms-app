// app/settings/rates/page.tsx
"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const RatesPage = () => {
  const [innerTab, setInnerTab] = useState<"rates" | "logs">("rates");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [ratePlan, setRatePlan] = useState<string>("base");

  // Display a week’s columns by default
  const dates = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-xl font-semibold mb-6">Rates</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Availability Matrix</h2>

        {/* Inner tabs */}
        <div className="flex space-x-8 border-b mb-6">
          <button
            className={`pb-2 ${
              innerTab === "rates"
                ? "border-b-2 border-purple-400 text-purple-400"
                : "text-purple-200"
            }`}
            onClick={() => setInnerTab("rates")}
          >
            Rates and Availability
          </button>
          <button
            className={`pb-2 ${
              innerTab === "logs"
                ? "border-b-2 border-purple-400 text-purple-400"
                : "text-purple-200"
            }`}
            onClick={() => setInnerTab("logs")}
          >
            Logs
          </button>
        </div>

        {innerTab === "rates" ? (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Manage your rates, availability, and restrictions below. You can
              use the Long-term Interval button to update multiple dates and
              room types at the same time, or click within the table to update
              one day at a time.
            </p>

            <div className="flex items-center justify-between mb-6">
              <Button variant="default" className="flex items-center">
                <Plus className="mr-2" /> Long-term Interval
              </Button>

              <div className="flex space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Settings</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Block Dates</DropdownMenuItem>
                    <DropdownMenuItem>Reset to Defaults</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>Export to</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>CSV</DropdownMenuItem>
                    <DropdownMenuItem>Excel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Interval controls */}
            <div className="border rounded-lg p-4 mb-8">
              <div className="flex items-center flex-wrap gap-4">
                <label className="flex-shrink-0">Start date</label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="max-w-xs"
                />

                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-200 rounded mr-2" /> Legend
                </div>

                <div className="ml-auto flex items-center space-x-4">
                  <Select defaultValue="4">
                    <SelectTrigger className="w-[140px]">
                      4 of 11 selected
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 of 11</SelectItem>
                      {/* … */}
                    </SelectContent>
                  </Select>

                  <Select value={ratePlan} onValueChange={setRatePlan}>
                    <SelectTrigger className="w-[140px]">
                      {ratePlan === "base" ? "Base Rate" : "Promo Rate"}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base Rate</SelectItem>
                      <SelectItem value="promo">Promo Rate</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="4">
                    <SelectTrigger className="w-[140px]">
                      4 of 5 selected
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 of 5</SelectItem>
                      {/* … */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rates matrix table */}
            <div className="overflow-auto">
              <table className="min-w-full table-fixed">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="w-1/4 p-3 text-left">Room Types</th>
                    {dates.map((d) => (
                      <th key={d.toISOString()} className="p-3 text-center">
                        <div className="font-medium">{format(d, "EEE")}</div>
                        <div className="text-sm">{format(d, "d")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Example row */}
                  <tr className="border-t">
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span className="font-medium">Standard King</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        14 Rooms
                      </div>
                    </td>
                    {dates.map((d) => (
                      <td key={d.toISOString()} className="p-3 text-center">
                        $0.00
                      </td>
                    ))}
                  </tr>
                  {/* TODO: map over fetched room‐types and render nested rows for
                      Group Allotment, Remaining Inventory, Min LOS, Max LOS */}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-gray-600 dark:text-gray-300">
            Logs view coming soon…
          </div>
        )}
      </div>
    </div>
  );
};

export default RatesPage;
