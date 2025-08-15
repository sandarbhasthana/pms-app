"use client";

import React from "react";
import { ViewTabProps } from "./types";
import {
  PlusCircleIcon,
  HomeIcon,
  CakeIcon,
  StarIcon
} from "@heroicons/react/24/outline";

export const ViewAddonsTab: React.FC<ViewTabProps> = ({ reservationData }) => {
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

  // For now, use reservationData.addons. In future, this will be populated from backend

  // For now, show placeholder data. In future, use reservationData.addons
  const addons = reservationData.addons || [];
  const hasAddons = addons.length > 0;

  const getAddonIcon = (type: string) => {
    switch (type) {
      case "extra_bed":
        return HomeIcon;
      case "breakfast":
        return CakeIcon;
      default:
        return StarIcon;
    }
  };

  const calculateAddonsTotal = () => {
    return addons.reduce((sum, addon) => sum + addon.totalAmount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Selected Add-ons Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircleIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Selected Add-ons</h3>
        </div>

        {hasAddons ? (
          <div className="space-y-4">
            {addons.map((addon) => {
              const IconComponent = getAddonIcon(addon.type);

              return (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <IconComponent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {addon.name}
                      </h4>
                      {addon.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {addon.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>₹{addon.price.toLocaleString()}</span>
                        {addon.quantity > 1 && (
                          <>
                            <span>×</span>
                            <span>
                              {addon.quantity}{" "}
                              {addon.type === "breakfast" ? "guests" : "units"}
                            </span>
                          </>
                        )}
                        {(addon.nights || calculateNights()) > 1 && (
                          <>
                            <span>×</span>
                            <span>
                              {addon.nights || calculateNights()} nights
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      ₹{addon.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <PlusCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              No add-ons selected
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              This reservation does not include any additional services
            </p>
          </div>
        )}
      </div>

      {/* Add-ons Summary */}
      {hasAddons && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Add-ons Summary</h3>

          <div className="space-y-3">
            {addons.map((addon) => (
              <div key={addon.id} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {addon.name}
                  {addon.quantity > 1 && ` (${addon.quantity})`}
                  {(addon.nights || calculateNights()) > 1 &&
                    ` × ${addon.nights || calculateNights()} nights`}
                </span>
                <span className="font-medium">
                  ₹{addon.totalAmount.toLocaleString()}
                </span>
              </div>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Add-ons:</span>
                <span className="text-purple-600 dark:text-purple-400">
                  ₹{calculateAddonsTotal().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Add-ons Info (for future enhancement) */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded">
            <PlusCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Add-ons Information
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Add-ons can be modified by editing the reservation. Contact front
              desk for assistance with changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
