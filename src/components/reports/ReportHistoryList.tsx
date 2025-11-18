"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ReportStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  type: string;
  format: string;
  status: ReportStatus;
  fileSize: number | null;
  s3Key: string | null;
  expiresAt: string | Date | null;
  generatedAt: string | Date | null;
  error: string | null;
}

export function ReportHistoryList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/reports/history");
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    setDownloading(reportId);
    try {
      const response = await fetch(`/api/reports/${reportId}/download`);
      const data = await response.json();

      if (response.ok && data.downloadUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = ""; // Let browser determine filename from URL
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download started");
      } else {
        toast.error(data.error || "Failed to download report");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download report");
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (reportId: string) => {
    // Confirm deletion
    if (
      !confirm(
        "Are you sure you want to delete this report? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(reportId);
    try {
      const response = await fetch(`/api/reports/${reportId}/delete`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Report deleted successfully");
        // Remove from local state
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        toast.error(data.error || "Failed to delete report");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete report");
    } finally {
      setDeleting(null);
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-slate-600" />;
      case "PENDING":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    const variants: Record<ReportStatus, string> = {
      PENDING:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      PROCESSING:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      COMPLETED:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      CANCELLED:
        "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
    };

    return (
      <Badge className={cn("flex items-center gap-1", variants[status])}>
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "N/A";

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "Invalid date";
      }
      return format(dateObj, "MMM dd, yyyy HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getTimeUntilDeletion = (expiresAt: string | Date | null) => {
    if (!expiresAt) return "N/A";

    try {
      const now = new Date();
      const expiry = new Date(expiresAt);

      // Check if date is valid
      if (isNaN(expiry.getTime())) {
        return "Invalid date";
      }

      const hoursLeft = Math.max(
        0,
        Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))
      );

      if (hoursLeft < 1) {
        return "< 1 hour";
      } else if (hoursLeft < 24) {
        return `${hoursLeft} hours`;
      } else {
        const daysLeft = Math.floor(hoursLeft / 24);
        return `${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
      }
    } catch (error) {
      console.error("Error calculating time until deletion:", error);
      return "N/A";
    }
  };

  const formatReportType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
        <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
          No reports generated yet
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate your first report using the form in the Generate Report tab
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                Report Type
              </TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                Format
              </TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                Status
              </TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                Generated
              </TableHead>
              <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                Expires In
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow
                key={report.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
              >
                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                  {formatReportType(report.type)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    {report.format}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(report.status)}</TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(report.generatedAt)}
                </TableCell>
                <TableCell>
                  {report.status === "COMPLETED" ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 w-fit bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                    >
                      <Clock className="h-3 w-3" />
                      {getTimeUntilDeletion(report.expiresAt)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      -
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {report.status === "COMPLETED" && report.s3Key ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                          disabled={
                            downloading === report.id || deleting === report.id
                          }
                        >
                          {downloading === report.id ||
                          deleting === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => handleDownload(report.id)}
                          disabled={downloading === report.id}
                          className="cursor-pointer"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(report.id)}
                          disabled={deleting === report.id}
                          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : report.status === "COMPLETED" && !report.s3Key ? (
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                      No file available
                    </span>
                  ) : report.status === "FAILED" ? (
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {report.error || "Generation failed"}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400 italic flex items-center justify-end gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Automatic Deletion Policy</p>
            <p className="text-blue-700 dark:text-blue-300">
              Reports are automatically deleted after 7 days to save storage
              space. Please download important reports before they expire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
