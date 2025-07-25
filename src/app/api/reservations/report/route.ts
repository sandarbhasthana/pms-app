import path from "path";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { withTenantContext } from "@/lib/tenant";
import { parseISO } from "date-fns";

export const runtime = "nodejs";

// Type for the reservation data returned from the database query
type ReservationFromDB = {
  id: string;
  guestName: string | null;
  email: string | null;
  phone: string | null;
  checkIn: Date;
  checkOut: Date;
  status: string;
};

export async function GET(req: NextRequest) {
  try {
    const orgId = req.cookies.get("orgId")?.value;
    if (!orgId)
      return NextResponse.json({ error: "Missing org" }, { status: 400 });

    // fetch all reservations in tenant
    let all: ReservationFromDB[] = await withTenantContext(orgId, (tx) =>
      tx.reservation.findMany({ where: { organizationId: orgId } })
    );

    // apply optional filters from query
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const filter = searchParams.get("filter");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (r) =>
          r.guestName?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
      );
    }
    if (filter && filter !== "all" && from && to) {
      const start = parseISO(from as string);
      const end = parseISO(to as string);
      all = all.filter((r) => {
        const ci = new Date(r.checkIn);
        return ci >= start && ci <= end;
      });
    }

    // generate PDF with custom font to avoid .afm file issues
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
    const pdfReady = new Promise<Buffer>((resolve) =>
      doc.on("end", () => resolve(Buffer.concat(buffers)))
    );

    doc
      .fontSize(18)
      .text("All Reservations Report", { align: "center" })
      .moveDown();
    all.forEach((r) => {
      doc
        .fontSize(12)
        .text(
          `ID: ${r.id} | Guest: ${
            r.guestName || "N/A"
          } | In: ${r.checkIn.toDateString()} | Out: ${r.checkOut.toDateString()} | Status: ${
            r.status
          }`
        )
        .moveDown(0.5);
    });

    doc.end();
    const pdf = await pdfReady;
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reservations-report.pdf"`
      }
    });
  } catch (error) {
    console.error("Error generating reservations report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
