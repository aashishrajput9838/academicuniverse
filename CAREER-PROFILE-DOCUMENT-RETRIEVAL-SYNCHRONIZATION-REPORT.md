# Career Profile Document Retrieval Synchronization: Evidence & Implementation Report

**Sprint:** Career Profile Certificate Viewer & Growth Hub Runtime Synchronization  
**Status:** ✅ RESOLVED, AUDITED & PUSHED TO MAIN  
**Date:** 2026-07-28  
**Commit:** `167b365`

---

## Executive Summary

The document retrieval and preview implementation in **Career Profile** (`CertificateThumbnailGallery.tsx` & `CertificatePreviewModal.tsx`) has been synchronized with the authenticated retrieval pattern proven in **Growth Hub**.

### Root Cause Analysis

1. **Unauthenticated Image & Modal Preview Requests:**
   - `CertificateThumbnailGallery.tsx` and `CertificatePreviewModal.tsx` were passing protected backend API URLs (e.g. `/api/growth/documents/:id/thumbnail` or `/api/growth/documents/:id/file`) directly into standard `<img src="...">` and `<a href="...">` elements.
   - Standard browser `<img src="">` tags do not send the custom `Authorization: Bearer <token>` header.
   - As a result, the protected backend endpoint returned **HTTP 401 Unauthorized JSON** (`{"success":false,"message":"No token..."}`).
   - The browser failed to parse the JSON error as an image format, triggering `<img onError>` and resulting in a **broken image placeholder** and modal error state (*"The certificate document preview is currently unavailable"*).

2. **Deduplication Overwrite in `page.tsx`:**
   - In `app/dashboard/student/career/page.tsx`, `addCert()` previously checked `if (!seenCerts.has(key))` before adding certificates.
   - If a plain text cert entry without `fileUrl`/`thumbnailUrl` was loaded first from profile/resume data, subsequent canonical `CertificateRecord` items from `GET /api/growth/profile/me` (which contain the real document URLs) were discarded.

---

## Technical Fixes Implemented

### 1. Authenticated Image Component (`AuthenticatedImage`)
Created a dedicated `AuthenticatedImage` component in `CertificateThumbnailGallery.tsx`:
- Resolves authentication token (`backendToken` or `localStorage.getItem('authToken')`).
- Issues an authenticated `fetch(src, { headers: { Authorization: 'Bearer ...' } })`.
- Verifies binary `Content-Type` (ensures response is not HTTP 401 JSON).
- Converts payload to a Blob URL via `URL.createObjectURL(blob)`.
- Revokes stale Blob URLs on unmount.

### 2. Authenticated Modal Media Loading & Download (`CertificatePreviewModal`)
- Added `loadMedia()` `useEffect` in `CertificatePreviewModal.tsx` to retrieve document binaries via authenticated `fetch()`.
- Generates Blob Object URLs for images and PDFs.
- Replaced direct HTTP download links with authenticated Blob downloads in `handleDownload()`.

### 3. Certificate Object Enrichment (`page.tsx`)
- Updated `addCert()` in `app/dashboard/student/career/page.tsx`:
```ts
if (existingIdx >= 0) {
  certList[existingIdx] = {
    ...certList[existingIdx],
    id: cObj.id || certList[existingIdx].id,
    sourceDocumentId: cObj.sourceDocumentId || certList[existingIdx].sourceDocumentId,
    processingId: cObj.processingId || certList[existingIdx].processingId,
    fileUrl: cObj.fileUrl || certList[existingIdx].fileUrl,
    thumbnailUrl: cObj.thumbnailUrl || certList[existingIdx].thumbnailUrl,
    mimeType: cObj.mimeType || certList[existingIdx].mimeType,
    fileName: cObj.fileName || certList[existingIdx].fileName,
    rawConfidence: cObj.rawConfidence ?? certList[existingIdx].rawConfidence,
    credentialId: cObj.credentialId || certList[existingIdx].credentialId,
  };
}
```

---

## Acceptance Criteria Checklist

| Criterion | Result | Status |
|:---|:---|:---:|
| **1. Certificate Thumbnail Renders** | `AuthenticatedImage` fetches binary PNG/JPEG thumbnail with JWT header and renders Blob URL. | ✅ Verified |
| **2. Preview Modal Renders Original Certificate** | `CertificatePreviewModal` fetches full resolution document binary and renders Object URL in white paper sheet canvas. | ✅ Verified |
| **3. Download Works** | `handleDownload()` downloads original binary file instead of 401 JSON error payload. | ✅ Verified |
| **4. Architectural Alignment** | Growth Hub and Career Profile now use the identical `fetch` + `Blob` + `URL.createObjectURL` retrieval pattern. | ✅ Verified |
| **5. TypeScript Verification** | `npx tsc --noEmit` confirms 0 errors in modified components. | ✅ Verified |

---

## Git Deliverables

- **Commit Hash:** `167b365` (`fix(career-profile): synchronize document retrieval with Growth Hub...`)
- **Pushed To:** `origin/main`
