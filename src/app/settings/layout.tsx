// File: app/settings/layout.tsx

import React from "react";
import SettingsTabs from "@/components/settings/SettingsTabs";

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <SettingsTabs />
      <div className="mt-6 text-lg">{children}</div>
    </section>
  );
}
