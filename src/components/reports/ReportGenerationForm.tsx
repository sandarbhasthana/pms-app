"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ReportType, ExportFormat } from "@prisma/client";

interface ReportGenerationFormProps {
  onReportGenerated?: () => void;
}

export function ReportGenerationForm({
  onReportGenerated
}: ReportGenerationFormProps) {
  const [properties, setProperties] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "" as ReportType | "",
    format: "PDF" as ExportFormat,
    propertyId: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined
  });

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        const response = await fetch("/api/properties");
        if (response.ok) {
          const data = await response.json();
          // API returns array directly
          const propertiesArray = Array.isArray(data)
            ? data
            : data.properties || [];
          setProperties(propertiesArray);
          // Auto-select first property if available
          if (propertiesArray.length > 0) {
            setFormData((prev) => ({
              ...prev,
              propertyId: propertiesArray[0].id
            }));
          }
        } else {
          console.error(
            "Failed to fetch properties:",
            response.status,
            response.statusText
          );
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      }
    }
    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      toast.error("Please select a report type");
      return;
    }

    if (!formData.propertyId) {
      toast.error("Please select a property");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          format: formData.format,
          propertyId: formData.propertyId,
          startDate: formData.startDate?.toISOString(),
          endDate: formData.endDate?.toISOString()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Report generation started! Check the history tab.");
        // Reset form
        setFormData((prev) => ({
          ...prev,
          type: "" as ReportType | "",
          startDate: undefined,
          endDate: undefined
        }));
        onReportGenerated?.();
      } else {
        toast.error(data.error || "Failed to generate report");
      }
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Report Type, Property, and Format - Inline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-25">
        {/* Report Type */}
        <div className="space-y-2">
          <Label
            htmlFor="type"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Report Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({ ...formData, type: value as ReportType })
            }
          >
            <SelectTrigger
              id="type"
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500/20"
            >
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NIGHT_AUDIT">Night Audit Report</SelectItem>
              <SelectItem value="REVENUE_SUMMARY">Revenue Summary</SelectItem>
              <SelectItem value="PAYMENT_REPORT">Payment Report</SelectItem>
              <SelectItem value="REFUND_REPORT">Refund Report</SelectItem>
              <SelectItem value="TAX_REPORT">Tax Report</SelectItem>
              <SelectItem value="ACCOUNTS_RECEIVABLE">
                Accounts Receivable
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property */}
        <div className="space-y-2">
          <Label
            htmlFor="property"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Property <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.propertyId}
            onValueChange={(value) =>
              setFormData({ ...formData, propertyId: value })
            }
          >
            <SelectTrigger
              id="property"
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500/20"
            >
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label
            htmlFor="format"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Format
          </Label>
          <Select
            value={formData.format}
            onValueChange={(value) =>
              setFormData({ ...formData, format: value as ExportFormat })
            }
          >
            <SelectTrigger
              id="format"
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PDF">PDF</SelectItem>
              <SelectItem value="EXCEL">Excel</SelectItem>
              <SelectItem value="CSV">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Start Date (Optional)
          </Label>
          <div className="relative">
            <DatePicker
              selected={formData.startDate}
              onChange={(date: Date | null) =>
                setFormData({ ...formData, startDate: date || undefined })
              }
              dateFormat="yyyy-MM-dd"
              placeholderText="Pick a date"
              className="w-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md p-2 pl-10 hover:border-purple-400 dark:hover:border-purple-500 focus:border-purple-500 dark:focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
              wrapperClassName="w-full"
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            End Date (Optional)
          </Label>
          <div className="relative">
            <DatePicker
              selected={formData.endDate}
              onChange={(date: Date | null) =>
                setFormData({ ...formData, endDate: date || undefined })
              }
              dateFormat="yyyy-MM-dd"
              placeholderText="Pick a date"
              minDate={formData.startDate || undefined}
              className="w-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md p-2 pl-10 hover:border-purple-400 dark:hover:border-purple-500 focus:border-purple-500 dark:focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
              wrapperClassName="w-full"
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
