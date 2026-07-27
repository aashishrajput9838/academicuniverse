# Certificate Upload Navigation & Growth Hub Integration Evidence Report

**Sprint:** Fix Upload Course Certificates Navigation & Growth Hub Integration  
**Status:** ✅ IMPLEMENTED, VERIFIED & SYNCHRONIZED  
**Date:** 2026-07-27

---

## Executive Summary

The "Upload Course Certificates" CTA inside the Career Profile page previously redirected to `/dashboard/student/document-intelligence`. In accordance with Academic Universe product architecture, Growth Hub is the central document upload module.

This sprint successfully updated all certificate upload navigation targets to `/dashboard/student/growth?upload=certificate`, added automatic Certificate Upload Mode to Growth Hub, extended AI document classification and extraction for certificates, and implemented real-time cross-module synchronization to Career Profile, AI Career Coach, and Resume Builder.

---

## 1. What Was Implemented

1. **Navigation Target Fix:** Updated all navigation routes triggered by "Upload Course Certificates" or "Upload Certs" in Career Profile from `/dashboard/student/document-intelligence` to `/dashboard/student/growth?upload=certificate`.
2. **Automatic Certificate Upload Mode:** Growth Hub inspects `upload=certificate` query parameter on arrival and automatically configures Certificate Upload Mode, displaying dedicated certificate CTA headers, instructions, and supported certificate badges (Coursera, Udemy, NPTEL, Cisco, AWS, Microsoft, Google, Internship, Hackathons, Workshops).
3. **AI Certificate Classification & Extraction:** Extended Gemini AI document pipeline to classify uploads as `CERTIFICATE` and extract structured fields:
   - Certificate Title / Name (`title`)
   - Issuing Organization (`issuer`)
   - Candidate / Student Name (`candidateName` / `studentName`)
   - Issue Date (`issueDate` / `issuedDate`)
   - Expiry Date / Credential ID (`credentialId`)
4. **MongoDB Persistence:** Upserts extracted certificate data into `CertificateRecord` and `SkillEvidence` MongoDB collections with tenant organization isolation.
5. **Cross-Module Synchronization:**
   - **Career Profile:** Real-time update of certification counter & Verified Certifications card.
   - **AI Career Coach:** Recommendation *"Upload Course Certificates"* automatically disappears when `certifications.length > 0`.
   - **Resume Builder:** Automatically populates `StudentResume.filledData.certifications` array and top-level certification fields in MongoDB.
   - **Generated Resume:** DOCX and PDF resume generation includes newly verified certificates automatically.

---

## 2. Why It Was Implemented

- **Unified Document Upload Architecture:** Growth Hub provides full OCR, Gemini AI parsing, spreadsheet review, and approval pipelines. Consolidating certificate uploads inside Growth Hub avoids fragmented document workflows.
- **Frictionless User Experience:** Automatically opening the upload workflow when redirected from Career Profile saves the student from redundant clicks.
- **Single Source of Truth:** Syncing approved certificate records to `CertificateRecord` and `StudentResume.filledData.certifications` ensures that Career Profile, Resume Builder, and generated ATS resumes draw from verified MongoDB documents.

---

## 3. How It Was Implemented (Technical Evidence)

### A. Navigation Fix in Career Profile ([page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/career/page.tsx))

- **Progress Checklist:**
  ```typescript
  { label: 'Certifications Verified', completed: Boolean(certifications.length > 0), link: '/dashboard/student/growth?upload=certificate' }
  ```
- **AI Career Coach Recommendation:**
  ```typescript
  if (certifications.length === 0) {
    recs.push({
      title: 'Upload Course Certificates',
      description: 'Upload course certificates in Growth Hub for automated verification.',
      action: 'Upload Certs',
      link: '/dashboard/student/growth?upload=certificate',
      priority: 'Medium',
    });
  }
  ```
- **Verified Certifications Showcase Card:**
  ```tsx
  <Link href="/dashboard/student/growth?upload=certificate" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
    <span>Growth Hub Upload</span>
    <ChevronRight className="w-3.5 h-3.5" />
  </Link>
  ```

### B. Certificate Upload Mode in Growth Hub ([GrowthUploadPanel.tsx](file:///c:/github/academicuniverse.com/academicuniverse/components/GrowthUploadPanel.tsx))

- **Query Parameter Detection & Auto-Open:**
  ```typescript
  const searchParams = useSearchParams();
  const uploadMode = searchParams?.get('upload');
  const isCertificateMode = uploadMode === 'certificate';

  useEffect(() => {
    if (isCertificateMode && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isCertificateMode]);
  ```
- **Certificate Mode UI Header & Supported Provider Badges:**
  ```tsx
  <h2 className="text-xl font-bold text-white">
    {isCertificateMode ? 'Upload Course Certificate' : hasUploads ? 'Upload Academic Documents' : 'Build Your Growth Profile'}
  </h2>
  ```
  Supported badges displayed: `Coursera`, `Udemy`, `NPTEL`, `Cisco`, `AWS`, `Microsoft`, `Google`, `Internship Certificates`, `Hackathons`, `Workshop Certificates`.

### C. Backend Persistence & Resume Builder Sync ([review.service.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/shared/services/review.service.ts))

- **`writeCertificateRecord` Upsert & `StudentResume` Synchronization:**
  ```typescript
  async function writeCertificateRecord(...) {
    const filter = { organizationId: orgOid, personId, title, issuer };
    const update = { $set: { issuedDate, rawConfidence, sourceDocumentId } };
    const result = await CertificateRecord.findOneAndUpdate(filter, update, { upsert: true, new: true, session });

    // Sync to StudentResume filledData
    const StudentResume = (await import('../../models/StudentResume')).default;
    const certObj = { certification_name: title, certification_issuer: issuer, certification_issue_date: dateStr };
    const resume = await StudentResume.findOne({ userId: upload.userId });
    if (resume) {
      const filled = resume.filledData || {};
      const existingCerts = Array.isArray(filled.certifications) ? filled.certifications : [];
      if (!existingCerts.some(c => c.certification_name?.toLowerCase() === title.toLowerCase())) {
        existingCerts.push(certObj);
      }
      filled.certifications = existingCerts;
      resume.filledData = filled;
      await resume.save();
    }
    return [String(result._id)];
  }
  ```

---

## 4. Acceptance Criteria Verification

- [x] **"Upload Course Certificates" CTA redirects to `/dashboard/student/growth?upload=certificate`**
- [x] **Growth Hub automatically opens file upload in Certificate Upload Mode**
- [x] **Displays supported certificate types (Coursera, Udemy, NPTEL, Cisco, AWS, Microsoft, Google, Internship, Hackathons, Workshops)**
- [x] **Gemini AI classifies document as `CERTIFICATE` and extracts fields**
- [x] **Stores certificate in MongoDB `CertificateRecord`**
- [x] **Career Profile updates certification count and showcase card**
- [x] **AI Career Coach recommendation auto-dismisses when `certifications.length > 0`**
- [x] **Resume Builder `filledData.certifications` synchronized in MongoDB**
- [x] **Generated DOCX & PDF resumes include certificates automatically**
- [x] **Existing Growth Hub marksheets, transcripts, timetables, and OCR preserved**
