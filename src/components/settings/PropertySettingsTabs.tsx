"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GeneralSettingsFormFixedS3 from "./general/GeneralSettingsFormFixedS3";
import FeesAndChargesTab from "./FeesAndChargesTab";
import { getCookie } from "cookies-next";

interface PropertySettingsTabsProps {
  propertyId?: string;
  onCancel?: () => void;
  isPropertyMode?: boolean;
}

export default function PropertySettingsTabs({
  propertyId: propPropertyId,
  onCancel,
  isPropertyMode: propIsPropertyMode
}: PropertySettingsTabsProps) {
  const [activeTab, setActiveTab] = useState("general");

  // Auto-detect property mode: if there's a propertyId cookie, we're in property mode
  const propertyIdFromCookie = getCookie("propertyId") as string | undefined;
  const effectivePropertyId = propPropertyId || propertyIdFromCookie;
  const effectiveIsPropertyMode = propIsPropertyMode ?? !!effectivePropertyId;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto gap-3 mb-6">
          <TabsTrigger
            value="general"
            className="cursor-pointer border-2 data-[state=active]:bg-[#7210a2]! data-[state=active]:border-transparent! data-[state=active]:text-white! data-[state=active]:shadow-md data-[state=inactive]:bg-transparent data-[state=inactive]:border-[#7210a2] dark:data-[state=inactive]:border-[#9333ea] data-[state=inactive]:text-[#7210a2] dark:data-[state=inactive]:text-[#a855f7] data-[state=inactive]:hover:bg-[#7210a2]/10 dark:data-[state=inactive]:hover:bg-[#9333ea]/20 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="fees"
            className="cursor-pointer border-2 data-[state=active]:bg-[#7210a2]! data-[state=active]:border-transparent! data-[state=active]:text-white! data-[state=active]:shadow-md data-[state=inactive]:bg-transparent data-[state=inactive]:border-[#7210a2] dark:data-[state=inactive]:border-[#9333ea] data-[state=inactive]:text-[#7210a2] dark:data-[state=inactive]:text-[#a855f7] data-[state=inactive]:hover:bg-[#7210a2]/10 dark:data-[state=inactive]:hover:bg-[#9333ea]/20 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200"
          >
            Fees & Charges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsFormFixedS3
            propertyId={effectivePropertyId}
            onCancel={onCancel}
            isPropertyMode={effectiveIsPropertyMode}
          />
        </TabsContent>

        <TabsContent value="fees" className="mt-6">
          <FeesAndChargesTab
            propertyId={effectivePropertyId}
            isPropertyMode={effectiveIsPropertyMode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
