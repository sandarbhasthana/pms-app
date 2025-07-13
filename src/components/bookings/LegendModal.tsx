// components/LegendModal.tsx

"use client";

import { Dialog } from "@headlessui/react";
import LegendBar from "@/components/bookings/LegendBar";

interface LegendModalProps {
  open: boolean;
  onClose: () => void;
}

const LegendModal: React.FC<LegendModalProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen bg-black/60 p-4">
        <Dialog.Panel className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg p-6 text-sm text-gray-900 dark:text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-red-600"
          >
            ×
          </button>
          <Dialog.Title className="text-lg font-bold mb-4">Legend</Dialog.Title>

          {/* Inject section-wise legends */}
          <LegendBar />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default LegendModal;
