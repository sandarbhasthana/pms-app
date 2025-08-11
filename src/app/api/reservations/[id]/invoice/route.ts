import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { withTenantContext } from "@/lib/tenant";
import { calculatePaymentStatus } from "@/lib/payments/utils";

type ReservationData = {
  id: string;
  guestName: string | null;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  notes: string | null;
  phone: string | null;
  email: string | null;
  status: string;
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

    // Fetch reservation + payment details
    const params = await context.params;
    const reservation: ReservationData | null = await withTenantContext(
      orgId,
      (tx) =>
        tx.reservation.findUnique({
          where: { id: params.id },
          select: {
            id: true,
            guestName: true,
            roomId: true,
            checkIn: true,
            checkOut: true,
            adults: true,
            children: true,
            notes: true,
            phone: true,
            email: true,
            status: true
          }
        })
    );
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // Calculate payment status
    const paymentStatus = await calculatePaymentStatus(params.id, orgId);

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
    doc.fontSize(20).text("Reservation Invoice", { align: "center" });
    doc.moveDown();

    // Body
    doc.fontSize(12);
    doc.text(`Reservation ID: ${reservation.id}`);
    doc.text(`Guest Name: ${reservation.guestName}`);
    doc.text(`Room ID: ${reservation.roomId}`);
    doc.text(`Check-In: ${reservation.checkIn.toString()}`);
    doc.text(`Check-Out: ${reservation.checkOut.toString()}`);
    doc.moveDown();

    // Example line-items (customize to your pricing model)
    doc.text("Charges:");
    doc.list([
      `Room (${reservation.adults + reservation.children} pax): $XXX`,
      "Taxes & Fees: $YYY"
    ]);
    doc.moveDown();
    doc.text(`Total Due: $ZZZ`);
    doc.text(`Payment Status: ${paymentStatus || "Unknown"}`);

    doc.end();
    const pdf = await pdfReady;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reservation-${reservation.id}-invoice.pdf"`
      }
    });
  } catch (error) {
    console.error("Error generating reservation invoice:", error);
    return NextResponse.json(
      {
        error: "Failed to generate invoice",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
