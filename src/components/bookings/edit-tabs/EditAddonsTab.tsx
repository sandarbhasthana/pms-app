"use client";

import React, { useState } from "react";
import { EditTabProps, CustomAddon } from "./types";
import {
  PlusCircleIcon,
  HomeIcon,
  CakeIcon,
  StarIcon,
  TrashIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
// Note: Switch component will be imported when available

export const EditAddonsTab: React.FC<EditTabProps> = ({
  reservationData,
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onSave
}) => {
  const [showCustomAddonForm, setShowCustomAddonForm] = useState(false);
  const [newCustomAddon, setNewCustomAddon] = useState<Omit<CustomAddon, "id">>(
    {
      name: "",
      description: "",
      price: 0,
      quantity: 1,
      perNight: true
    }
  );

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

  const handleAddonToggle = (
    addonType: "extraBed" | "breakfast",
    enabled: boolean
  ) => {
    updateFormData({
      addons: {
        ...formData.addons,
        [addonType]: enabled
      }
    });
  };

  const handleAddonQuantityChange = (
    addonType: "extraBedQuantity" | "breakfastQuantity",
    increment: boolean
  ) => {
    const currentValue = formData.addons[addonType];
    const newValue = increment
      ? currentValue + 1
      : Math.max(1, currentValue - 1);

    updateFormData({
      addons: {
        ...formData.addons,
        [addonType]: newValue
      }
    });
  };

  const handleCustomAddonAdd = () => {
    if (!newCustomAddon.name || newCustomAddon.price <= 0) return;

    const customAddon: CustomAddon = {
      ...newCustomAddon,
      id: Date.now().toString() // Simple ID generation
    };

    updateFormData({
      addons: {
        ...formData.addons,
        customAddons: [...formData.addons.customAddons, customAddon]
      }
    });

    // Reset form
    setNewCustomAddon({
      name: "",
      description: "",
      price: 0,
      quantity: 1,
      perNight: true
    });
    setShowCustomAddonForm(false);
  };

  const handleCustomAddonRemove = (addonId: string) => {
    updateFormData({
      addons: {
        ...formData.addons,
        customAddons: formData.addons.customAddons.filter(
          (addon) => addon.id !== addonId
        )
      }
    });
  };

  const calculateAddonTotal = (addon: CustomAddon) => {
    const nights = calculateNights();
    return addon.price * addon.quantity * (addon.perNight ? nights : 1);
  };

  const calculateTotalAddons = () => {
    const nights = calculateNights();
    let total = 0;

    if (formData.addons.extraBed) {
      total += 500 * formData.addons.extraBedQuantity * nights;
    }

    if (formData.addons.breakfast) {
      total += 300 * formData.addons.breakfastQuantity * nights;
    }

    formData.addons.customAddons.forEach((addon) => {
      total += calculateAddonTotal(addon);
    });

    return total;
  };

  return (
    <div className="space-y-6">
      {/* Standard Add-ons Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircleIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Standard Add-ons</h3>
        </div>

        <div className="space-y-4">
          {/* Extra Bed */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:!bg-card rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <HomeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Extra Bed
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Additional bed for extra comfort
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  ₹500 per night
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {formData.addons.extraBed && (
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonQuantityChange("extraBedQuantity", false)
                    }
                    className="px-2 py-1 text-gray-600 dark:text-gray-400"
                  >
                    −
                  </button>
                  <span className="px-3 py-1 text-gray-900 dark:text-gray-100">
                    {formData.addons.extraBedQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonQuantityChange("extraBedQuantity", true)
                    }
                    className="px-2 py-1 text-gray-600 dark:text-gray-400"
                  >
                    +
                  </button>
                </div>
              )}
              <input
                type="checkbox"
                checked={formData.addons.extraBed}
                onChange={(e) =>
                  handleAddonToggle("extraBed", e.target.checked)
                }
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Breakfast */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:!bg-card rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <CakeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Breakfast
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Continental breakfast for guests
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  ₹300 per person per night
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {formData.addons.breakfast && (
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonQuantityChange("breakfastQuantity", false)
                    }
                    className="px-2 py-1 text-gray-600 dark:text-gray-400"
                  >
                    −
                  </button>
                  <span className="px-3 py-1 text-gray-900 dark:text-gray-100">
                    {formData.addons.breakfastQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonQuantityChange("breakfastQuantity", true)
                    }
                    className="px-2 py-1 text-gray-600 dark:text-gray-400"
                  >
                    +
                  </button>
                </div>
              )}
              <input
                type="checkbox"
                checked={formData.addons.breakfast}
                onChange={(e) =>
                  handleAddonToggle("breakfast", e.target.checked)
                }
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Add-ons Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-purple-600 dark:text-white" />
            <h3 className="text-lg font-semibold">Custom Add-ons</h3>
          </div>
          <Button
            onClick={() => setShowCustomAddonForm(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <PlusCircleIcon className="h-4 w-4" />
            Add Custom
          </Button>
        </div>

        {/* Custom Add-ons List */}
        {formData.addons.customAddons.length > 0 ? (
          <div className="space-y-3 mb-4">
            {formData.addons.customAddons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:!bg-card rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <PaperAirplaneIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      ₹{addon.price} × {addon.quantity}{" "}
                      {addon.perNight ? `× ${calculateNights()} nights` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ₹{calculateAddonTotal(addon).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCustomAddonRemove(addon.id)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="Remove add-on"
                    aria-label="Remove add-on"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No custom add-ons added yet
          </p>
        )}

        {/* Custom Add-on Form */}
        {showCustomAddonForm && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
            <h4 className="font-medium mb-3">Add Custom Service</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={newCustomAddon.name}
                  onChange={(e) =>
                    setNewCustomAddon({
                      ...newCustomAddon,
                      name: e.target.value
                    })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                  placeholder="e.g., Airport Transfer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  value={newCustomAddon.price}
                  onChange={(e) =>
                    setNewCustomAddon({
                      ...newCustomAddon,
                      price: Number(e.target.value)
                    })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={newCustomAddon.quantity}
                  onChange={(e) =>
                    setNewCustomAddon({
                      ...newCustomAddon,
                      quantity: Number(e.target.value)
                    })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newCustomAddon.perNight}
                  onChange={(e) =>
                    setNewCustomAddon({
                      ...newCustomAddon,
                      perNight: e.target.checked
                    })
                  }
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <label className="text-sm">Per night</label>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={newCustomAddon.description}
                onChange={(e) =>
                  setNewCustomAddon({
                    ...newCustomAddon,
                    description: e.target.value
                  })
                }
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCustomAddonAdd} size="sm">
                Add Service
              </Button>
              <Button
                onClick={() => setShowCustomAddonForm(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Add-ons from Reservation */}
      {reservationData.addons && reservationData.addons.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <StarIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">
              Current Reservation Add-ons
            </h3>
          </div>

          <div className="space-y-3">
            {reservationData.addons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <StarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      ₹{addon.price} × {addon.quantity}
                      {addon.nights && ` × ${addon.nights} nights`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ₹{addon.totalAmount.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Original
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-600">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> These are the add-ons currently saved with
              this reservation. Use the sections above to modify or add new
              services.
            </p>
          </div>
        </div>
      )}

      {/* Add-ons Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Add-ons Summary</h3>

        <div className="space-y-2">
          {formData.addons.extraBed && (
            <div className="flex justify-between text-sm">
              <span>
                Extra Bed × {formData.addons.extraBedQuantity} ×{" "}
                {calculateNights()} nights
              </span>
              <span>
                ₹
                {(
                  500 *
                  formData.addons.extraBedQuantity *
                  calculateNights()
                ).toLocaleString()}
              </span>
            </div>
          )}

          {formData.addons.breakfast && (
            <div className="flex justify-between text-sm">
              <span>
                Breakfast × {formData.addons.breakfastQuantity} ×{" "}
                {calculateNights()} nights
              </span>
              <span>
                ₹
                {(
                  300 *
                  formData.addons.breakfastQuantity *
                  calculateNights()
                ).toLocaleString()}
              </span>
            </div>
          )}

          {formData.addons.customAddons.map((addon) => (
            <div key={addon.id} className="flex justify-between text-sm">
              <span>
                {addon.name} × {addon.quantity}
                {addon.perNight && ` × ${calculateNights()} nights`}
              </span>
              <span>₹{calculateAddonTotal(addon).toLocaleString()}</span>
            </div>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-3">
            <div className="flex justify-between font-semibold">
              <span>Total Add-ons:</span>
              <span className="text-purple-600 dark:text-purple-400">
                ₹{calculateTotalAddons().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          {onPrevious && (
            <Button onClick={onPrevious} variant="outline">
              ← Back: Details
            </Button>
          )}
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
            Next: Payment →
          </Button>
        )}
      </div>
    </div>
  );
};
