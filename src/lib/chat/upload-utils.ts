/**
 * Chat File Upload Utilities
 * 
 * Helper functions for validating and handling chat file uploads
 */

// Allowed file types for chat
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file for chat upload
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateChatFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

  if (!isImage && !isDocument) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: Images (JPEG, PNG, GIF, WebP) and Documents (PDF, Word, Excel, TXT)',
    };
  }

  return { valid: true };
}

/**
 * Get message type based on file MIME type
 * @param fileType - MIME type of the file
 * @returns 'IMAGE' or 'DOCUMENT'
 */
export function getMessageTypeFromMimeType(fileType: string): 'IMAGE' | 'DOCUMENT' {
  return ALLOWED_IMAGE_TYPES.includes(fileType) ? 'IMAGE' : 'DOCUMENT';
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

