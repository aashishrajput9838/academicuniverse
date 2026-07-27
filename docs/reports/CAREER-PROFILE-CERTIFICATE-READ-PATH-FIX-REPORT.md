# Career Profile Certificate Read Path & Schema Mapping Fix Report

**Sprint:** Fix Career Profile Certificate Read Path & Schema Mapping  
**Status:** ✅ RESOLVED, VERIFIED & SYNCHRONIZED  
**Date:** 2026-07-27

---

## Executive Summary

While the backend routing engine successfully created `CertificateRecord` documents in MongoDB upon approval (`POST /api/review/{id}/approve`), the Career Profile page displayed 0 Verified Certifications due to a discrepancy between where certificate data was stored and how the frontend read it.

This sprint traced the complete read path, updated `GET /api/profile` to include canonical `CertificateRecord` entries, and updated the Career Profile page to query `CertificateRecord` data across `GET /api/profile`, `GET /api/growth/profile/me`, `GET /api/growth/uploads`, and `StudentResume.filledData.certifications`.

---

## 1. Trace of Read Path & Root Cause Findings

### A. MongoDB Document Persistence
- **Verification:** When a certificate upload is approved, `writeCertificateRecord` in `review.service.ts` writes a document into the `CertificateRecord` collection in MongoDB with fields: `{ organizationId, personId, title, issuer, issuedDate, sourceDocumentId }`.
- **Resume Sync:** It also appends the certificate to `StudentResume.filledData.certifications` array.

### B. GET `/api/profile` Endpoint Audit ([profileController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/profileController.ts))
- **Finding:** `getProfileController` previously returned only user metadata (`id`, `name`, `email`, `githubUsername`, `linkedinUrl`, `admissionYear`) and did NOT return `CertificateRecord` data.
- **Fix Implemented:** Updated `getProfileController` to query `CertificateRecord` for the user's `Person` entity and include `certifications` (and `certificates`) arrays in the `GET /api/profile` response payload.

### C. Career Profile Frontend Component Audit ([page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/career/page.tsx))
- **Finding 1 (Schema Mismatch):** The Career Profile page checked `resData?.filledData?.certification_name` (a single scalar string) instead of reading the `resData.filledData.certifications` array where multiple certificates are stored.
- **Finding 2 (Endpoint Misconfiguration):** The page attempted to fetch `/api/document-intelligence/documents` instead of calling `GET /api/growth/profile/me` or `GET /api/profile`.
- **Fix Implemented:** Rewrote the certificate aggregation logic in `page.tsx` to read from:
  1. `prof.certifications` / `prof.certificates` from `GET /api/profile`
  2. `resData.filledData.certifications` array from `StudentResume`
  3. `resData.filledData.certification_name` scalar fallback
  4. `growthData.certificates` from `GET /api/growth/profile/me`
  5. Uploads list from `GET /api/growth/uploads`

---

## 2. Technical Evidence

### A. Backend API Enhancement ([profileController.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/controllers/profileController.ts))

```typescript
if (person) {
  const { CertificateRecord } = await import('../models/CertificateRecord');
  const certRecs = await CertificateRecord.find({
    organizationId: toObjectId(req.user.organizationId),
    personId: person._id,
  }).lean();

  certRecs.forEach((c) => {
    addCertItem(c.title, c.issuer, c.issuedDate ? c.issuedDate.toISOString().split('T')[0] : '');
  });
}

return sendResponse(res, 200, {
  id: user._id,
  name: user.name,
  email: user.email,
  githubUsername: user.githubUsername,
  role: (user.roleId as any)?.name || 'USER',
  admissionYear: person?.admissionYear,
  certifications: certList,
  certificates: certList,
}, 'Profile retrieved successfully');
```

### B. Frontend Certificate Aggregation ([page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/career/page.tsx))

```typescript
// 6a. Check GET /api/profile response
if (prof?.certifications && Array.isArray(prof.certifications)) {
  prof.certifications.forEach((c: any) => addCert(c.name || c.title, c.issuer, c.issueDate, c.status || 'Verified'));
}

// 6b. Check StudentResume filledData.certifications array
if (resData?.filledData?.certifications && Array.isArray(resData.filledData.certifications)) {
  resData.filledData.certifications.forEach((c: any) => {
    addCert(c.certification_name || c.name || c.title, c.certification_issuer || c.issuer, c.certification_issue_date || c.issueDate, 'Verified');
  });
}

// 6c. Fetch canonical CertificateRecords from Growth Profile API
const res = await apiRequest('/api/growth/profile/me', { headers });
const certificates = res.data?.certificates || res.certificates || [];
if (Array.isArray(certificates)) {
  certificates.forEach((c: any) => {
    addCert(c.title || c.name, c.issuer, c.issuedDate ? new Date(c.issuedDate).toLocaleDateString() : undefined, 'Verified');
  });
}
```

---

## 3. Verification Checklist

- [x] **MongoDB Existence:** Verified `CertificateRecord` collection holds approved certificate records
- [x] **GET `/api/profile` Response:** Includes `certifications` & `certificates` arrays
- [x] **GET `/api/growth/profile/me` Response:** Returns `certificates` array
- [x] **Career Profile Aggregation:** Reads from all canonical sources with deduplication
- [x] **Verified Certifications UI:** Displays verified certificate cards
- [x] **Certification Counter:** Updates dynamically (`certifications.length > 0`)
- [x] **AI Career Coach:** Recommendation auto-dismisses when verified certifications exist
