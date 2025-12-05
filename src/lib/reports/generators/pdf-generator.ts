/**
 * PDF Report Generator
 *
 * Generates PDF reports using PDFKit (same as existing invoice generation)
 */

import PDFDocument from "pdfkit";
import path from "path";
import { ReportData } from "../types";
import { addPrintHeader, HeaderConfig } from "../utils/pdf-header";

export async function generatePDF(data: ReportData): Promise<Buffer> {
  try {
    // Use custom fonts to avoid .afm file issues
    const fontPath = path.join(
      process.cwd(),
      "public/fonts/FiraSans-Regular.ttf"
    );
    const fontBoldPath = path.join(
      process.cwd(),
      "public/fonts/FiraSans-Bold.ttf"
    );

    // Create document with custom font
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      autoFirstPage: false,
      font: fontPath
    });

    // Add the first page
    doc.addPage();

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    // Define theme colors
    const primaryColor = "#7210a2"; // Purple
    const secondaryColor = "#f3f4f6"; // Light gray
    const textColor = "#1f2937"; // Dark gray
    const borderColor = "#d1d5db"; // Border gray

    // Build header config from ReportData
    const headerConfig: HeaderConfig = {
      printHeaderImageUrl: data.printHeader?.imageUrl,
      propertyName: data.propertyName || data.organizationName,
      propertyAddress: data.printHeader?.propertyAddress,
      propertyPhone: data.printHeader?.propertyPhone,
      propertyEmail: data.printHeader?.propertyEmail
    };

    // Add print header (image or fallback text)
    const contentStartY = await addPrintHeader(doc, headerConfig);

    // Title with purple text
    doc
      .strokeColor(primaryColor)
      .fontSize(20)
      .font(fontPath)
      .text(data.title, 50, contentStartY, {
        width: doc.page.width - 100,
        align: "center"
      });

    doc.moveDown(1.5);
    doc.fillColor(textColor);

    // Subtitle if exists
    if (data.subtitle) {
      doc
        .fontSize(14)
        .fillColor("#6b7280")
        .text(data.subtitle, { align: "center" });
      doc.moveDown(1.5);
    }

    // Property Details Table
    const tableStartY = doc.y;
    const tableWidth = doc.page.width - 100;
    const rowHeight = 25;
    const col1Width = tableWidth * 0.3; // 30% for labels
    const col2Width = tableWidth * 0.7; // 70% for values
    let currentY = tableStartY;

    // Table header
    doc
      .rect(50, currentY, tableWidth, rowHeight)
      .fillAndStroke(primaryColor, primaryColor);
    doc
      .fillColor("#ffffff")
      .fontSize(12)
      .font(fontPath)
      .text("Property Details", 60, currentY + 7, { width: tableWidth - 20 });

    currentY += rowHeight;
    doc.fillColor(textColor);

    // Organization row
    doc.rect(50, currentY, col1Width, rowHeight).stroke(borderColor);
    doc
      .rect(50 + col1Width, currentY, col2Width, rowHeight)
      .stroke(borderColor);

    // Save the Y position for this row
    const orgRowY = currentY;

    doc
      .fontSize(10)
      .font(fontPath)
      .fillColor("#6b7280")
      .text("Organization:", 60, orgRowY + 7, {
        width: col1Width - 20,
        lineBreak: false
      });

    doc
      .font(fontBoldPath)
      .fillColor(textColor)
      .text(data.organizationName, 50 + col1Width + 10, orgRowY + 7, {
        width: col2Width - 20,
        align: "center",
        lineBreak: false
      });

    currentY += rowHeight;

    // Property row
    if (data.propertyName) {
      doc.rect(50, currentY, col1Width, rowHeight).stroke(borderColor);
      doc
        .rect(50 + col1Width, currentY, col2Width, rowHeight)
        .stroke(borderColor);

      const propRowY = currentY;

      doc
        .fontSize(10)
        .font(fontPath)
        .fillColor("#6b7280")
        .text("Property:", 60, propRowY + 7, {
          width: col1Width - 20,
          lineBreak: false
        });

      doc
        .font(fontBoldPath)
        .fillColor(textColor)
        .text(data.propertyName, 50 + col1Width + 10, propRowY + 7, {
          width: col2Width - 20,
          align: "center",
          lineBreak: false
        });

      currentY += rowHeight;
    }

    // Date Range row
    if (data.dateRange) {
      doc.rect(50, currentY, col1Width, rowHeight).stroke(borderColor);
      doc
        .rect(50 + col1Width, currentY, col2Width, rowHeight)
        .stroke(borderColor);

      const dateRowY = currentY;

      doc
        .fontSize(10)
        .font(fontPath)
        .fillColor("#6b7280")
        .text("Date Range:", 60, dateRowY + 7, {
          width: col1Width - 20,
          lineBreak: false
        });

      doc
        .font(fontPath)
        .fillColor(textColor)
        .text(
          `${data.dateRange.start.toLocaleDateString()} - ${data.dateRange.end.toLocaleDateString()}`,
          50 + col1Width + 10,
          dateRowY + 7,
          {
            width: col2Width - 20,
            align: "center",
            lineBreak: false
          }
        );

      currentY += rowHeight;
    }

    doc.moveDown(2);

    // Summary section if exists
    if (data.summary && Object.keys(data.summary).length > 0) {
      const summaryY = doc.y;

      // Summary header
      doc
        .rect(50, summaryY, tableWidth, rowHeight)
        .fillAndStroke(primaryColor, primaryColor);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font(fontPath)
        .text("Summary", 60, summaryY + 7, { width: tableWidth - 20 });

      currentY = summaryY + rowHeight;
      doc.fillColor(textColor).font(fontPath);

      // Summary rows in 2-column table format
      let rowIndex = 0;
      Object.entries(data.summary).forEach(([key, value]) => {
        // Skip emptyMessage in summary section (will be shown separately)
        if (key === "emptyMessage") return;

        const label = key.replace(/([A-Z])/g, " $1").trim();
        const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

        const summaryRowY = currentY;

        // Alternate row colors
        if (rowIndex % 2 === 0) {
          doc
            .rect(50, summaryRowY, col1Width, rowHeight)
            .fillAndStroke(secondaryColor, borderColor);
          doc
            .rect(50 + col1Width, summaryRowY, col2Width, rowHeight)
            .fillAndStroke(secondaryColor, borderColor);
        } else {
          doc.rect(50, summaryRowY, col1Width, rowHeight).stroke(borderColor);
          doc
            .rect(50 + col1Width, summaryRowY, col2Width, rowHeight)
            .stroke(borderColor);
        }

        // Label in first column
        doc
          .fillColor("#6b7280")
          .fontSize(10)
          .font(fontPath)
          .text(displayLabel + ":", 60, summaryRowY + 7, {
            width: col1Width - 20,
            lineBreak: false
          });

        // Value in second column (centered)
        doc
          .fillColor(textColor)
          .font(fontPath)
          .text(String(value), 50 + col1Width + 10, summaryRowY + 7, {
            width: col2Width - 20,
            align: "center",
            lineBreak: false
          });

        currentY += rowHeight;
        rowIndex++;
      });

      doc.moveDown(2);
    }

    // Check for empty message
    const emptyMessage = data.summary?.emptyMessage;
    if (emptyMessage && typeof emptyMessage === "string") {
      doc
        .fontSize(12)
        .fillColor("#f59e0b")
        .font(fontPath)
        .text(emptyMessage, { align: "center" });
      doc.moveDown(2);
      doc.fillColor(textColor);
    }

    // Data table
    if (data.data && data.data.length > 0) {
      const detailsY = doc.y;

      // Details header
      doc
        .rect(50, detailsY, tableWidth, rowHeight)
        .fillAndStroke(primaryColor, primaryColor);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font(fontPath)
        .text("Details", 60, detailsY + 7, { width: tableWidth - 20 });

      doc.moveDown(1);

      // Create data table
      const headers = Object.keys(data.data[0]).map((key) =>
        key.replace(/([A-Z])/g, " $1").trim()
      );

      const startX = 50;
      let startY = doc.y;
      const colWidth = (doc.page.width - 100) / headers.length;
      const dataRowHeight = 22;

      // Draw header row
      doc
        .rect(startX, startY, doc.page.width - 100, dataRowHeight)
        .fillAndStroke(primaryColor, primaryColor);

      doc.fillColor("#ffffff").fontSize(9).font(fontPath);
      headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidth + 5, startY + 6, {
          width: colWidth - 10,
          align: "left"
        });
      });

      startY += dataRowHeight;
      doc.fillColor(textColor);

      // Draw data rows
      data.data.forEach((row, rowIndex) => {
        if (startY > doc.page.height - 120) {
          doc.addPage();
          startY = 50;
        }

        // Alternate row colors
        if (rowIndex % 2 === 0) {
          doc
            .rect(startX, startY, doc.page.width - 100, dataRowHeight)
            .fillAndStroke(secondaryColor, borderColor);
        } else {
          doc
            .rect(startX, startY, doc.page.width - 100, dataRowHeight)
            .stroke(borderColor);
        }

        doc.fillColor(textColor).fontSize(8).font(fontPath);
        Object.values(row).forEach((value, i) => {
          doc.text(String(value ?? ""), startX + i * colWidth + 5, startY + 6, {
            width: colWidth - 10,
            align: "left"
          });
        });

        startY += dataRowHeight;
      });
    }

    // Signature section - placed dynamically after content
    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor("#6b7280")
      .font(fontPath)
      .text(
        "This is an automated report generated by the Property Management System.",
        50,
        doc.y,
        { align: "center" }
      );

    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor(textColor)
      .font(fontPath)
      .text(
        `Generated on ${data.generatedAt.toLocaleDateString()} at ${data.generatedAt.toLocaleTimeString()}`,
        50,
        doc.y,
        { align: "center" }
      );

    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor("#6b7280")
      .font(fontPath)
      .text(`By: ${data.generatedBy}`, 50, doc.y, { align: "center" });

    doc.end();
    const pdfBuffer = await pdfReady;
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF report");
  }
}
