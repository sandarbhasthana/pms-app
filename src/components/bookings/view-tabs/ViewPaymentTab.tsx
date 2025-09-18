"use client";

import React from "react";
import { ViewTabProps } from "./types";
import {
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

export const ViewPaymentTab: React.FC<ViewTabProps> = ({ reservationData }) => {
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

  const calculateTotals = () => {
    const nights = calculateNights();
    const basePricePerNight = 2500; // Placeholder - will be dynamic
    const basePrice = basePricePerNight * nights;

    const addonsTotal =
      reservationData.addons?.reduce(
        (sum, addon) => sum + addon.totalAmount,
        0
      ) || 0;
    const subtotal = basePrice + addonsTotal;

    // Use actual payment data if available, otherwise calculate suggested amounts
    const totalAmount = reservationData.totalAmount || subtotal;
    const paidAmount = reservationData.paidAmount || 0;
    const remainingBalance = totalAmount - paidAmount;

    return {
      basePrice,
      addonsTotal,
      subtotal: totalAmount,
      paidAmount,
      remainingBalance,
      nights
    };
  };

  const totals = calculateTotals();

  const getPaymentStatusIcon = () => {
    switch (reservationData.paymentStatus || "UNPAID") {
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
    switch (reservationData.paymentStatus || "UNPAID") {
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
      {/* Payment Status Overview */}
      <div className={`rounded-lg p-6 border ${getPaymentStatusColor()}`}>
        <div className="flex items-center gap-3 mb-4">
          <PaymentStatusIcon className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Payment Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          {totals.addonsTotal > 0 && (
            <>
              {reservationData.addons?.map((addon) => (
                <div
                  key={addon.id}
                  className="flex justify-between items-center py-2 text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400 pl-4">
                    {addon.name}
                    {addon.quantity > 1 && ` (${addon.quantity})`}
                    {addon.nights &&
                      addon.nights > 1 &&
                      ` × ${addon.nights} nights`}
                  </span>
                  <span className="font-medium">
                    ₹{addon.totalAmount.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Add-ons Total
                </span>
                <span className="font-medium">
                  ₹{totals.addonsTotal.toLocaleString()}
                </span>
              </div>
            </>
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

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <CreditCardIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Payment History</h3>
        </div>

        {reservationData.payments && reservationData.payments.length > 0 ? (
          <div className="space-y-3">
            {reservationData.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium capitalize">
                      {payment.method}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === "COMPLETED" ||
                        payment.status === "succeeded"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : payment.status === "PENDING" ||
                            payment.status === "processing"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(payment.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>

                  {/* Stripe Payment Details */}
                  {payment.method === "card" && payment.paymentMethod && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCardIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium capitalize">
                          {payment.paymentMethod.cardBrand || "Card"}
                        </span>
                        <span className="text-gray-500">
                          ••••{payment.paymentMethod.cardLast4}
                        </span>
                        {payment.paymentMethod.cardExpMonth &&
                          payment.paymentMethod.cardExpYear && (
                            <span className="text-gray-500">
                              {payment.paymentMethod.cardExpMonth
                                .toString()
                                .padStart(2, "0")}
                              /
                              {payment.paymentMethod.cardExpYear
                                .toString()
                                .slice(-2)}
                            </span>
                          )}
                      </div>
                      {payment.gatewayTxId && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Transaction ID: {payment.gatewayTxId}
                        </p>
                      )}
                    </div>
                  )}

                  {payment.notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {payment.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    ₹{payment.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {payment.currency}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              No payments recorded
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Payment history will appear here once payments are processed
            </p>
          </div>
        )}
      </div>

      {/* Payment Actions Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded">
            <CreditCardIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Payment Management
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              To process payments or modify payment details, use the Edit
              Reservation option or contact the front desk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
