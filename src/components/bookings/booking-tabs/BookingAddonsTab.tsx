"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookingTabProps } from "./types";

export const BookingAddonsTab: React.FC<BookingTabProps> = ({
  formData,
  updateFormData,
  selectedSlot,
  onNext,
  onPrevious
}) => {
  const handleAddonChange = (addonType: 'extraBed' | 'breakfast', checked: boolean) => {
    updateFormData({
      addons: {
        ...formData.addons,
        [addonType]: checked
      }
    });
  };

  const calculateAddonsTotal = () => {
    let total = 0;
    if (formData.addons.extraBed) total += 500;
    if (formData.addons.breakfast) total += 300;
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Add-ons Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Additional Services</h3>
        
        <div className="space-y-4">
          {/* Extra Bed */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="extraBed"
                checked={formData.addons.extraBed}
                onCheckedChange={(checked) => handleAddonChange('extraBed', checked as boolean)}
              />
              <div>
                <label htmlFor="extraBed" className="text-sm font-medium cursor-pointer">
                  Extra Bed
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Additional bed for extra guest
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">₹500</p>
              <p className="text-xs text-gray-500">per night</p>
            </div>
          </div>

          {/* Breakfast */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="breakfast"
                checked={formData.addons.breakfast}
                onCheckedChange={(checked) => handleAddonChange('breakfast', checked as boolean)}
              />
              <div>
                <label htmlFor="breakfast" className="text-sm font-medium cursor-pointer">
                  Breakfast
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Continental breakfast for all guests
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">₹300</p>
              <p className="text-xs text-gray-500">per person/day</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          <p>📝 <strong>Note:</strong> This is a basic implementation for Phase 1.</p>
          <p>Custom add-ons and dynamic pricing will be added in Phase 2.</p>
        </div>
      </div>

      {/* Add-ons Summary */}
      {calculateAddonsTotal() > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold mb-2">Selected Add-ons</h4>
          <div className="space-y-1 text-sm">
            {formData.addons.extraBed && (
              <div className="flex justify-between">
                <span>Extra Bed (1 night)</span>
                <span>₹500</span>
              </div>
            )}
            {formData.addons.breakfast && (
              <div className="flex justify-between">
                <span>Breakfast ({formData.adults + formData.childrenCount} guests)</span>
                <span>₹{300 * (formData.adults + formData.childrenCount)}</span>
              </div>
            )}
            <div className="border-t border-blue-200 dark:border-blue-600 pt-1 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Add-ons Total</span>
                <span>₹{calculateAddonsTotal()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          className="border-gray-300 dark:border-gray-600"
        >
          ← Previous: Details
        </Button>
        <Button
          onClick={onNext}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          Next: Payment →
        </Button>
      </div>
    </div>
  );
};
