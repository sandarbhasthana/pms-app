"use client";
import { useState } from "react";
import { toast } from "sonner";

export default function ManualPaymentForm({
  reservationId,
  onPaymentAdded
}: {
  reservationId: string;
  onPaymentAdded?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("manual");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return toast.error("Amount is required");

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId,
        amount: parseFloat(amount),
        method,
        type: "charge",
        status: "succeeded",
        notes
      })
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed to record payment");
      return;
    }

    toast.success("Payment recorded");
    setAmount("");
    setMethod("manual");
    setNotes("");

    // Refresh the calendar to show updated payment status
    if (onPaymentAdded) {
      onPaymentAdded();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded bg-yellow-50 text-gray-900 dark:bg-blue-950 dark:text-white"
    >
      <h3 className="text-sm font-semibold mb-2">💳 Record Manual Payment</h3>

      <div>
        <label className="block text-xs mb-1">Amount</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder="Enter amount"
        />
      </div>

      <div>
        <label className="block text-xs mb-1">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="manual">Manual</option>
          <option value="cash">Cash</option>
          <option value="stripe">Stripe</option>
          <option value="razorpay">Razorpay</option>
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
          rows={2}
          placeholder="e.g. Received at front desk"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded py-1 text-sm"
      >
        Record Payment
      </button>
    </form>
  );
}
