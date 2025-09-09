"use client";

import React, { useState, useEffect, useCallback } from "react";
import { EditTabProps, GroupedRooms, AvailableRoom } from "./types";
import {
  CalendarIcon,
  UserIcon,
  IdentificationIcon,
  HomeIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const EditDetailsTab: React.FC<EditTabProps> = ({
  reservationData,
  formData,
  updateFormData,
  availableRooms: initialAvailableRooms,
  onNext,
  onSave
}) => {
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );
  const [availableRooms, setAvailableRooms] = useState(initialAvailableRooms);

  const calculateNights = () => {
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    return Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  };

  // Group rooms by type for the dropdown
  const groupRoomsByType = (): GroupedRooms => {
    const grouped: GroupedRooms = {};

    availableRooms.forEach((room) => {
      if (!grouped[room.type]) {
        grouped[room.type] = {
          displayName: room.typeDisplayName || room.type,
          rooms: []
        };
      }
      grouped[room.type].rooms.push(room);
    });

    // Sort rooms within each group by room number
    Object.keys(grouped).forEach((type) => {
      grouped[type].rooms.sort((a, b) => a.number.localeCompare(b.number));
    });

    return grouped;
  };

  // Check room availability when dates change
  const checkRoomAvailability = useCallback(
    async (checkIn: string, checkOut: string) => {
      if (!checkIn || !checkOut) return;

      setIsCheckingAvailability(true);
      setAvailabilityError(null);

      try {
        // Call your actual room availability API
        const response = await fetch(
          `/api/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}&excludeReservation=${reservationData.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to check room availability: ${response.status}`
          );
        }

        const availableRoomsFromAPI = await response.json();

        // Update available rooms based on API response
        // Mark current room as available even if API says it's not (since we're editing this reservation)
        const updatedRooms = availableRoomsFromAPI.map(
          (room: AvailableRoom) => ({
            ...room,
            isCurrentRoom: room.id === reservationData.roomId,
            available: room.available || room.id === reservationData.roomId // Current room is always "available" for editing
          })
        );

        setAvailableRooms(updatedRooms);
      } catch (error) {
        console.error("❌ Error checking availability:", error);
        setAvailabilityError(
          "Failed to check room availability. Please try again."
        );

        // Fall back to initial rooms but mark unavailable ones
        const fallbackRooms = initialAvailableRooms.map((room) => ({
          ...room,
          available: room.id === reservationData.roomId, // Only current room available in fallback
          isCurrentRoom: room.id === reservationData.roomId
        }));

        setAvailableRooms(fallbackRooms);
      } finally {
        setIsCheckingAvailability(false);
      }
    },
    [
      reservationData.id,
      reservationData.roomId,
      setIsCheckingAvailability,
      setAvailabilityError,
      setAvailableRooms,
      initialAvailableRooms
    ]
  );

  // Effect to update available rooms when initial prop changes
  useEffect(() => {
    setAvailableRooms(initialAvailableRooms);
  }, [initialAvailableRooms]);

  // Effect to check availability when dates change
  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      checkRoomAvailability(formData.checkIn, formData.checkOut);
    }
  }, [formData.checkIn, formData.checkOut, checkRoomAvailability]);

  // Effect to check availability when component first loads (if dates are already set)
  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      checkRoomAvailability(formData.checkIn, formData.checkOut);
    }
  }, [formData.checkIn, formData.checkOut, checkRoomAvailability]); // Run when initial form data is available

  const formatDateForInput = (dateString: string) => {
    return new Date(dateString).toISOString().split("T")[0];
  };

  const handleInputChange = (field: string, value: string | number) => {
    updateFormData({ [field]: value });
  };

  const handleRoomChange = (roomId: string) => {
    updateFormData({
      roomId
      // Could also update room-related pricing here
    });
  };

  const handleDateChange = (field: "checkIn" | "checkOut", value: string) => {
    updateFormData({ [field]: value });
    // Could trigger availability check here
  };

  const handleGuestCountChange = (
    field: "adults" | "children",
    increment: boolean
  ) => {
    const currentValue = formData[field];
    const newValue = increment
      ? currentValue + 1
      : Math.max(field === "adults" ? 1 : 0, currentValue - 1);
    updateFormData({ [field]: newValue });
  };

  return (
    <div className="space-y-6">
      {/* Room Selection Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <HomeIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Room Selection</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Room Selection
              {isCheckingAvailability && (
                <span className="text-xs text-blue-600 ml-2">
                  (Checking availability...)
                </span>
              )}
            </label>
            {/* Professional HTML Select with Grouping */}
            <select
              value={formData.roomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              className="w-full h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:!bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm leading-tight"
            >
              <option value="">Select a room</option>
              {Object.entries(groupRoomsByType()).map(([roomType, group]) => (
                <optgroup
                  key={roomType}
                  label={group.displayName}
                  className="bg-purple-300 dark:bg-purple-900 uppercase"
                >
                  {group.rooms.map((room) => (
                    <option
                      key={room.id}
                      value={room.id}
                      disabled={!room.available && !room.isCurrentRoom}
                    >
                      Room {room.number} - ₹{room.basePrice.toLocaleString()}
                      /night
                      {room.isCurrentRoom ? " [Current]" : ""}
                      {!room.available && !room.isCurrentRoom
                        ? " [Occupied]"
                        : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Room Selection Info */}
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {formData.roomId ? (
                (() => {
                  const selectedRoom = availableRooms.find(
                    (r) => r.id === formData.roomId
                  );
                  return selectedRoom ? (
                    <div className="flex items-center gap-2">
                      <span>
                        Selected: {selectedRoom.typeDisplayName} - Room{" "}
                        {selectedRoom.number}
                      </span>
                      {selectedRoom.isCurrentRoom && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                          Current Room
                        </span>
                      )}
                    </div>
                  ) : null;
                })()
              ) : (
                <span>No room selected</span>
              )}
            </div>

            {availabilityError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>{availabilityError}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Nights
            </label>
            <div className="px-3 py-2 bg-white dark:!bg-[#1e1e1e] rounded border border-gray-300 dark:border-gray-600 h-[40px] flex items-center text-[#1e1e1e] dark:!text-[#f0f8ff] text-sm">
              {calculateNights()} Night{calculateNights() > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Guest Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Guest Information</h3>
        </div>

        {/* Compact Side-by-Side Layout */}
        <div className="flex gap-6">
          {/* Left Side: Image Placeholder */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-gray-100 dark:!bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">ID Image</p>
              </div>
            </div>
          </div>

          {/* Right Side: Guest Details */}
          <div className="flex-1">
            {/* Row 1: Guest Name | Email */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Guest Name *
                </label>
                <input
                  type="text"
                  value={formData.guestName}
                  onChange={(e) =>
                    handleInputChange("guestName", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
                  placeholder="Enter guest name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Row 2: Phone | ID Type */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  ID Type
                </label>
                <Select
                  value={formData.idType}
                  onValueChange={(value) => handleInputChange("idType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">
                      Driver&apos;s License
                    </SelectItem>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: ID Number | Issuing Country */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  ID Number
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) =>
                    handleInputChange("idNumber", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
                  placeholder="Enter ID number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Issuing Country
                </label>
                <input
                  type="text"
                  value={formData.issuingCountry}
                  onChange={(e) =>
                    handleInputChange("issuingCountry", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
                  placeholder="Enter issuing country"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Dates Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Booking Dates</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Check-in Date *
            </label>
            <input
              type="date"
              value={formatDateForInput(formData.checkIn)}
              onChange={(e) => handleDateChange("checkIn", e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Check-out Date *
            </label>
            <input
              type="date"
              value={formatDateForInput(formData.checkOut)}
              onChange={(e) => handleDateChange("checkOut", e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
            />
          </div>
        </div>
      </div>

      {/* Guest Count Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Guest Count</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Adults *
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:!bg-[#1e1e1e]">
              <button
                type="button"
                onClick={() => handleGuestCountChange("adults", false)}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-[#1e1e1e] dark:hover:text-gray-100"
              >
                −
              </button>
              <span className="flex-1 text-center py-2 text-[#1e1e1e] dark:!text-[#f0f8ff] bg-white dark:!bg-[#1e1e1e]">
                {formData.adults}
              </span>
              <button
                type="button"
                onClick={() => handleGuestCountChange("adults", true)}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-[#1e1e1e] dark:hover:text-gray-100"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Children
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:!bg-[#1e1e1e]">
              <button
                type="button"
                onClick={() => handleGuestCountChange("children", false)}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-[#1e1e1e] dark:hover:text-gray-100"
              >
                −
              </button>
              <span className="flex-1 text-center py-2 text-[#1e1e1e] dark:!text-[#f0f8ff] bg-white dark:!bg-[#1e1e1e]">
                {formData.children}
              </span>
              <button
                type="button"
                onClick={() => handleGuestCountChange("children", true)}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-[#1e1e1e] dark:hover:text-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <IdentificationIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Additional Information</h3>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={4}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:!bg-[#1e1e1e] text-[#1e1e1e] dark:!text-[#f0f8ff]"
            placeholder="Add any special requests or notes..."
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          {onSave && (
            <Button
              onClick={onSave}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              Save Changes
            </Button>
          )}
        </div>
        {onNext && (
          <Button
            onClick={onNext}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Next: Add-ons →
          </Button>
        )}
      </div>
    </div>
  );
};
