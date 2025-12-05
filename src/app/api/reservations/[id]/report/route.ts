//import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { withTenantContext } from "@/lib/tenant";
import { calculatePaymentStatus } from "@/lib/payments/utils";
import { addPrintHeader, HeaderConfig } from "@/lib/reports/utils/pdf-header";

type PropertySettingsData = {
  propertyName: string;
  printHeaderImage: string | null;
  propertyPhone: string;
  propertyEmail: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    // Fetch reservation details with room information
    const reservation = await withTenantContext(orgId, (tx) =>
      tx.reservation.findUnique({
        where: { id },
        include: {
          room: {
            select: { id: true, name: true, type: true }
          }
        }
      })
    );
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Fetch property settings for print header
    const propertySettings: PropertySettingsData | null =
      await withTenantContext(orgId, (tx) =>
        tx.propertySettings.findUnique({
          where: { propertyId: reservation.propertyId },
          select: {
            propertyName: true,
            printHeaderImage: true,
            propertyPhone: true,
            propertyEmail: true,
            street: true,
            city: true,
            state: true,
            zip: true,
            country: true
          }
        })
      );

    // Build header config
    const headerConfig: HeaderConfig = {
      printHeaderImageUrl: propertySettings?.printHeaderImage,
      propertyName: propertySettings?.propertyName || "Property",
      propertyAddress: propertySettings
        ? `${propertySettings.street}, ${propertySettings.city}, ${propertySettings.state} ${propertySettings.zip}, ${propertySettings.country}`
        : undefined,
      propertyPhone: propertySettings?.propertyPhone,
      propertyEmail: propertySettings?.propertyEmail
    };

    // Calculate payment status
    const paymentStatus = await calculatePaymentStatus(id, orgId);

    // Create PDF with custom font to avoid .afm file issues
    const fontPath = path.join(
      process.cwd(),
      "public/fonts/FiraSans-Regular.ttf"
    );

    // Create document with minimal options and custom font path
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      autoFirstPage: false,
      font: fontPath // Pass font path directly in constructor
    });

    // Add the first page - font should already be set
    doc.addPage();

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });

    // Add print header (image or fallback text)
    const contentStartY = await addPrintHeader(doc, headerConfig);

    // Document title
    doc
      .fontSize(18)
      .text("RESERVATION REPORT", 50, contentStartY, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, {
      align: "center"
    });
    doc.moveDown(1.5);

    // Invoice-style table
    const startX = 50;
    const startY = doc.y;
    const tableWidth = 500;
    const rowHeight = 25;
    const colWidth = tableWidth / 2;

    // Table header
    doc
      .rect(startX, startY, tableWidth, rowHeight)
      .fillAndStroke("#f3f4f6", "#d1d5db");
    doc.fillColor("#374151").fontSize(12);
    doc.text("RESERVATION DETAILS", startX + 10, startY + 8, {
      width: tableWidth - 20,
      align: "center"
    });

    let currentY = startY + rowHeight;

    // Table rows data
    const tableData = [
      ["Reservation ID", reservation.id],
      ["Guest Name", reservation.guestName || "N/A"],
      ["Room Number", reservation.room?.name || reservation.roomId],
      ["Room Type", reservation.room?.type || "N/A"],
      ["Check-In Date", reservation.checkIn.toLocaleDateString()],
      ["Check-Out Date", reservation.checkOut.toLocaleDateString()],
      ["Adults", reservation.adults.toString()],
      ["Children", reservation.children.toString()],
      ["Status", reservation.status],
      ["Payment Status", paymentStatus]
    ];

    // Add notes row if exists
    if (reservation.notes) {
      tableData.push(["Notes", reservation.notes]);
    }

    // Draw table rows
    tableData.forEach((row, index) => {
      const isEvenRow = index % 2 === 0;

      // Row background
      if (isEvenRow) {
        doc
          .rect(startX, currentY, tableWidth, rowHeight)
          .fillAndStroke("#f9fafb", "#e5e7eb");
      } else {
        doc.rect(startX, currentY, tableWidth, rowHeight).stroke("#e5e7eb");
      }

      // Left column (label)
      doc.fillColor("#374151").fontSize(10);
      doc.text(row[0], startX + 10, currentY + 8, { width: colWidth - 20 });

      // Right column (value)
      doc.fillColor("#111827").fontSize(10);
      doc.text(row[1], startX + colWidth + 10, currentY + 8, {
        width: colWidth - 20
      });

      currentY += rowHeight;
    });

    // Footer
    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor("#6b7280")
      .text(
        "This is an automated report generated by the Property Management System.",
        { align: "center" }
      );

    doc.end();
    const pdf = await pdfReady;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reservation-${reservation.id}-report.pdf"`
      }
    });
  } catch (error) {
    console.error("Error generating reservation report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
