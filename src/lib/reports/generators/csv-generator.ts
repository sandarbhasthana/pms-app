/**
 * CSV Report Generator
 *
 * Generates CSV reports
 */

import { ReportData } from "../types";

export async function generateCSV(data: ReportData): Promise<Buffer> {
  try {
    const lines: string[] = [];

    // Add title
    lines.push(`"${data.title}"`);
    lines.push("");

    // Add subtitle if exists
    if (data.subtitle) {
      lines.push(`"${data.subtitle}"`);
      lines.push("");
    }

    // Add metadata
    lines.push(`"Organization:","${data.organizationName}"`);

    if (data.propertyName) {
      lines.push(`"Property:","${data.propertyName}"`);
    }

    if (data.dateRange) {
      lines.push(
        `"Date Range:","${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}"`
      );
    }

    lines.push(
      `"Generated:","${data.generatedAt.toLocaleString()} by ${
        data.generatedBy
      }"`
    );
    lines.push("");

    // Add summary if exists
    if (data.summary && Object.keys(data.summary).length > 0) {
      lines.push('"Summary"');

      Object.entries(data.summary).forEach(([key, value]) => {
        // Skip emptyMessage in summary section (will be shown separately)
        if (key === "emptyMessage") return;

        const label = key.replace(/([A-Z])/g, " $1").trim();
        const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
        lines.push(`"${displayLabel}:","${value}"`);
      });

      lines.push("");
    }

    // Check for empty message
    const emptyMessage = data.summary?.emptyMessage;
    if (emptyMessage && typeof emptyMessage === "string") {
      lines.push(`"${emptyMessage}"`);
      lines.push("");
    }

    // Add data table
    if (data.data && data.data.length > 0) {
      // Add headers
      const headers = Object.keys(data.data[0]).map((key) =>
        key.replace(/([A-Z])/g, " $1").trim()
      );
      lines.push(headers.map((h) => `"${h}"`).join(","));

      // Add data rows
      data.data.forEach((row) => {
        const values = Object.values(row).map((value) => {
          // Escape quotes and wrap in quotes
          const stringValue = String(value ?? "");
          return `"${stringValue.replace(/"/g, '""')}"`;
        });
        lines.push(values.join(","));
      });
    }

    // Convert to buffer
    const csvContent = lines.join("\n");
    const buffer = Buffer.from(csvContent, "utf-8");
    return buffer;
  } catch (error) {
    console.error("Error generating CSV:", error);
    throw new Error("Failed to generate CSV report");
  }
}
