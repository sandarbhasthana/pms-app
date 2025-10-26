/**
 * Image processing utilities for ID document handling
 */

/**
 * Crops face photo from ID document using Canvas API with tight cropping
 * @param documentImageBase64 - Base64 encoded full document image (data:image/jpeg;base64,...)
 * @param coordinates - Face photo location {x, y, width, height} in pixels
 * @param tightCrop - If true, reduces padding around face for tighter crop (default: true)
 * @returns Promise<string> - Base64 encoded cropped face image
 */
export function cropFaceFromDocument(
  documentImageBase64: string,
  coordinates: { x: number; y: number; width: number; height: number },
  tightCrop: boolean = true
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas and context
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Create image element
      const img = new Image();

      img.onload = () => {
        try {
          let cropX = coordinates.x;
          let cropY = coordinates.y;
          let cropWidth = coordinates.width;
          let cropHeight = coordinates.height;

          // Apply tight cropping by reducing padding
          if (tightCrop) {
            // Reduce padding by 5% on each side to get a tighter crop
            const paddingX = Math.round(cropWidth * 0.05);
            const paddingY = Math.round(cropHeight * 0.05);

            cropX = Math.max(0, cropX + paddingX);
            cropY = Math.max(0, cropY + paddingY);
            cropWidth = Math.max(1, cropWidth - paddingX * 2);
            cropHeight = Math.max(1, cropHeight - paddingY * 2);
          }

          // Validate adjusted coordinates are within image bounds
          if (
            cropX < 0 ||
            cropY < 0 ||
            cropX + cropWidth > img.width ||
            cropY + cropHeight > img.height
          ) {
            reject(
              new Error(
                `Coordinates out of bounds. Image: ${img.width}x${img.height}, Crop: ${cropX},${cropY} ${cropWidth}x${cropHeight}`
              )
            );
            return;
          }

          // Set canvas size to cropped dimensions
          canvas.width = cropWidth;
          canvas.height = cropHeight;

          // Draw cropped portion from source image to canvas
          ctx.drawImage(
            img,
            cropX, // Source X
            cropY, // Source Y
            cropWidth, // Source width
            cropHeight, // Source height
            0, // Destination X
            0, // Destination Y
            cropWidth, // Destination width
            cropHeight // Destination height
          );

          // Convert canvas to base64 JPEG with 90% quality
          const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
          resolve(croppedBase64);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for cropping"));
      };

      // Set image source to trigger loading
      img.src = documentImageBase64;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Resizes an image to fit within max dimensions while maintaining aspect ratio
 * @param imageBase64 - Base64 encoded image
 * @param maxWidth - Maximum width in pixels (default: 500)
 * @param maxHeight - Maximum height in pixels (default: 500)
 * @returns Promise<string> - Base64 encoded resized image
 */
export function resizeImage(
  imageBase64: string,
  maxWidth: number = 500,
  maxHeight: number = 500
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions maintaining aspect ratio
          let newWidth = img.width;
          let newHeight = img.height;

          if (img.width > maxWidth || img.height > maxHeight) {
            const widthRatio = maxWidth / img.width;
            const heightRatio = maxHeight / img.height;
            const ratio = Math.min(widthRatio, heightRatio);

            newWidth = Math.round(img.width * ratio);
            newHeight = Math.round(img.height * ratio);
          }

          // Create canvas and resize
          const canvas = document.createElement("canvas");
          canvas.width = newWidth;
          canvas.height = newHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Convert to base64 JPEG with 90% quality
          const resizedBase64 = canvas.toDataURL("image/jpeg", 0.9);
          resolve(resizedBase64);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for resizing"));
      };

      img.src = imageBase64;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Converts a base64 data URL to a File object
 * @param dataUrl - Base64 data URL (data:image/jpeg;base64,...)
 * @param filename - Desired filename
 * @returns File object
 */
export function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Uploads an image to S3 using presigned URL
 * @param imageBase64 - Base64 encoded image
 * @param filename - Desired filename
 * @param folder - S3 folder (e.g., 'guests' or 'documents')
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function uploadImageToS3(
  imageBase64: string,
  filename: string,
  folder: string
): Promise<string> {
  try {
    // Convert base64 to File
    const file = dataURLtoFile(imageBase64, filename);

    // Get presigned URL
    const presignResponse = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filename: `${folder}/${filename}`,
        contentType: file.type
      })
    });

    if (!presignResponse.ok) {
      throw new Error("Failed to get presigned URL");
    }

    const { presignedUrl, publicUrl } = await presignResponse.json();

    // Upload to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image to S3");
    }

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image to S3:", error);
    throw error;
  }
}

/**
 * Uploads both guest face and ID document images to S3
 * @param croppedFaceBase64 - Base64 encoded cropped face image
 * @param fullDocumentBase64 - Base64 encoded full document image
 * @param guestName - Guest name for filename generation
 * @returns Promise<{personImageUrl: string, documentImageUrl: string}>
 */
export async function uploadGuestImages(
  croppedFaceBase64: string,
  fullDocumentBase64: string,
  guestName: string
): Promise<{
  personImageUrl: string;
  documentImageUrl: string;
}> {
  const timestamp = Date.now();
  const sanitizedName = guestName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  // Upload both images in parallel
  const [personImageUrl, documentImageUrl] = await Promise.all([
    uploadImageToS3(
      croppedFaceBase64,
      `${timestamp}_${sanitizedName}_face.jpg`,
      "guests"
    ),
    uploadImageToS3(
      fullDocumentBase64,
      `${timestamp}_${sanitizedName}_id_document.jpg`,
      "documents"
    )
  ]);

  return {
    personImageUrl,
    documentImageUrl
  };
}
