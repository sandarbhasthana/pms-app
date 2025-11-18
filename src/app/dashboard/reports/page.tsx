"use client";

import { useState } from "react";
import { BarChart3, FileText, Clock, AlertTriangle } from "lucide-react";
import { ReportGenerationForm } from "@/components/reports/ReportGenerationForm";
import { ReportHistoryList } from "@/components/reports/ReportHistoryList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("generate");

  // Check if running on Vercel
  const isVercel =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("vercel.com"));

  const handleReportGenerated = () => {
    // Refresh the history list when a new report is generated
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Vercel Warning Banner */}
      {isVercel && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-900 dark:text-orange-200 font-semibold">
            Reports Not Available on Vercel
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-300">
            Background report generation requires persistent server connections
            which are not supported on Vercel's serverless platform. Please use
            the Railway deployment to access report features.
          </AlertDescription>
        </Alert>
      )}

      {/* Page Header - Matching Dashboard Style */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-500/10 rounded-xl shadow-sm">
            <BarChart3 className="h-7 w-7 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Reports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Generate and download property reports
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Professional Tab Design */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        {/* Tab Navigation - Matching Dashboard Style */}
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 h-11">
          <TabsTrigger
            value="generate"
            className="flex items-center gap-2 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all rounded-md"
            style={{
              backgroundColor:
                activeTab === "generate"
                  ? document.documentElement.classList.contains("dark")
                    ? "#8b4aff"
                    : "#7210a2"
                  : "transparent"
            }}
            onMouseEnter={(e) => {
              if (activeTab === "generate") {
                e.currentTarget.style.backgroundColor = "#8b5cf6";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab === "generate") {
                e.currentTarget.style.backgroundColor =
                  document.documentElement.classList.contains("dark")
                    ? "#8b4aff"
                    : "#7210a2";
              }
            }}
          >
            <FileText className="h-4 w-4" />
            <span className="font-medium">Generate Report</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all rounded-md"
            style={{
              backgroundColor:
                activeTab === "history"
                  ? document.documentElement.classList.contains("dark")
                    ? "#8b4aff"
                    : "#7210a2"
                  : "transparent"
            }}
            onMouseEnter={(e) => {
              if (activeTab === "history") {
                e.currentTarget.style.backgroundColor = "#8b5cf6";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab === "history") {
                e.currentTarget.style.backgroundColor =
                  document.documentElement.classList.contains("dark")
                    ? "#8b4aff"
                    : "#7210a2";
              }
            }}
          >
            <Clock className="h-4 w-4" />
            <span className="font-medium">Report History</span>
          </TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Generate New Report
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select report type, format, and date range to generate a new
                report
              </p>
            </div>
            <div className="p-6">
              <ReportGenerationForm onReportGenerated={handleReportGenerated} />
            </div>
          </div>
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Generated Reports
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                View and download previously generated reports
              </p>
            </div>
            <div className="p-6">
              <ReportHistoryList key={refreshKey} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
