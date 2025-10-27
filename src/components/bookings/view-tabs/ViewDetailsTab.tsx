"use client";

import React from "react";
import { ViewTabProps } from "./types";
import {
  CalendarIcon,
  UserIcon,
  IdentificationIcon,
  HomeIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";

export const ViewDetailsTab: React.FC<ViewTabProps> = ({ reservationData }) => {
  const calculateNights = () => {
    const checkIn = new Date(reservationData.checkIn);
    const checkOut = new Date(reservationData.checkOut);
    return Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-6">
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
            <div className="w-32 h-32 bg-gray-100 dark:!bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
              {reservationData.guestImageUrl ? (
                <Image
                  src={reservationData.guestImageUrl}
                  alt="Guest Photo"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
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
              )}
            </div>
          </div>

          {/* Right Side: Guest Details */}
          <div className="flex-1">
            {/* Row 1: Guest Name | Email */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Guest Name
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {reservationData.guestName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {reservationData.email || "—"}
                </div>
              </div>
            </div>

            {/* Row 2: Phone | ID Type */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {reservationData.phone || "—"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  ID Type
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {reservationData.idType || "—"}
                </div>
              </div>
            </div>

            {/* Row 3: ID Number | Issuing Country */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  ID Number
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {reservationData.idNumber || "—"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Issuing Country
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                  {reservationData.issuingCountry || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <HomeIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Booking Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Room
              </label>
              <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                {reservationData.roomName ||
                  reservationData.roomNumber ||
                  `Room ${reservationData.roomId}`}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Check-in Date
              </label>
              <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                {formatDate(reservationData.checkIn)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Adults
              </label>
              <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                {reservationData.adults}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Nights
              </label>
              <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                {calculateNights()} night{calculateNights() > 1 ? "s" : ""}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Check-out Date
              </label>
              <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                {formatDate(reservationData.checkOut)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Children
              </label>
              <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 h-10 flex items-center">
                {reservationData.children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information Section */}
      {(reservationData.notes || reservationData.ratePlan) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <IdentificationIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Additional Information</h3>
          </div>

          <div className="space-y-4">
            {reservationData.ratePlan && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Rate Plan
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 min-h-[2.5rem] flex items-center">
                  {reservationData.ratePlan}
                </div>
              </div>
            )}

            {reservationData.notes && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <div className="p-2 bg-gray-100 dark:!bg-[#1e2939] rounded border border-gray-600 min-h-[4rem]">
                  {reservationData.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
