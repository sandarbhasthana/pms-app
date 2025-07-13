import GeneralSettingsFormDebug from "@/components/settings/general/GeneralSettingsFormDebug";

export default function GeneralSettingsDebugPage() {
  return (
    <div className="p-1 max-w-6xl mx-auto">
      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h1 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          🐛 Debug Version - Phone Country Code Only
        </h1>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          This is a debugging version of the GeneralSettingsForm with only a
          simple phone country code dropdown. No geocoding, no maps, no
          country-state-city cascading dropdowns, and no rich text editor.
        </p>
      </div>
      <GeneralSettingsFormDebug />
    </div>
  );
}
