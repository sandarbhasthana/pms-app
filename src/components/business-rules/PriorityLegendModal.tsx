"use client";

import { Dialog } from "@headlessui/react";

interface PriorityLegendModalProps {
  open: boolean;
  onClose: () => void;
}

const PriorityLegendModal: React.FC<PriorityLegendModalProps> = ({
  open,
  onClose
}) => {
  const priorityLevels = [
    {
      range: "1-10",
      label: "Critical",
      description: "Protective rules (price floors, caps, compliance)",
      color: "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200",
      borderColor: "border-l-4 border-red-500"
    },
    {
      range: "20-40",
      label: "High",
      description: "Revenue optimization (demand, occupancy, seasonal)",
      color: "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200",
      borderColor: "border-l-4 border-orange-500"
    },
    {
      range: "50-70",
      label: "Medium",
      description: "Standard pricing adjustments (default priority)",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200",
      borderColor: "border-l-4 border-blue-500"
    },
    {
      range: "80-100",
      label: "Low",
      description: "Promotional rules (discounts, last-minute deals)",
      color: "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200",
      borderColor: "border-l-4 border-green-500"
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen bg-black/60 p-4">
        <Dialog.Panel className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg p-6 text-sm text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-red-600"
          >
            ×
          </button>
          <Dialog.Title className="text-lg font-bold mb-6">
            Priority Levels Guide
          </Dialog.Title>

          {/* Priority Levels */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Priority Levels (Lower number = Higher priority)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {priorityLevels.map((level) => (
                <div
                  key={level.range}
                  className={`p-3 rounded-lg ${level.color} ${level.borderColor}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        {level.label} ({level.range})
                      </div>
                      <div className="text-xs mt-1 opacity-90">
                        {level.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Order Info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              How Priority Works
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                • Rules execute in <strong>priority order</strong> (lowest number
                first)
              </li>
              <li>
                • Each rule can <strong>modify the price</strong> for the next
                rule
              </li>
              <li>
                • Example: Priority 10 rule applies first, then Priority 30,
                then Priority 50
              </li>
              <li>
                • Default priority for new rules is <strong>50</strong>
              </li>
            </ul>
          </div>

          {/* Example Execution Flow */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
              Example Execution Flow
            </h4>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Priority 10:</span>
                <span>Base Price ₹2000 → Apply +25% → ₹2500</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Priority 30:</span>
                <span>₹2500 → Apply -10% → ₹2250</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Priority 50:</span>
                <span>₹2250 → Apply +5% → ₹2362.50</span>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PriorityLegendModal;

