// File: app/admin/settings/layout.tsx

import React from "react";
import AdminSettingsTabs from "@/components/admin/AdminSettingsTabs";

export default function AdminSettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Admin Settings</h1>
      <AdminSettingsTabs />
      <div className="mt-6 text-lg">{children}</div>
    </section>
  );
}
