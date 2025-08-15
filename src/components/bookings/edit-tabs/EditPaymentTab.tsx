"use client";

import React, { useState } from "react";
import { EditTabProps } from "./types";
import {
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export const EditPaymentTab: React.FC<EditTabProps> = ({
  reservationData,
  formData,
  updateFormData,
  onPrevious,
  onSave,
  onDelete
}) => {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: "cash",
    notes: ""
  });

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

  const calculateTotals = () => {
    const nights = calculateNights();
    const basePrice = 2500 * nights; // Placeholder - will be dynamic

    let addonsTotal = 0;
    if (formData.addons.extraBed) {
      addonsTotal += 500 * formData.addons.extraBedQuantity * nights;
    }
    if (formData.addons.breakfast) {
      addonsTotal += 300 * formData.addons.breakfastQuantity * nights;
    }

    formData.addons.customAddons.forEach((addon) => {
      const addonTotal =
        addon.price * addon.quantity * (addon.perNight ? nights : 1);
      addonsTotal += addonTotal;
    });

    const subtotal = basePrice + addonsTotal;
    const paidAmount = formData.payment.paidAmount;
    const remainingBalance = subtotal - paidAmount;

    return {
      basePrice,
      addonsTotal,
      subtotal,
      paidAmount,
      remainingBalance,
      nights
    };
  };

  const totals = calculateTotals();

  const handlePaymentStatusChange = (
    status: "PAID" | "PARTIALLY_PAID" | "UNPAID"
  ) => {
    updateFormData({
      payment: {
        ...formData.payment,
        paymentStatus: status
      }
    });
  };

  const handlePaymentMethodChange = (method: string) => {
    updateFormData({
      payment: {
        ...formData.payment,
        paymentMethod: method
      }
    });
  };

  const handleAddPayment = () => {
    if (newPayment.amount <= 0) return;

    const newPaidAmount = formData.payment.paidAmount + newPayment.amount;
    const newStatus =
      newPaidAmount >= totals.subtotal ? "PAID" : "PARTIALLY_PAID";

    updateFormData({
      payment: {
        ...formData.payment,
        paidAmount: newPaidAmount,
        paymentStatus: newStatus,
        paymentMethod: newPayment.method
      }
    });

    // Reset form
    setNewPayment({ amount: 0, method: "cash", notes: "" });
    setShowAddPayment(false);
  };

  const getPaymentStatusIcon = () => {
    switch (formData.payment.paymentStatus) {
      case "PAID":
        return CheckCircleIcon;
      case "PARTIALLY_PAID":
        return ClockIcon;
      case "UNPAID":
      default:
        return ExclamationTriangleIcon;
    }
  };

  const getPaymentStatusColor = () => {
    switch (formData.payment.paymentStatus) {
      case "PAID":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700";
      case "PARTIALLY_PAID":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700";
      case "UNPAID":
      default:
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700";
    }
  };

  const PaymentStatusIcon = getPaymentStatusIcon();

  return (
    <div className="space-y-6">
      {/* Payment Status Management */}
      <div className={`rounded-lg p-6 border ${getPaymentStatusColor()}`}>
        <div className="flex items-center gap-3 mb-4">
          <PaymentStatusIcon className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Payment Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm opacity-80 mb-1">Total Amount</p>
            <p className="text-2xl font-bold">
              ₹{totals.subtotal.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm opacity-80 mb-1">Paid Amount</p>
            <p className="text-2xl font-bold">
              ₹{totals.paidAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm opacity-80 mb-1">Remaining Balance</p>
            <p className="text-2xl font-bold">
              ₹{totals.remainingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Status
            </label>
            <Select
              value={formData.payment.paymentStatus}
              onValueChange={(value: "PAID" | "PARTIALLY_PAID" | "UNPAID") =>
                handlePaymentStatusChange(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <Select
              value={formData.payment.paymentMethod}
              onValueChange={handlePaymentMethodChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <BanknotesIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Booking Summary</h3>
        </div>

        <div className="space-y-3">
          {/* Room Rate */}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 dark:text-gray-400">
              Room Rate ({totals.nights} night{totals.nights > 1 ? "s" : ""})
            </span>
            <span className="font-medium">
              ₹{totals.basePrice.toLocaleString()}
            </span>
          </div>

          {/* Add-ons */}
          {formData.addons.extraBed && (
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400 pl-4">
                Extra Bed × {formData.addons.extraBedQuantity} × {totals.nights}{" "}
                nights
              </span>
              <span className="font-medium">
                ₹
                {(
                  500 *
                  formData.addons.extraBedQuantity *
                  totals.nights
                ).toLocaleString()}
              </span>
            </div>
          )}

          {formData.addons.breakfast && (
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400 pl-4">
                Breakfast × {formData.addons.breakfastQuantity} ×{" "}
                {totals.nights} nights
              </span>
              <span className="font-medium">
                ₹
                {(
                  300 *
                  formData.addons.breakfastQuantity *
                  totals.nights
                ).toLocaleString()}
              </span>
            </div>
          )}

          {formData.addons.customAddons.map((addon) => (
            <div
              key={addon.id}
              className="flex justify-between items-center py-2 text-sm"
            >
              <span className="text-gray-600 dark:text-gray-400 pl-4">
                {addon.name} × {addon.quantity}
                {addon.perNight && ` × ${totals.nights} nights`}
              </span>
              <span className="font-medium">
                ₹
                {(
                  addon.price *
                  addon.quantity *
                  (addon.perNight ? totals.nights : 1)
                ).toLocaleString()}
              </span>
            </div>
          ))}

          {totals.addonsTotal > 0 && (
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">
                Add-ons Total
              </span>
              <span className="font-medium">
                ₹{totals.addonsTotal.toLocaleString()}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>

          {/* Total */}
          <div className="flex justify-between items-center py-2">
            <span className="text-lg font-semibold">Total Amount</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              ₹{totals.subtotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Add Payment Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Payment Management</h3>
          </div>
          {totals.remainingBalance > 0 && (
            <Button
              onClick={() => setShowAddPayment(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Payment
            </Button>
          )}
        </div>

        {showAddPayment && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-3">Record New Payment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      amount: Number(e.target.value)
                    })
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                  placeholder="0"
                  min="0"
                  max={totals.remainingBalance}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Method
                </label>
                <Select
                  value={newPayment.method}
                  onValueChange={(value) =>
                    setNewPayment({ ...newPayment, method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={newPayment.notes}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, notes: e.target.value })
                }
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                rows={2}
                placeholder="Optional payment notes"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddPayment} size="sm">
                Record Payment
              </Button>
              <Button
                onClick={() => setShowAddPayment(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {totals.remainingBalance <= 0 ? (
          <div className="text-center py-4 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Payment Complete</p>
            <p className="text-sm">This reservation is fully paid</p>
          </div>
        ) : (
          <div className="text-center py-4 text-yellow-600 dark:text-yellow-400">
            <ClockIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">
              Outstanding Balance: ₹{totals.remainingBalance.toLocaleString()}
            </p>
            <p className="text-sm">Add payments to complete the booking</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        {onPrevious && (
          <Button onClick={onPrevious} variant="outline">
            ← Back: Add-ons
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            onClick={onDelete}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            Delete Booking
          </Button>
          <Button
            onClick={onSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
