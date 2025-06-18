"use client";

export default function LegendBar() {
  const legends = [
    { label: "Paid", color: "bg-green-500 text-white" },
    { label: "Partially Paid", color: "bg-orange-500 text-black" },
    { label: "Unpaid", color: "bg-pink-500 text-white" }
    // 🆕 add more as you go (e.g., Checked Out, Cancelled, etc.)
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
      {legends.map((item) => (
        <div
          key={item.label}
          className={`flex items-center space-x-2 px-3 py-1 rounded ${item.color}`}
        >
          <span className="w-3 h-3 rounded-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white inline-block" />
          <span className="text-sm text-gray-900 dark:text-white">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
