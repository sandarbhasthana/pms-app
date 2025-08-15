"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserIcon,
  PlusCircleIcon,
  CreditCardIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { ViewTabNavigationProps, ViewBookingTab } from "./types";

const ViewTabNavigation: React.FC<ViewTabNavigationProps> = ({
  activeTab,
  setActiveTab,
  reservationData
}) => {
  const tabConfig = {
    details: {
      id: "details" as ViewBookingTab,
      label: "Details",
      icon: UserIcon,
      description: "Guest & Booking Information"
    },
    addons: {
      id: "addons" as ViewBookingTab,
      label: "Add-ons",
      icon: PlusCircleIcon,
      description: "Additional Services"
    },
    payment: {
      id: "payment" as ViewBookingTab,
      label: "Payment",
      icon: CreditCardIcon,
      description: "Payment Summary"
    }
  };

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

  const calculateTotal = () => {
    const nights = calculateNights();
    const basePrice = 2500 * nights; // Placeholder - will be dynamic
    const addonsTotal =
      reservationData.addons?.reduce(
        (sum, addon) => sum + addon.totalAmount,
        0
      ) || 0;
    return basePrice + addonsTotal;
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ViewBookingTab)}
        >
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
            {Object.values(tabConfig).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`flex flex-col items-center gap-1 p-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex justify-between items-start">
        {/* Left side: Reservation info */}
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {reservationData.guestName}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {reservationData.roomName} • {calculateNights()} night
            {calculateNights() > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                reservationData.status === "CONFIRMED"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : reservationData.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
              }`}
            >
              {reservationData.status || "UNKNOWN"}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                reservationData.paymentStatus === "PAID"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : reservationData.paymentStatus === "PARTIALLY_PAID"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {reservationData.paymentStatus || "UNPAID"}
            </span>
          </div>
        </div>

        {/* Right side: Tabs and total */}
        <div className="flex flex-col items-end gap-3">
          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ViewBookingTab)}
          >
            <TabsList className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-0 overflow-hidden">
              {Object.values(tabConfig).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-r border-gray-200 dark:border-gray-600 last:border-r-0 ${
                      isActive
                        ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Total Amount */}
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Amount
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ₹{calculateTotal().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTabNavigation;
