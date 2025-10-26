# OpenAI Vision API Integration for ID Document Processing

## 📋 Overview

This document outlines the implementation plan for integrating OpenAI Vision API to automatically extract information from government-issued ID documents (Passport, SSN, Driving License) in the NewBookingSheet component.

## 🎯 Objectives

1. **Camera Integration**: Enable camera access to capture ID document images
2. **Single Image Capture**:
   - Capture full ID document (contains both person photo and document data)
   - Extract person's face photo from document using coordinates
   - Store both cropped face and full document separately
3. **OpenAI Vision Processing**: Send document image to OpenAI Vision API for intelligent parsing
4. **Data Extraction**: Extract and structure the following information:
   - Person's full name
   - ID document type (Passport, SSN, Driving License, etc.)
   - ID number
   - Issuing country
   - Expiry date (for validity check)
   - Face photo coordinates (for client-side cropping)
5. **Client-Side Image Processing**: Crop face photo from document using Canvas API
6. **Document Validation**: Check expiry date and alert user if document is expired
7. **Auto-Population**: Automatically populate NewBookingSheet form fields with extracted data
8. **Manual Upload Support**: Maintain existing upload functionality for pre-captured images

## 🏗️ Architecture

### Current State

```
BookingDetailsTab
├── Image Upload (File Input) ✅ Exists
├── Take Photo Button ✅ Exists
└── IDScannerWithOCR (Tesseract.js) ✅ Exists - Basic OCR
```

### Target State

```
BookingDetailsTab
├── Image Upload (File Input) ✅ Keep
├── Take Photo Button → Enhanced with OpenAI (single capture)
├── IDScannerWithAI (New Component)
│   ├── Camera Access (react-webcam)
│   ├── Document Frame Guide Overlay
│   ├── Capture Full ID Document
│   ├── OpenAI Vision API Call
│   │   ├── Extract: Name, ID Type, Number, Country, Expiry
│   │   └── Extract: Face Photo Coordinates
│   ├── Client-Side Face Cropping (Canvas API)
│   ├── Validate Expiry Date
│   ├── Upload Cropped Face → Guest Profile
│   ├── Upload Full Document → Documents Tab
│   └── Auto-populate Form Fields
└── API Route: /api/ai/process-id
    ├── Receives base64 document image
    ├── Calls OpenAI Vision API
    ├── Extracts structured data + expiry date + face coordinates
    ├── Validates document expiry
    ├── Returns structured JSON with validity status
    └── Handles errors gracefully
```

## 📦 Required Dependencies

### New Packages to Install

```bash
npm install openai
```

### Existing Dependencies (Already Installed)

- `react-webcam` - Camera access
- `@aws-sdk/client-s3` - Image storage to S3
- `@aws-sdk/s3-request-presigner` - S3 presigned URLs

## 🔐 Environment Variables

Add to `.env.local`:

```bash
# OpenAI Configuration
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4o"  # or "gpt-4-vision-preview"
OPENAI_MAX_TOKENS=1000
```

## 📝 Implementation Plan

### Phase 1: API Route Setup (Day 1)

#### 1.1 Create OpenAI API Route

**File**: `src/app/api/ai/process-id/route.ts`

**Responsibilities**:

- Accept base64 encoded image
- Call OpenAI Vision API with structured prompt
- Parse and validate response
- Return structured JSON

**Request Format**:

```typescript
{
  documentImageBase64: string; // base64 encoded document image
  imageType: string; // "image/png" or "image/jpeg"
}
```

**Response Format**:

```typescript
{
  success: boolean;
  data?: {
    fullName: string;
    idType: "passport" | "ssn" | "driving_license" | "national_id" | "other";
    idNumber: string;
    issuingCountry: string;
    expiryDate: string;      // ISO format: "YYYY-MM-DD"
    isExpired: boolean;      // Calculated based on current date
    daysUntilExpiry: number; // Negative if expired

    // NEW: Face photo coordinates for client-side cropping
    facePhotoLocation: {
      x: number;      // X coordinate in pixels
      y: number;      // Y coordinate in pixels
      width: number;  // Width in pixels
      height: number; // Height in pixels
    } | null;  // null if face not detected

    confidence: number;      // 0-1 scale
  };
  error?: string;
  warning?: string;  // For expired or soon-to-expire documents
}
```

**OpenAI Prompt Strategy**:

```
You are an expert at extracting information from government-issued ID documents.
Analyze the provided image and extract the following information in JSON format:

{
  "fullName": "Full name as it appears on the document",
  "idType": "passport | ssn | driving_license | national_id | other",
  "idNumber": "The document/ID number",
  "issuingCountry": "Country that issued the document (ISO 3166-1 alpha-2 code)",
  "expiryDate": "Expiry/expiration date in YYYY-MM-DD format",
  "issueDate": "Issue date in YYYY-MM-DD format (if visible)",
  "dateOfBirth": "Date of birth in YYYY-MM-DD format (if visible)",
  "facePhotoLocation": {
    "x": 50,
    "y": 100,
    "width": 200,
    "height": 250
  },
  "confidence": 0.95
}

Rules:
- Return ONLY valid JSON, no additional text
- Use null for missing fields
- Confidence should be 0-1 (1 = very confident)
- For idType, choose the most appropriate category
- For issuingCountry, use 2-letter ISO codes (US, IN, GB, etc.)
- For dates, always use YYYY-MM-DD format (convert if needed)
- Look for expiry date labels: "Expiry", "Expires", "Valid Until", "Expiration Date", etc.
- If expiry date is not found, set it to null
- For facePhotoLocation, identify the person's photo on the document and return its coordinates
- Coordinates should be in pixels: {x, y, width, height}
- If no face photo is visible on the document, set facePhotoLocation to null
```

#### 1.2 Document Validation Logic

**Expiry Date Validation**:

```typescript
function validateDocumentExpiry(expiryDate: string) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isExpired: daysUntilExpiry < 0,
    daysUntilExpiry,
    isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
    warningMessage:
      daysUntilExpiry < 0
        ? `⚠️ This document expired ${Math.abs(daysUntilExpiry)} days ago`
        : daysUntilExpiry <= 30
        ? `⚠️ This document will expire in ${daysUntilExpiry} days`
        : null
  };
}
```

#### 1.3 Error Handling

- Invalid image format
- OpenAI API errors (rate limits, timeouts)
- Low confidence results (< 0.7)
- Missing required fields (especially expiry date)
- Expired documents (show alert but allow override)
- Network failures

### Phase 2: Component Updates (Day 2)

#### 2.1 Create New ID Scanner Component

**File**: `src/components/bookings/IDScannerWithAI.tsx`

**Features**:

- **Single capture process**: Capture full ID document only
- Camera access using `react-webcam`
- Document frame guide overlay for proper positioning
- Capture button with loading state
- Preview captured image
- Call `/api/ai/process-id` for document processing
- Client-side face cropping using Canvas API
- Display processing status
- Show extracted data with expiry validation
- Alert dialog for expired documents
- Retry mechanism

**UI Flow**:

```
1. Open Scanner → Show camera with document frame guide
2. Show live video feed with document frame overlay
3. User positions ID document in frame
4. User clicks "Capture Document" → Show preview with "Processing..." overlay
5. Call OpenAI API → Show spinner
6. OpenAI returns data + face coordinates
7. Client-side: Crop face from document using Canvas API
8. Validate expiry date → If expired, show alert dialog
9. Display Results → Show extracted data + cropped face preview in confirmation dialog
10. Confirm/Retry → User can accept or retake photo
11. Upload both images to S3 (cropped face + full document)
12. Auto-populate → Fill form fields and close scanner
```

#### 2.2 Add Client-Side Face Cropping Utility

**File**: `src/lib/utils/image-processing.ts` (New utility)

```typescript
/**
 * Crops face photo from ID document using Canvas API
 * @param documentImageBase64 - Base64 encoded full document image
 * @param coordinates - Face photo location {x, y, width, height}
 * @returns Base64 encoded cropped face image
 */
export function cropFaceFromDocument(
  documentImageBase64: string,
  coordinates: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Set canvas size to cropped dimensions
      canvas.width = coordinates.width;
      canvas.height = coordinates.height;

      // Draw cropped portion
      ctx?.drawImage(
        img,
        coordinates.x,
        coordinates.y,
        coordinates.width,
        coordinates.height,
        0,
        0,
        coordinates.width,
        coordinates.height
      );

      // Convert to base64
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = documentImageBase64;
  });
}
```

#### 2.3 Update BookingDetailsTab

**File**: `src/components/bookings/booking-tabs/BookingDetailsTab.tsx`

**Changes**:

1. Replace `IDScannerWithOCR` with `IDScannerWithAI`
2. Update `handleTakePhoto` to use new single-capture scanner
3. Handle face cropping after OpenAI returns coordinates
4. Upload both images to S3 after successful extraction
5. Display cropped face photo in the existing image placeholder
6. Store full document photo URL for Documents tab
7. Update form population logic
8. Add loading states during processing
9. Show alert dialog for expired documents

**New Props**:

```typescript
interface BookingDetailsTabProps {
  // ... existing props
  onIdProcessed?: (data: {
    personImageUrl: string; // Cropped face for guest profile display
    documentImageUrl: string; // Full document for Documents tab
    fullName: string;
    idType: string;
    idNumber: string;
    issuingCountry: string;
    expiryDate: string;
    isExpired: boolean;
  }) => void;
}
```

**Image Display Logic**:

- **Cropped Face Photo**: Display in the existing image placeholder in BookingDetailsTab
- **Full Document Photo**: Store in form data, will be attached to reservation and viewable in EditBookingSheet Documents tab

#### 2.4 Update NewBookingSheet

**File**: `src/components/bookings/NewBookingSheet.tsx`

**Changes**:

1. Add state for both cropped face and full document image URLs
2. Update `handleScanComplete` to accept both image URLs
3. Store both image URLs in form data
4. Pass cropped face image URL to display in form
5. Pass full document image URL to reservation API for Documents tab
6. Handle expired document warnings

### Phase 3: Image Storage Integration (Day 3)

#### 3.1 S3 Upload Flow

**Process**:

1. Capture full ID document from camera (base64)
2. Send document to OpenAI for processing
3. OpenAI returns data + face photo coordinates
4. Client-side: Crop face from document using Canvas API
5. If successful, upload BOTH images to S3:
   - Cropped face photo → `{orgId}/guests/{timestamp}_face.jpg`
   - Full document photo → `{orgId}/documents/{timestamp}_id_document.jpg`
6. Store both S3 URLs in reservation record

**File**: `src/lib/utils/image-upload.ts` (New utility)

```typescript
export async function uploadGuestImages(
  croppedFaceBase64: string,
  fullDocumentBase64: string,
  guestName: string
): Promise<{
  personImageUrl: string;
  documentImageUrl: string;
}> {
  // Convert base64 to File objects
  // Get presigned URLs from /api/uploads/presign (2 calls)
  // Upload both to S3
  // Return both public URLs
}
```

#### 3.2 Database Schema Update

**Add to Reservation model** (if not exists):

```prisma
model Reservation {
  // ... existing fields
  guestImageUrl     String?  // S3 URL of person/guest photo (for profile)
  idDocumentUrl     String?  // S3 URL of ID document image (for Documents tab)
  idExpiryDate      DateTime? // Expiry date of ID document
  idDocumentExpired Boolean?  // Flag for expired documents
}
```

**Migration**:

```bash
npx prisma migrate dev --name add_guest_and_document_images
```

### Phase 4: Form Integration (Day 4)

#### 4.1 Update Form Data Types

**File**: `src/components/bookings/booking-tabs/types.ts`

```typescript
export interface BookingFormData {
  // ... existing fields
  guestImageUrl?: string; // Person photo for profile display
  idDocumentUrl?: string; // Document photo for Documents tab
  idExpiryDate?: string; // Expiry date from ID
  idDocumentExpired?: boolean; // Expiry status flag
}
```

#### 4.2 Update Reservation API

**File**: `src/app/api/reservations/route.ts`

**Changes**:

1. Accept `guestImageUrl`, `idDocumentUrl`, `idExpiryDate`, `idDocumentExpired` in request body
2. Store all fields in database during reservation creation
3. Return in GET responses
4. Include document expiry information in reservation details

#### 4.3 Update EditBookingSheet Documents Tab

**File**: `src/components/bookings/EditBookingSheet.tsx` and related Documents tab component

**Changes**:

1. Display ID document image in Documents tab
2. Show document metadata (type, number, expiry date)
3. Show expiry status with visual indicators (red for expired, yellow for expiring soon)
4. Allow download of document image
5. Show upload date and user who uploaded

### Phase 5: Testing & Error Handling (Day 5)

#### 5.1 Test Cases

1. **Happy Path**:

   - Capture clear passport/ID document image
   - Verify all fields extracted correctly (including expiry date)
   - Verify face coordinates returned correctly
   - Verify face cropped successfully from document
   - Confirm form auto-population
   - Verify both images stored in S3 (cropped face + full document)
   - Verify cropped face photo displays in form
   - Verify full document photo accessible in Documents tab

2. **Face Cropping Scenarios**:

   - Face detected and cropped successfully
   - Face coordinates invalid/out of bounds → Fallback to manual entry
   - No face detected on document → Warning, allow manual upload
   - Multiple faces detected → Use primary face coordinates

3. **Expiry Validation Scenarios**:

   - Valid document (expiry > 30 days away) → No warning
   - Expiring soon (expiry < 30 days) → Yellow warning
   - Expired document → Red alert dialog, allow override
   - Missing expiry date → Warning to verify manually

4. **Error Scenarios**:

   - Blurry/unclear document image
   - Non-ID document image
   - Network failure during API call
   - OpenAI rate limit exceeded
   - S3 upload failure for either image
   - Camera access denied
   - Canvas API failure during cropping

5. **Edge Cases**:
   - Multiple IDs in one image
   - Partially visible ID
   - Non-English text on ID
   - Expired documents (test override flow)
   - Very old/damaged documents
   - Digital/electronic IDs on phone screen
   - ID without photo (SSN card, etc.) → Skip face cropping

#### 5.2 Fallback Mechanisms

1. **Low Confidence**: Show warning, allow manual edit
2. **API Failure**: Fall back to manual entry
3. **Timeout**: Show retry button
4. **Rate Limit**: Queue request or show error
5. **Face Not Detected**: Show warning, allow manual face photo upload
6. **Face Cropping Failed**: Fall back to manual face photo upload
7. **Expired Document**: Show alert dialog with options:
   - "Proceed Anyway" (with warning flag)
   - "Retake Photo"
   - "Cancel"
8. **Missing Expiry Date**: Allow proceeding with manual verification note

## 🔄 User Flow

### Take Photo Flow (Single Capture with Client-Side Cropping)

```
1. User clicks "TAKE PHOTO" button
   ↓
2. IDScannerWithAI opens with camera feed
   ↓
3. Camera feed shows with document frame guide overlay
   ↓
4. User positions ID document in frame
   ↓
5. User clicks "Capture Document" button
   ↓
6. Document image captured and preview shown
   ↓
7. "Processing with AI..." overlay displayed
   ↓
8. Document image sent to /api/ai/process-id
   ↓
9. OpenAI Vision API processes document
   ↓
10. Structured data returned (including expiry date + face coordinates)
    ↓
11. Client-side: Crop face from document using Canvas API
    ├─ If face coordinates valid → Crop successfully
    └─ If face coordinates invalid/null → Show warning, skip cropping
    ↓
12. Validate expiry date
    ├─ If EXPIRED → Show alert dialog
    │   ├─ "Proceed Anyway" → Continue with warning flag
    │   ├─ "Retake Photo" → Return to step 2
    │   └─ "Cancel" → Close scanner
    ├─ If EXPIRING SOON (< 30 days) → Show yellow warning
    └─ If VALID → Continue
    ↓
13. Confirmation dialog shows:
    ├─ Cropped face photo preview
    ├─ Extracted data
    └─ Expiry status
    ├─ User clicks "Confirm" → Auto-populate form
    └─ User clicks "Retry" → Return to step 2
    ↓
14. Both images uploaded to S3 in background
    ├─ Cropped face photo → Guest profile
    └─ Full document photo → Documents tab
    ↓
15. Form fields populated with extracted data
    ├─ Cropped face photo displayed in image placeholder
    └─ Document data filled in form fields
    ↓
16. Scanner closes, user continues booking
```

### Upload Photo Flow

```
1. User clicks "UPLOAD" button
   ↓
2. File picker opens
   ↓
3. User selects ONE image (ID document)
   ↓
4. Image preview shown
   ↓
5. "Process with AI" button appears
   ↓
6. User clicks "Process with AI"
   ↓
7. Same processing flow as Take Photo (steps 8-16)
   ├─ Document image sent to OpenAI
   ├─ Face cropped from document
   ├─ Expiry validation
   └─ Both images uploaded to S3
```

## 🎨 UI/UX Considerations

### Loading States

1. **Camera Loading**: "Initializing camera..."
2. **Capturing**: "Capturing ID document..."
3. **Processing**: "Analyzing ID document with AI..."
4. **Cropping**: "Extracting face photo..."
5. **Uploading**: "Saving images..."

### Error Messages

1. **Camera Access Denied**: "Please allow camera access to scan ID documents"
2. **Processing Failed**: "Unable to read ID. Please try again or enter manually"
3. **Low Confidence**: "Some information may be incorrect. Please verify before continuing"
4. **Network Error**: "Connection failed. Please check your internet and try again"
5. **Face Not Detected**: "⚠️ Could not detect face photo on document. You can upload a separate face photo manually."
6. **Face Cropping Failed**: "⚠️ Failed to extract face photo. Please upload a face photo manually."
7. **Expired Document**: "⚠️ This document expired on [DATE]. Do you want to proceed anyway?"
8. **Expiring Soon**: "⚠️ This document will expire in [X] days. Please verify with guest."
9. **Missing Expiry**: "⚠️ Could not detect expiry date. Please verify document validity manually."

### Success Feedback

- Green checkmark animation
- "ID processed successfully!" toast
- Highlight auto-filled fields briefly
- Show cropped face photo in image placeholder
- "Document saved to reservation" confirmation
- "Face photo extracted successfully" (if face detected)

### Alert Dialog for Expired Documents

**Title**: "⚠️ Expired ID Document"

**Message**:

```
This ID document expired on [DATE] ([X] days ago).

Document Details:
• Type: [Passport/License/etc.]
• Number: [ID Number]
• Issued by: [Country]

Do you want to proceed with this reservation?
```

**Actions**:

- **Proceed Anyway** (Primary button - orange/warning color)
- **Retake Photo** (Secondary button)
- **Cancel** (Tertiary button)

## 📊 Cost Estimation

### OpenAI Vision API Pricing (as of 2024)

- **GPT-4 Vision**: ~$0.01 per image (1024x1024)
- **GPT-4o**: ~$0.005 per image (more cost-effective)

**Monthly Estimate** (100 bookings/month):

- 100 images × $0.005 = **$0.50/month**

Very affordable for the value provided!

## 🔒 Security Considerations

1. **API Key Protection**: Store in environment variables, never expose to client
2. **Image Data**: Delete from memory after processing
3. **S3 Storage**: Use private buckets with presigned URLs
4. **Rate Limiting**: Implement on API route to prevent abuse
5. **Input Validation**: Validate image size, format, and content
6. **GDPR Compliance**: Store ID images securely, allow deletion

## 📈 Success Metrics

1. **Accuracy**: >95% correct field extraction
2. **Speed**: <5 seconds total processing time
3. **User Adoption**: >80% of users choose AI scan over manual entry
4. **Error Rate**: <5% failed scans requiring retry

## 🚀 Deployment Checklist

### Backend Setup

- [ ] Install `openai` package
- [ ] Add `OPENAI_API_KEY` to environment variables
- [ ] Create `/api/ai/process-id` route with expiry validation
- [ ] Add database fields: `guestImageUrl`, `idDocumentUrl`, `idExpiryDate`, `idDocumentExpired`
- [ ] Run database migration: `add_guest_and_document_images`
- [ ] Update reservation API to handle all new fields

### Frontend Components

- [ ] Create `IDScannerWithAI` component (single capture)
- [ ] Add document frame guide overlay
- [ ] Create `cropFaceFromDocument` utility function (Canvas API)
- [ ] Implement expiry validation alert dialog
- [ ] Update `BookingDetailsTab` component
- [ ] Update `NewBookingSheet` to handle both images (cropped face + full document)
- [ ] Update `EditBookingSheet` Documents tab to display ID document

### Image Storage

- [ ] Create `uploadGuestImages` utility function
- [ ] Test S3 upload for both cropped face and full document photos
- [ ] Verify correct S3 paths: `guests/` and `documents/`

### Testing

- [ ] Test single photo capture flow
- [ ] Test face coordinate extraction from OpenAI
- [ ] Test client-side face cropping with Canvas API
- [ ] Test face cropping fallback (when coordinates invalid/null)
- [ ] Test expiry date validation (valid, expiring soon, expired)
- [ ] Test expired document alert dialog and override flow
- [ ] Test all error scenarios (camera, network, API failures, cropping failures)
- [ ] Test manual upload flow with single document image
- [ ] Verify cropped face photo displays in form
- [ ] Verify full document photo appears in Documents tab
- [ ] Test with various ID types (passport, license, etc.)
- [ ] Test with IDs without photos (SSN cards, etc.)

### Deployment

- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Monitor OpenAI API usage and costs
- [ ] Deploy to production
- [ ] Monitor error rates and user feedback

## 📚 Additional Resources

- [OpenAI Vision API Documentation](https://platform.openai.com/docs/guides/vision)
- [React Webcam Documentation](https://www.npmjs.com/package/react-webcam)
- [AWS S3 Upload Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html)

---

## 🛠️ Quick Start Implementation Guide

### Step 1: Install Dependencies

```bash
npm install openai
```

### Step 2: Add Environment Variables

```bash
# .env.local
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4o"
```

### Step 3: Create API Route

Create `src/app/api/ai/process-id/route.ts` with OpenAI Vision integration.

### Step 4: Create Scanner Component

Create `src/components/bookings/IDScannerWithAI.tsx` with camera and API integration.

### Step 5: Update BookingDetailsTab

Replace `IDScannerWithOCR` with `IDScannerWithAI` in `BookingDetailsTab.tsx`.

### Step 6: Database Migration

```bash
# Add idImageUrl field to Reservation model
npx prisma migrate dev --name add_id_image_url
npx prisma generate
```

### Step 7: Update Reservation API

Add `idImageUrl` handling in `src/app/api/reservations/route.ts`.

### Step 8: Test

1. Test camera capture flow
2. Test upload flow
3. Test error scenarios
4. Verify S3 storage
5. Verify database storage

---

## 📋 Code Snippets

### OpenAI API Call Example

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract ID information from this document and return as JSON..."
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    }
  ],
  max_tokens: 1000,
  response_format: { type: "json_object" }
});
```

### Camera Capture Example

```typescript
import Webcam from "react-webcam";

const webcamRef = useRef<Webcam>(null);

const captureImage = () => {
  const imageSrc = webcamRef.current?.getScreenshot();
  if (imageSrc) {
    // imageSrc is base64 encoded
    processImage(imageSrc);
  }
};
```

### S3 Upload Example

```typescript
async function uploadToS3(base64Image: string, fileName: string) {
  // 1. Get presigned URL
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName,
      fileType: "image/jpeg"
    })
  });

  const { presignedUrl, publicUrl } = await presignRes.json();

  // 2. Convert base64 to blob
  const blob = await fetch(base64Image).then((r) => r.blob());

  // 3. Upload to S3
  await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob
  });

  return publicUrl;
}
```

---

## 🎯 Key Decision Points

### 1. Which OpenAI Model?

**Recommendation**: Use `gpt-4o` (GPT-4 Omni)

- **Pros**: Faster, cheaper, excellent vision capabilities
- **Cons**: Slightly less accurate than GPT-4 Vision on complex documents
- **Cost**: ~$0.005 per image vs $0.01 for GPT-4 Vision

### 2. When to Upload to S3?

**Recommendation**: Upload after successful OpenAI processing

- **Pros**: Only store valid ID images, save storage costs
- **Cons**: Slight delay before form population
- **Alternative**: Upload in parallel with OpenAI processing

### 3. Confidence Threshold?

**Recommendation**: 0.7 (70%)

- Below 0.7: Show warning, allow manual edit
- Above 0.7: Auto-populate with confidence
- Above 0.9: Auto-populate without warning

### 4. Fallback Strategy?

**Recommendation**: Graceful degradation

1. Try OpenAI Vision (primary)
2. If fails, allow manual entry (fallback)
3. Keep existing Tesseract OCR as backup option

---

## 📊 Comparison: Current vs Proposed

| Feature              | Current (Tesseract OCR)   | Proposed (OpenAI Vision)              |
| -------------------- | ------------------------- | ------------------------------------- |
| **Accuracy**         | ~60-70%                   | ~95-98%                               |
| **Speed**            | 3-5 seconds               | 2-4 seconds                           |
| **Document Types**   | Limited (structured IDs)  | All types (passports, licenses, etc.) |
| **Language Support** | English only              | Multi-language                        |
| **Confidence Score** | No                        | Yes                                   |
| **Cost**             | Free                      | ~$0.005 per scan                      |
| **Maintenance**      | High (regex patterns)     | Low (AI handles variations)           |
| **User Experience**  | Manual corrections needed | Auto-fill with high accuracy          |

---

**Estimated Timeline**: 5 days
**Complexity**: Medium
**Priority**: High (significant UX improvement)
**ROI**: Very High (saves 2-3 minutes per booking, reduces errors)
