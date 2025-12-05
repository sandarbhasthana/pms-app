/**
 * PDF Header Utility
 *
 * Adds print header image or fallback text header to PDF documents
 */

import PDFDocument from "pdfkit";
import path from "path";
import { fetchHeaderImage } from "./fetch-header-image";

// A4 dimensions in points (72 points per inch)
export const PDF_PAGE = {
  WIDTH: 595.28, // A4 width
  HEIGHT: 841.89, // A4 height
  MARGIN: 50
};

// Header takes 1/3 of page height as requested
export const HEADER_HEIGHT = PDF_PAGE.HEIGHT / 3;

export interface HeaderConfig {
  printHeaderImageUrl?: string | null;
  propertyName: string;
  propertyAddress?: string;
  propertyPhone?: string;
  propertyEmail?: string;
}

/**
 * Add print header to PDF document
 * Uses header image if available, otherwise falls back to text header with property name
 *
 * @param doc - PDFKit document instance
 * @param config - Header configuration
 * @returns Y position where content should start (after header)
 */
export async function addPrintHeader(
  doc: typeof PDFDocument.prototype,
  config: HeaderConfig
): Promise<number> {
  const { printHeaderImageUrl } = config;

  // Try to add image header
  if (printHeaderImageUrl) {
    const imageBuffer = await fetchHeaderImage(printHeaderImageUrl);

    if (imageBuffer) {
      try {
        // Calculate dimensions - full width, 1/3 page height
        const imageWidth = PDF_PAGE.WIDTH - PDF_PAGE.MARGIN * 2;
        const imageHeight = HEADER_HEIGHT - 40; // Leave some padding

        // Add image centered at top
        doc.image(imageBuffer, PDF_PAGE.MARGIN, 20, {
          fit: [imageWidth, imageHeight],
          align: "center",
          valign: "center"
        });

        // Return Y position after header (1/3 of page + small padding)
        return HEADER_HEIGHT + 10;
      } catch (error) {
        console.error("Error adding header image to PDF:", error);
        // Fall through to text header
      }
    }
  }

  // Fallback: Text header with property name
  return addTextHeader(doc, config);
}

/**
 * Add text-based header as fallback when no image is available
 */
function addTextHeader(
  doc: typeof PDFDocument.prototype,
  config: HeaderConfig
): number {
  const { propertyName, propertyAddress, propertyPhone, propertyEmail } =
    config;

  const fontBoldPath = path.join(
    process.cwd(),
    "public/fonts/FiraSans-Bold.ttf"
  );
  const fontPath = path.join(
    process.cwd(),
    "public/fonts/FiraSans-Regular.ttf"
  );

  // Property name - large and centered
  doc
    .font(fontBoldPath)
    .fontSize(28)
    .fillColor("#7210a2")
    .text(propertyName, PDF_PAGE.MARGIN, 40, {
      width: PDF_PAGE.WIDTH - PDF_PAGE.MARGIN * 2,
      align: "center"
    });

  let currentY = 80;

  // Property address if available
  if (propertyAddress) {
    doc
      .font(fontPath)
      .fontSize(11)
      .fillColor("#374151")
      .text(propertyAddress, PDF_PAGE.MARGIN, currentY, {
        width: PDF_PAGE.WIDTH - PDF_PAGE.MARGIN * 2,
        align: "center"
      });
    currentY += 18;
  }

  // Contact info line
  const contactParts: string[] = [];
  if (propertyPhone) contactParts.push(propertyPhone);
  if (propertyEmail) contactParts.push(propertyEmail);

  if (contactParts.length > 0) {
    doc
      .font(fontPath)
      .fontSize(10)
      .fillColor("#6b7280")
      .text(contactParts.join(" | "), PDF_PAGE.MARGIN, currentY, {
        width: PDF_PAGE.WIDTH - PDF_PAGE.MARGIN * 2,
        align: "center"
      });
    currentY += 16;
  }

  // Divider line
  currentY += 10;
  doc
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .moveTo(PDF_PAGE.MARGIN, currentY)
    .lineTo(PDF_PAGE.WIDTH - PDF_PAGE.MARGIN, currentY)
    .stroke();

  // Reset font to regular
  doc.font(fontPath).fillColor("#000000");

  return currentY + 20;
}
