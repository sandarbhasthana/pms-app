/**
 * Fetch Header Image Utility
 *
 * Fetches and caches header images from S3 URLs for PDF generation
 */

// Simple in-memory cache for header images (per request lifecycle)
const imageCache = new Map<string, Buffer>();

/**
 * Fetch an image from a URL and return as Buffer
 * @param imageUrl - The URL of the image to fetch
 * @returns Buffer containing the image data, or null if fetch fails
 */
export async function fetchHeaderImage(
  imageUrl: string | null | undefined
): Promise<Buffer | null> {
  if (!imageUrl) {
    return null;
  }

  // Check cache first
  if (imageCache.has(imageUrl)) {
    return imageCache.get(imageUrl) || null;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/*"
      }
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch header image: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cache the image
    imageCache.set(imageUrl, buffer);

    return buffer;
  } catch (error) {
    console.error("Error fetching header image:", error);
    return null;
  }
}

/**
 * Clear the image cache (useful for long-running processes)
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Get image dimensions from buffer (basic implementation)
 * For more accurate results, consider using a library like sharp or image-size
 */
export function getImageType(buffer: Buffer): "png" | "jpeg" | "unknown" {
  // Check PNG signature
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // Check JPEG signature
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  return "unknown";
}

