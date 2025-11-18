/**
 * Excel Report Generator
 *
 * Generates Excel reports using ExcelJS
 */

import ExcelJS from "exceljs";
import { ReportData } from "../types";

export async function generateExcel(data: ReportData): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    // Set column widths
    worksheet.columns = [
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 }
    ];

    // Add title
    worksheet.mergeCells("A1:E1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = data.title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add subtitle if exists
    let currentRow = 2;
    if (data.subtitle) {
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const subtitleCell = worksheet.getCell(`A${currentRow}`);
      subtitleCell.value = data.subtitle;
      subtitleCell.font = { size: 12 };
      subtitleCell.alignment = { horizontal: "center" };
      currentRow++;
    }

    // Add blank row
    currentRow++;

    // Add metadata
    worksheet.getCell(`A${currentRow}`).value = "Organization:";
    worksheet.getCell(`B${currentRow}`).value = data.organizationName;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    if (data.propertyName) {
      worksheet.getCell(`A${currentRow}`).value = "Property:";
      worksheet.getCell(`B${currentRow}`).value = data.propertyName;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
    }

    if (data.dateRange) {
      worksheet.getCell(`A${currentRow}`).value = "Date Range:";
      worksheet.getCell(
        `B${currentRow}`
      ).value = `${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
    }

    worksheet.getCell(`A${currentRow}`).value = "Generated:";
    worksheet.getCell(
      `B${currentRow}`
    ).value = `${data.generatedAt.toLocaleString()} by ${data.generatedBy}`;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow += 2;

    // Add summary if exists
    if (data.summary && Object.keys(data.summary).length > 0) {
      worksheet.getCell(`A${currentRow}`).value = "Summary";
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow++;

      Object.entries(data.summary).forEach(([key, value]) => {
        // Skip emptyMessage in summary section (will be shown separately)
        if (key === "emptyMessage") return;

        const label = key.replace(/([A-Z])/g, " $1").trim();
        const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
        worksheet.getCell(`A${currentRow}`).value = `${displayLabel}:`;
        worksheet.getCell(`B${currentRow}`).value = value;
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;
      });

      currentRow += 2;
    }

    // Check for empty message
    const emptyMessage = data.summary?.emptyMessage;
    if (emptyMessage && typeof emptyMessage === "string") {
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const emptyCell = worksheet.getCell(`A${currentRow}`);
      emptyCell.value = emptyMessage;
      emptyCell.font = { size: 12, bold: true, color: { argb: "FFF59E0B" } };
      emptyCell.alignment = { horizontal: "center", vertical: "middle" };
      emptyCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" } // Light yellow background
      };
      currentRow += 2;
    }

    // Add data table
    if (data.data && data.data.length > 0) {
      const headers = Object.keys(data.data[0]).map((key) =>
        key.replace(/([A-Z])/g, " $1").trim()
      );

      // Add headers
      const headerRow = worksheet.getRow(currentRow);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF7210A2" } // Purple
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      currentRow++;

      // Add data rows
      data.data.forEach((row) => {
        const dataRow = worksheet.getRow(currentRow);
        Object.values(row).forEach((value, index) => {
          dataRow.getCell(index + 1).value = value;
        });
        currentRow++;
      });

      // Add borders to table
      const tableRange = `A${
        currentRow - data.data.length - 1
      }:${String.fromCharCode(64 + headers.length)}${currentRow - 1}`;
      worksheet.getCell(tableRange).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error("Error generating Excel:", error);
    throw new Error("Failed to generate Excel report");
  }
}
