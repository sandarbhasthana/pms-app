/**
 * Excel Report Generator
 *
 * Generates Excel reports using ExcelJS
 */

import ExcelJS from "exceljs";
import { ReportData } from "../types";
import { fetchHeaderImage } from "../utils/fetch-header-image";

// Header takes first 6 rows
const HEADER_ROWS = 6;

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

    // Calculate total content width (5 columns * 20 width = 100 units)
    const totalColumns = 5;
    const lastColumnLetter = String.fromCharCode(64 + totalColumns); // 'E'

    // Add header image or fallback text in first 6 rows
    let headerImageAdded = false;
    if (data.printHeader?.imageUrl) {
      try {
        const imageBuffer = await fetchHeaderImage(data.printHeader.imageUrl);
        if (imageBuffer) {
          // Add image to workbook
          // Type assertion needed due to ExcelJS type definition mismatch with Node.js Buffer
          const imageId = workbook.addImage({
            buffer: imageBuffer as unknown as ExcelJS.Buffer,
            extension: "png"
          });

          // Merge cells for header area (rows 1-6, columns A-E)
          worksheet.mergeCells(`A1:${lastColumnLetter}${HEADER_ROWS}`);

          // Set row heights for header area
          for (let i = 1; i <= HEADER_ROWS; i++) {
            worksheet.getRow(i).height = 30; // ~180 total height
          }

          // Add image spanning the header area
          // Type assertion needed due to ExcelJS type definition expecting full Anchor type
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            br: { col: totalColumns, row: HEADER_ROWS },
            editAs: "oneCell"
          } as unknown as ExcelJS.ImageRange);

          headerImageAdded = true;
        }
      } catch (error) {
        console.error("Failed to add header image to Excel:", error);
      }
    }

    // Fallback: Add property name as text header if no image
    if (!headerImageAdded) {
      // Merge cells for header area
      worksheet.mergeCells(`A1:${lastColumnLetter}${HEADER_ROWS}`);

      // Set row heights for header area
      for (let i = 1; i <= HEADER_ROWS; i++) {
        worksheet.getRow(i).height = 30;
      }

      const headerCell = worksheet.getCell("A1");
      headerCell.value = data.propertyName || data.organizationName;
      headerCell.font = { size: 24, bold: true, color: { argb: "FF7210A2" } };
      headerCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };
      headerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3E8FF" } // Light purple background
      };
    }

    // Content starts after header rows
    let currentRow = HEADER_ROWS + 2; // Add a blank row after header

    // Add title
    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = data.title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add subtitle if exists
    currentRow++;
    if (data.subtitle) {
      worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
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
      worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
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
