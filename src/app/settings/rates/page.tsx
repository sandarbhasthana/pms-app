// app/settings/rates/page.tsx
"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Download, Settings, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/spinner";
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
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  useRatesData,
  useRateUpdates,
  useRatesExport,
  RateRestrictions
} from "@/lib/hooks/useRatesData";
import RateCell from "@/components/rates/RateCell";
import BulkUpdateModal from "@/components/rates/BulkUpdateModal";
import SeasonalRatesManager from "@/components/rates/SeasonalRatesManager";
import RateLogsViewer from "@/components/rates/RateLogsViewer";
import AdvancedSettingsModal from "@/components/rates/AdvancedSettingsModal";
import { toast } from "sonner";

const RatesPage = () => {
  const [innerTab, setInnerTab] = useState<"rates" | "logs">("rates");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [days, setDays] = useState<number>(7);
  const [ratePlan, setRatePlan] = useState<string>("base");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);

  // Fetch rates data using our custom hook
  const {
    data: roomTypesData,
    dates,
    isLoading,
    error,
    mutate
  } = useRatesData(startDate, days, ratePlan);

  // Rate update hooks
  const { updateRate, bulkUpdateRates, deleteRate, isUpdating } =
    useRateUpdates();
  const { exportRates, isExporting } = useRatesExport();

  // Handle individual rate updates (memoized to prevent unnecessary re-renders)
  const handleRateUpdate = useCallback(
    async (
      roomTypeId: string,
      date: Date,
      price: number,
      availability?: number
    ) => {
      try {
        await updateRate(roomTypeId, format(date, "yyyy-MM-dd"), price, {
          availability
        });
        mutate();
      } catch (error) {
        console.error("Rate update failed:", error);
      }
    },
    [updateRate, mutate]
  );

  // Handle rate deletion (remove daily override) (memoized to prevent unnecessary re-renders)
  const handleRateDelete = useCallback(
    async (roomTypeId: string, date: Date) => {
      try {
        await deleteRate(roomTypeId, format(date, "yyyy-MM-dd"));
        mutate();
      } catch (error) {
        console.error("Rate deletion failed:", error);
      }
    },
    [deleteRate, mutate]
  );

  // Handle bulk updates (memoized to prevent unnecessary re-renders)
  const handleBulkUpdate = useCallback(
    async (
      updates: Array<{
        roomTypeId: string;
        date: string;
        price: number;
        availability?: number;
        restrictions?: Partial<RateRestrictions>;
      }>
    ) => {
      try {
        await bulkUpdateRates(updates);
        mutate();
      } catch (error) {
        console.error("Bulk update failed:", error);
      }
    },
    [bulkUpdateRates, mutate]
  );

  // Handle export (memoized to prevent unnecessary re-renders)
  const handleExport = useCallback(
    async (exportFormat: "csv" | "excel") => {
      try {
        await exportRates({
          format: exportFormat,
          startDate: format(startDate, "yyyy-MM-dd"),
          days,
          roomTypeIds: roomTypesData.map((rt) => rt.roomTypeId)
        });
      } catch (error) {
        console.error("Export failed:", error);
      }
    },
    [exportRates, startDate, days, roomTypesData]
  );

  // Handle refresh (memoized to prevent unnecessary re-renders)
  const handleRefresh = useCallback(() => {
    mutate();
    toast.success("Rates data refreshed");
  }, [mutate]);

  // Modal close handlers (memoized to prevent unnecessary re-renders)
  const handleCloseBulkModal = useCallback(() => setShowBulkModal(false), []);
  const handleCloseSeasonalModal = useCallback(
    () => setShowSeasonalModal(false),
    []
  );
  const handleCloseAdvancedModal = useCallback(
    () => setShowAdvancedModal(false),
    []
  );
  const handleSeasonalRateChange = useCallback(() => mutate(), [mutate]);
  const handleSettingsChange = useCallback(() => mutate(), [mutate]);

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-xl font-semibold mb-6">Rates & Availability</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Availability Matrix</h2>

        {/* Inner tabs */}
        <div className="flex space-x-8 border-b border-purple-600 dark:border-purple-600 mb-6">
          <button
            type="button"
            className={`pb-2 px-4 transition-all duration-200 ${
              innerTab === "rates"
                ? "border-b-2 border-purple-600 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-t-lg"
                : "text-purple-600 dark:text-purple-400 hover:bg-purple-600/10 dark:hover:bg-purple-600/20"
            }`}
            onClick={() => setInnerTab("rates")}
          >
            Rates and Availability
          </button>
          <button
            type="button"
            className={`pb-2 px-4 transition-all duration-200 ${
              innerTab === "logs"
                ? "border-b-2 border-purple-600 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-t-lg"
                : "text-purple-600 dark:text-purple-400 hover:bg-purple-600/10 dark:hover:bg-purple-600/20"
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
              <div className="flex space-x-2">
                <Button
                  variant="default"
                  className="flex items-center"
                  onClick={() => setShowBulkModal(true)}
                  disabled={isLoading || roomTypesData.length === 0}
                >
                  <Plus className="mr-2" /> Long-term Interval
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="flex space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setShowSeasonalModal(true)}
                    >
                      Seasonal Rates
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowAdvancedModal(true)}
                    >
                      Advanced Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={isExporting}>
                      <Download className="mr-2 h-4 w-4" />
                      {isExporting ? "Exporting..." : "Export to"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel")}>
                      Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Interval controls */}
            <div className="border rounded-lg p-4 mb-8">
              <div className="flex items-center flex-wrap gap-4">
                <label className="shrink-0">Start date</label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="max-w-xs"
                />

                <label className="shrink-0">Days</label>
                <Select
                  value={days.toString()}
                  onValueChange={(value) => setDays(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-200 rounded mr-2" />
                  <span className="text-sm">Daily Override</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-200 rounded mr-2" />
                  <span className="text-sm">Seasonal Rate</span>
                </div>

                <div className="ml-auto flex items-center space-x-4">
                  <Select value={ratePlan} onValueChange={setRatePlan}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base Rate</SelectItem>
                      <SelectItem value="promo">Promo Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <LoadingSpinner text="Loading rates data..." fullScreen />
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-300">
                  Failed to load rates data: {error.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Rates matrix table */}
            {!isLoading && !error && roomTypesData.length > 0 && (
              <div className="overflow-auto">
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="w-1/4 p-3 text-left">Room Types</th>
                      {dates.map((date) => (
                        <th
                          key={date.toISOString()}
                          className="p-3 text-center min-w-[120px]"
                        >
                          <div className="font-medium">
                            {format(date, "EEE")}
                          </div>
                          <div className="text-sm">{format(date, "d")}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypesData.map((roomType) => (
                      <tr key={roomType.roomTypeId} className="border-t">
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {roomType.roomTypeName}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {roomType.totalRooms} Rooms
                          </div>
                        </td>
                        {dates.map((date) => {
                          const dateString = format(date, "yyyy-MM-dd");
                          const rateData = roomType.dates[dateString];

                          if (!rateData) {
                            return (
                              <td key={dateString} className="p-3 text-center">
                                <div className="text-gray-400">No data</div>
                              </td>
                            );
                          }

                          return (
                            <RateCell
                              key={`${roomType.roomTypeId}-${dateString}`}
                              roomTypeId={roomType.roomTypeId}
                              roomTypeName={roomType.roomTypeName}
                              date={date}
                              rateData={rateData}
                              isUpdating={isUpdating}
                              onUpdate={(price, availability) =>
                                handleRateUpdate(
                                  roomType.roomTypeId,
                                  date,
                                  price,
                                  availability
                                )
                              }
                              onDelete={
                                rateData.isOverride
                                  ? () =>
                                      handleRateDelete(
                                        roomType.roomTypeId,
                                        date
                                      )
                                  : undefined
                              }
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && roomTypesData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No room types found. Please add room types first.
                </p>
                <Button variant="outline">Go to Room Types</Button>
              </div>
            )}
          </>
        ) : (
          <RateLogsViewer roomTypes={roomTypesData} />
        )}
      </div>

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkModal}
        onClose={handleCloseBulkModal}
        roomTypes={roomTypesData}
        startDate={startDate}
        days={days}
        onBulkUpdate={handleBulkUpdate}
        isUpdating={isUpdating}
      />

      {/* Seasonal Rates Manager */}
      <SeasonalRatesManager
        isOpen={showSeasonalModal}
        onClose={handleCloseSeasonalModal}
        roomTypes={roomTypesData}
        onSeasonalRateChange={handleSeasonalRateChange}
      />

      {/* Advanced Settings Modal */}
      <AdvancedSettingsModal
        isOpen={showAdvancedModal}
        onClose={handleCloseAdvancedModal}
        roomTypes={roomTypesData}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
};

export default RatesPage;
