# BUG-008: Resume Builder Frontend Missing Components

**Date:** 2026-07-21T02:03:00+05:30  
**Status:** Open — Not Implemented  
**Related:** BUG-007 (Resume Readiness Card)  

---

## 1. Issue Summary

The Resume Builder frontend is incomplete. The page at `/dashboard/student/resume-builder` imports a non-existent `ResumeBuilder` component, causing a runtime crash. Additionally, faculty-facing template management components are missing.

---

## 2. Affected Files

| File | Status | Issue |
|------|--------|-------|
| `app/dashboard/student/resume-builder/page.tsx` | ⚠️ Broken | Imports `@/components/Resume/ResumeBuilder` — file does not exist |
| `app/dashboard/faculty/resume-templates/page.tsx` | ⚠️ Broken | Imports `TemplateUploadForm` and `TemplateList` from `@/components/Resume/` — files do not exist |
| `@/components/Resume/ResumeBuilder` | ❌ Missing | Component not implemented |
| `@/components/Resume/TemplateUploadForm` | ❌ Missing | Component not implemented |
| `@/components/Resume/TemplateList` | ❌ Missing | Component not implemented |

---

## 3. Backend Status

The backend Resume Builder is **fully functional**:

| Component | Status |
|-----------|--------|
| Routes (`/api/resume/*`) | ✅ Implemented |
| Controller (`resumeController.ts`) | ✅ Implemented |
| Service (`resumeService.ts`) | ✅ Implemented |
| Models (`StudentResume`, `ResumeTemplate`) | ✅ Implemented |
| DOCX Generation (`docxtemplater` + `mammoth`) | ✅ Implemented |
| AI Enhancement (`aiService.enhanceResumeFields`) | ✅ Implemented |
| Firebase Storage Integration | ✅ Implemented |

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/resume/templates` | POST | Faculty uploads .docx template |
| `/api/resume/templates` | GET | Student gets available templates |
| `/api/resume/generate` | POST | Generate resume from template + data |
| `/api/resume/draft` | GET | Retrieve saved draft |

---

## 4. Frontend Status

### Student Resume Builder Page

**File:** `app/dashboard/student/resume-builder/page.tsx`

```typescript
import ResumeBuilder from '@/components/Resume/ResumeBuilder';
// ❌ This component does not exist
```

**Result:** Navigating to `/dashboard/student/resume-builder` crashes with a module resolution error.

### Faculty Resume Templates Page

**File:** `app/dashboard/faculty/resume-templates/page.tsx`

```typescript
import TemplateUploadForm from '@/components/Resume/TemplateUploadForm';
import TemplateList from '@/components/Resume/TemplateList';
// ❌ Neither component exists
```

**Result:** Faculty cannot upload or manage resume templates through the UI.

---

## 5. Required Components

### 5.1 `@/components/Resume/ResumeBuilder`

**Purpose:** Main student-facing resume builder interface.

**Expected functionality:**
- Display available templates fetched from `GET /api/resume/templates`
- Render template selection UI
- Render form fields based on template `questions`
- Support AI enhancement toggle (tone selection)
- Submit form data to `POST /api/resume/generate`
- Display generated HTML preview
- Support DOCX download
- Save/load draft from `GET /api/resume/draft`

**Props/State:**
- `templateId?: string`
- `filledData: Record<string, any>`
- `tone?: string`
- `htmlPreview?: string`
- `docxBase64?: string`
- `isGenerating: boolean`
- `isSaving: boolean`

### 5.2 `@/components/Resume/TemplateUploadForm`

**Purpose:** Faculty form to upload .docx resume templates.

**Expected functionality:**
- File upload input for .docx files
- Form fields: `templateName`, `type` (global/section/department), `target`
- Upload to `POST /api/resume/templates`
- Display upload progress and success/error states
- Parse template for `{{tags}}` and display detected fields

**Props:**
- `onUploadSuccess?: (template) => void`
- `organizationId: string`

### 5.3 `@/components/Resume/TemplateList`

**Purpose:** Faculty view of uploaded templates with management actions.

**Expected functionality:**
- Fetch templates from `GET /api/resume/templates`
- Display template list with name, type, target, upload date
- Support delete/disable actions
- Show which students have used each template

**Props:**
- `templates: ResumeTemplate[]`
- `onDelete?: (templateId) => void`

---

## 6. Root Cause

The backend Resume Builder module was implemented and registered in the module registry (`resumeBuilderConfig`), but the frontend components were never created. The page files reference components that don't exist, suggesting the frontend implementation was planned but not completed.

---

## 7. Architecture Impact

### Current State
```
Frontend:
  /dashboard/student/resume-builder/page.tsx
    └── import ResumeBuilder from '@/components/Resume/ResumeBuilder'
          └── ❌ CRASH: Component does not exist

  /dashboard/faculty/resume-templates/page.tsx
    └── import TemplateUploadForm, TemplateList from '@/components/Resume/'
          └── ❌ CRASH: Components do not exist

Backend:
  /api/resume/*
    └── ✅ Fully functional
```

### Issues
1. **Broken navigation** — students and faculty cannot access resume functionality
2. **Dead routes** — backend endpoints exist but have no frontend consumers
3. **Missing feature** — core product feature (resume generation) is inaccessible

---

## 8. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `docxtemplater` | ✅ Installed | Used by backend |
| `mammoth` | ✅ Installed | Used by backend for HTML preview |
| `pizzip` | ✅ Available | Needed for frontend template parsing (optional) |
| Firebase Storage | ✅ Configured | Template storage |
| AI Service | ✅ Available | `aiService.enhanceResumeFields` for tone enhancement |

---

## 9. Implementation Estimate

| Component | Estimated Effort | Complexity |
|-----------|------------------|------------|
| `ResumeBuilder` | 2-3 days | Medium |
| `TemplateUploadForm` | 1 day | Low |
| `TemplateList` | 1 day | Low |
| **Total** | **4-5 days** | **Medium** |

---

## 10. Recommendation

1. **Implement missing components** in the order: `TemplateList` → `TemplateUploadForm` → `ResumeBuilder`
2. **Add error boundaries** to prevent crashes if components fail to load
3. **Add loading states** while fetching templates
4. **Test end-to-end:** faculty uploads template → student selects template → student fills form → resume generates → student downloads DOCX

---

## 11. Relation to BUG-007

BUG-007 identified that the "Resume Readiness" card in the skills panel is dead UI because the Resume Builder frontend is broken. This issue (BUG-008) is the root cause of BUG-007. Fixing BUG-008 will enable a proper "Resume Readiness" implementation in a future iteration.

---

## 12. Next Steps

1. Create `@/components/Resume/ResumeBuilder`
2. Create `@/components/Resume/TemplateUploadForm`
3. Create `@/components/Resume/TemplateList`
4. Verify faculty template upload flow
5. Verify student resume generation flow
6. Revisit BUG-007 "Resume Readiness" card with real resume status integration
