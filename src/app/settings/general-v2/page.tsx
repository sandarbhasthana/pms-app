import GeneralSettingsFormOptimized from "@/components/settings/general/GeneralSettingsFormOptimized";

export default function GeneralSettingsPageV2() {
  return (
    <div className="p-1 max-w-6xl mx-auto">
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          🚀 <strong>Optimized Version</strong> - This is the performance-optimized version of the General Settings page.
        </p>
      </div>
      <GeneralSettingsFormOptimized />
    </div>
  );
}
