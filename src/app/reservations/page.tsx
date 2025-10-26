// app/reservations/page.tsx
"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { format, parseISO, isWithinInterval, addDays } from "date-fns";
import {
  MoreVertical,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";

interface Reservation {
  id: string;
  guestName: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: string;
  notes?: string;
  phone?: string;
  email?: string;
  paymentStatus?: string;
  room?: {
    id: string;
    name: string;
    type: string;
  };
}

// simple SWR fetcher with credentials for authentication
const fetcher = (url: string) =>
  fetch(url, {
    credentials: "include" // Include cookies for authentication
  }).then((res) => {
    if (!res.ok) throw new Error("Network error");
    return res.json() as Promise<{ reservations: Reservation[] }>;
  });

const ReservationsPage = () => {
  // — SWR data fetch & revalidate function —
  const { data, error, isValidating } = useSWR("/api/reservations", fetcher, {
    revalidateOnFocus: false
  });
  // Memoize reservations to avoid dependency issues
  const reservations = useMemo(
    () => data?.reservations ?? [],
    [data?.reservations]
  );

  // helper to download a Blob as a file
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // — UI state (unchanged) —
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: "",
    to: ""
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // — Sorting state —
  const [sortField, setSortField] = useState<keyof Reservation | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // — mutation state —
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // — refresh state —
  const [isRefreshing, setIsRefreshing] = useState(false);

  // — Sorting function —
  const handleSort = (field: keyof Reservation) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null); // Reset to no sorting
        setSortDirection("asc");
      }
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1); // Reset to first page when sorting
  };

  // — Refresh handler —
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Revalidate the SWR cache
      await mutate("/api/reservations");
    } catch (error) {
      console.error("Error refreshing reservations:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1. Global report for all reservations (uses current search/filter state)
  const handleFullReport = async () => {
    setLoadingActionId("full"); // you can reuse loadingActionId for global if you like
    setActionError(null);
    try {
      // build query params same as your front-end filters
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      if (customRange.from && customRange.to) {
        params.set("from", customRange.from);
        params.set("to", customRange.to);
      }
      const res = await fetch(`/api/reservations/report?${params.toString()}`, {
        headers: { Accept: "application/pdf" }
      });

      // Check if response is PDF or error JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // If we get here, the response should be a PDF
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `reservations-report.pdf`);
        // Clear any previous errors since download succeeded
        setActionError(null);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      // ignore the benign "Failed to fetch" that still results in a download
      if (!(err instanceof Error && err.message === "Failed to fetch")) {
        console.error("Report generation error:", err);
        setActionError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  // 2. Per-reservation report
  const handleGenerateReport = async (id: string) => {
    setLoadingActionId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/report`, {
        headers: { Accept: "application/pdf" }
      });

      // Check if response is PDF or error JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // If we get here, the response should be a PDF
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `reservation-${id}-report.pdf`);
        // Clear any previous errors since download succeeded
        setActionError(null);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      // ignore the benign "Failed to fetch" that still results in a download
      if (!(err instanceof Error && err.message === "Failed to fetch")) {
        console.error("Report generation error:", err);
        setActionError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  // 3. Per-reservation invoice
  const handleGenerateInvoice = async (id: string) => {
    setLoadingActionId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/invoice`, {
        headers: { Accept: "application/pdf" }
      });

      // Check if response is PDF or error JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Server error: ${res.status}`);
        } else {
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // If we get here, the response should be a PDF
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `reservation-${id}-invoice.pdf`);
        // Clear any previous errors since download succeeded
        setActionError(null);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      // ignore the benign "Failed to fetch" that still results in a download
      if (!(err instanceof Error && err.message === "Failed to fetch")) {
        console.error("Report generation error:", err);
        setActionError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    setLoadingActionId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Delete failed");
      }
      // revalidate the list after successful delete
      await mutate("/api/reservations");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingActionId(null);
    }
  };

  // — Filtering & pagination logic with sorting —
  const filtered = useMemo(() => {
    let d = reservations;

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.guestName.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
      );
    }

    // Apply date range filter
    if (filter !== "all") {
      const now = new Date();
      let range: { start: Date; end: Date } | null = null;
      switch (filter) {
        case "week":
          range = { start: now, end: addDays(now, 7) };
          break;
        case "month":
          range = { start: now, end: addDays(now, 30) };
          break;
        case "year":
          range = { start: now, end: addDays(now, 365) };
          break;
        case "custom":
          if (customRange.from && customRange.to) {
            range = {
              start: parseISO(customRange.from),
              end: parseISO(customRange.to)
            };
          }
          break;
      }
      if (range) {
        d = d.filter((r) =>
          isWithinInterval(parseISO(r.checkIn), {
            start: range.start,
            end: range.end
          })
        );
      }
    }

    // Apply sorting
    if (sortField) {
      d = [...d].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle date fields
        if (sortField === "checkIn" || sortField === "checkOut") {
          aVal = new Date(aVal as string).getTime();
          bVal = new Date(bVal as string).getTime();
        }

        // Handle string fields
        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === "asc" ? -1 : 1;
        if (bVal == null) return sortDirection === "asc" ? 1 : -1;

        // Compare values
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return d;
  }, [reservations, search, filter, customRange, sortField, sortDirection]);

  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // — Sortable header component —
  const SortableHeader = ({
    field,
    children,
    className = "p-2 text-left"
  }: {
    field: keyof Reservation;
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    const isAsc = sortDirection === "asc";

    return (
      <th
        className={`${className} cursor-pointer select-none ${
          isActive
            ? "bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30"
            : ""
        }`}
        onClick={() => handleSort(field)}
        title={`Sort by ${children} ${
          isActive
            ? isAsc
              ? "(ascending)"
              : "(descending)"
            : "- click to sort"
        }`}
      >
        <div className="flex items-center justify-center relative">
          <div className="flex items-center gap-1">
            <span>{children}</span>
            <div className="flex flex-col items-center gap-0.5">
              {/* Filled Up Triangle */}
              <div
                className={`w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent transition-colors duration-300 ${
                  isActive && isAsc
                    ? "border-b-[#7210a2] dark:border-b-[#a855f7]"
                    : "border-b-gray-400 dark:border-b-gray-500"
                }`}
              />
              {/* Filled Down Triangle */}
              <div
                className={`w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent transition-colors duration-300 ${
                  isActive && !isAsc
                    ? "border-t-[#7210a2] dark:border-t-[#a855f7]"
                    : "border-t-gray-400 dark:border-t-gray-500"
                }`}
              />
            </div>
          </div>
          {/* Vertical divider - centered with padding */}
          <div className="absolute right-0 top-0.5 bottom-0.5 w-0.5 bg-gray-500 dark:bg-gray-300"></div>
        </div>
      </th>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reservations</h1>

      {/* Search + Filter + Full Report button */}
      <div className="flex items-center justify-between space-x-4">
        <Input
          placeholder="Search by Name, E-mail or Phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            type="button"
            title="Refresh Reservations"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg ${
              isRefreshing
                ? "text-slate-600 dark:text-slate-400 cursor-not-allowed"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            }`}
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "refresh-spinning" : ""}`}
            />
          </button>

          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              {filter === "all"
                ? "All"
                : filter === "week"
                ? "Next 7 Days"
                : filter === "month"
                ? "Next 30 Days"
                : filter === "year"
                ? "Next Year"
                : "Custom Range"}
            </SelectTrigger>
            <SelectContent className="border-r-[5px]">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="week">Next 7 Days</SelectItem>
              <SelectItem value="month">Next 30 Days</SelectItem>
              <SelectItem value="year">Next Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {filter === "custom" && (
            <div className="flex space-x-2">
              <Input
                type="date"
                value={customRange.from}
                onChange={(e) =>
                  setCustomRange({ ...customRange, from: e.target.value })
                }
                className="rounded-sm"
              />
              <Input
                type="date"
                value={customRange.to}
                onChange={(e) =>
                  setCustomRange({ ...customRange, to: e.target.value })
                }
                className="rounded-sm"
              />
            </div>
          )}

          <Button
            onClick={handleFullReport}
            disabled={loadingActionId === "full"}
            className="bg-purple-500 hover:bg-purple-400 text-white rounded-sm"
          >
            {loadingActionId === "full" ? "Generating…" : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* show global action error or loading */}
      {actionError && (
        <div className="bg-red-50 border display-none border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {actionError}
        </div>
      )}
      {isValidating && !data && (
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin w-4 h-4" />
          <span>Loading reservations…</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Failed to load reservations:</strong>{" "}
          {error.message || "Unknown error occurred"}
        </div>
      )}

      {/* Reservations table */}
      <div className="overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-b from-white to-gray-50 dark:from-[#1e2939] dark:to-[#1a2332] text-gray-700 dark:text-[#f0f8ff] h-14 uppercase border-b border-gray-200 dark:border-gray-700 shadow-sm text-sm font-medium tracking-wider">
              <SortableHeader
                field="guestName"
                className="px-3 py-4 text-center min-w-[140px] rounded-tl-sm rounded-bl-sm"
              >
                Guest
              </SortableHeader>
              <SortableHeader
                field="roomId"
                className="px-3 py-4 text-center min-w-[120px]"
              >
                Room
              </SortableHeader>
              <SortableHeader
                field="checkIn"
                className="px-3 py-4 text-center min-w-[110px]"
              >
                Check-In
              </SortableHeader>
              <SortableHeader
                field="checkOut"
                className="px-3 py-4 text-center min-w-[110px]"
              >
                Check-Out
              </SortableHeader>
              <SortableHeader
                field="adults"
                className="px-3 py-4 text-center min-w-[80px]"
              >
                Adults
              </SortableHeader>
              <SortableHeader
                field="children"
                className="px-3 py-4 text-center min-w-[80px]"
              >
                Children
              </SortableHeader>
              <SortableHeader
                field="status"
                className="px-3 py-4 text-center min-w-[100px]"
              >
                Status
              </SortableHeader>
              <SortableHeader
                field="paymentStatus"
                className="px-3 py-4 text-center min-w-[100px]"
              >
                Payment
              </SortableHeader>
              <th className="px-3 py-4 text-center min-w-[90px] text-gray-700 dark:!text-[#f0f8ff] rounded-tr-sm rounded-br-sm">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr
                key={r.id}
                className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
              >
                <td className="px-3 py-3 text-center">{r.guestName}</td>
                <td className="px-3 py-3 text-center">
                  {r.room?.name || r.roomId}
                </td>
                <td className="px-3 py-3 text-center">
                  {format(parseISO(r.checkIn), "P")}
                </td>
                <td className="px-3 py-3 text-center">
                  {format(parseISO(r.checkOut), "P")}
                </td>
                <td className="px-3 py-3 text-center">{r.adults}</td>
                <td className="px-3 py-3 text-center">{r.children}</td>
                <td className="px-3 py-3 text-center">{r.status}</td>
                <td className="px-3 py-3 text-center">{r.paymentStatus}</td>
                <td className="px-3 py-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleGenerateReport(r.id)}
                        disabled={loadingActionId === r.id}
                      >
                        {loadingActionId === r.id ? (
                          <span className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-1" />
                            Generating…
                          </span>
                        ) : (
                          "Generate Report"
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleGenerateInvoice(r.id)}
                        disabled={loadingActionId === r.id}
                      >
                        {loadingActionId === r.id ? (
                          <span className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-1" />
                            Invoicing…
                          </span>
                        ) : (
                          "Generate Invoice"
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDeleteReservation(r.id)}
                        className="text-red-600"
                        disabled={loadingActionId === r.id}
                      >
                        {loadingActionId === r.id ? (
                          <span className="flex items-center">
                            <Loader2 className="animate-spin w-4 h-4 mr-1" />
                            Deleting…
                          </span>
                        ) : (
                          "Delete Reservation"
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center space-x-2 mt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage(1)}
          disabled={page === 1}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          <ChevronLeft />
        </Button>
        <span>
          Page {page} of {pageCount}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
          disabled={page === pageCount}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPage(pageCount)}
          disabled={page === pageCount}
        >
          <ChevronsRight />
        </Button>
        <div className="flex items-center space-x-1">
          <label htmlFor="pageSize" className="sr-only">
            Items per page
          </label>
          <Input
            id="pageSize"
            type="number"
            min={1}
            value={pageSize}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              setPageSize(val);
              setPage(1);
            }}
            className="w-16 text-center"
          />
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
