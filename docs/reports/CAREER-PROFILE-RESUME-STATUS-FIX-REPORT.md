# Career Profile — Resume Status Logic & AI Recommendation Fix Report

**Bug Title:** AI Career Coach Incorrectly Recommends "Generate ATS Resume"  
**Status:** ✅ RESOLVED & VERIFIED  
**Date:** 2026-07-27

---

## 1. Root Cause Analysis

An empirical audit of the resume status pipeline revealed the exact root cause:

1. **Mandatory Query Parameter Error:** `getSavedResumeController` in `backend/src/controllers/resumeController.ts` enforced `if (!templateId) return sendError(res, 400, 'Template ID is required.')`.
2. **Career Profile Invocation:** When `app/dashboard/student/career/page.tsx` loaded, it called `GET /api/resume/draft` WITHOUT supplying a `templateId` query parameter (because Career Profile needs the student's overall latest generated resume).
3. **HTTP 400 Failure:** The backend rejected the request with `HTTP 400 Bad Request`.
4. **State Fallback to Null:** The frontend catch block caught the error and set `resumeData` to `null`.
5. **False Positive Recommendation:** Because `resumeData` was `null`, `resumeData?.updatedAt` evaluated to `undefined`, causing the AI Career Coach to incorrectly assume `generatedResumeCount == 0` and display *"Generate ATS Resume"* every time.

---

## 2. Implemented Changes & Technical Fix

### A. Backend Architecture Enhancements (`resumeController.ts` & `resumeRoutes.ts`)
- **Optional `templateId` Support:** Updated `getSavedResumeController` (`GET /api/resume/draft`):
  - When `templateId` is provided: Returns draft for that specific template.
  - When `templateId` is omitted: Fetches the student's latest generated resume across ALL templates and returns:
    ```json
    {
      "studentResumeId": "...",
      "templateId": "...",
      "templateName": "Polished Semantic Resume v2",
      "filledData": { ... },
      "generatedDocxUrl": "...",
      "generatedResumeCount": 3,
      "isGenerated": true,
      "updatedAt": "2026-07-27T16:00:00.000Z",
      "createdAt": "2026-07-27T14:00:00.000Z"
    }
    ```
- **New Multi-Resume Endpoint:** Added `getAllStudentResumesController` (`GET /api/resume/all`) to retrieve all generated resumes for a student sorted by `updatedAt` descending.

### B. Single Source of Truth Engine (`page.tsx`)
- **Exact Resume Count Engine:**
  ```typescript
  const generatedResumeCount = useMemo(() => {
    if (resumeData?.generatedResumeCount !== undefined) {
      return resumeData.generatedResumeCount;
    }
    if (resumeData?.updatedAt || resumeData?.filledData?.full_name) {
      return 1;
    }
    return 0;
  }, [resumeData]);

  const hasGeneratedResume = generatedResumeCount > 0;
  ```
- **AI Career Coach Filtering:**
  ```typescript
  // ONLY RECOMMEND IF STUDENT HAS ZERO GENERATED RESUMES (generatedResumeCount === 0)
  if (!hasGeneratedResume) {
    recs.push({
      title: 'Generate ATS Resume',
      description: 'You have not created a resume yet. Choose a template and generate your first DOCX resume.',
      action: 'Generate Resume',
      link: '/dashboard/student/resume-builder',
      priority: 'Critical',
    });
  }
  ```
- **Resume Overview Display Enhancements:**
  When `hasGeneratedResume === true`:
  - **Template Name:** Displays `resumeData.templateName` (e.g., *"Polished Semantic Resume v2"*).
  - **Generated Date:** Displays `new Date(resumeData.createdAt).toLocaleDateString()`.
  - **Last Updated:** Displays `new Date(resumeData.updatedAt).toLocaleDateString()`.
  - **Resume Version:** Displays `v1.0 (Latest)`.
  - **Count Badge:** Displays `${generatedResumeCount} Resumes Generated`.
  - **Actions:** Displays *"View All Resumes"* / *"Open Resume Builder"* and *"Download DOCX"*.

---

## 3. Empirical Verification Matrix

| Student Resume State | `generatedResumeCount` | `hasGeneratedResume` | AI Coach Recommendation | Resume Overview Card Display |
|---|---|---|---|---|
| **Zero Resumes** | `0` | `false` | Includes *"Generate ATS Resume"* | Displays *"Generate Your First Resume"* CTA |
| **1 Generated Resume** | `1` | `true` | **EXCLUDED** *"Generate ATS Resume"* | Displays Template Name, Dates & Download DOCX |
| **Multiple Resumes (3)** | `3` | `true` | **EXCLUDED** *"Generate ATS Resume"* | Displays Latest Resume + *"3 Resumes Generated"* Badge & *"View All Resumes"* Trigger |

---

## 4. Acceptance Criteria Verification

- [x] **Students with one or more generated resumes NEVER see "Generate ATS Resume" recommendation**
- [x] **Resume Overview displays the latest generated resume with Template Name, Dates, and Version**
- [x] **Resume status remains correct after page refresh**
- [x] **No duplicate or conflicting resume state exists across platform**
