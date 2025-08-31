//import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { withTenantContext } from "@/lib/tenant";

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

    // Fetch reservation details
    const reservation = await withTenantContext(orgId, (tx) =>
      tx.reservation.findUnique({ where: { id } })
    );
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

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

    // Header
    doc.fontSize(20).text("Reservation Report", { align: "center" });
    doc.moveDown();

    // Body
    doc.fontSize(12);
    doc.text(`Reservation ID: ${reservation.id}`);
    doc.text(`Guest Name: ${reservation.guestName}`);
    doc.text(`Room ID: ${reservation.roomId}`);
    doc.text(`Check-In: ${reservation.checkIn.toString()}`);
    doc.text(`Check-Out: ${reservation.checkOut.toString()}`);
    doc.text(`Adults: ${reservation.adults}`);
    doc.text(`Children: ${reservation.children}`);
    doc.text(`Status: ${reservation.status}`);
    if (reservation.notes) {
      doc.text(`Notes: ${reservation.notes}`);
    }

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
