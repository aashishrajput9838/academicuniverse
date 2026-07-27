# RB-010 â€” Faculty Resume Template Management: Investigation & Architecture

**Date:** 2026-07-21T05:20:00+05:30  
**Status:** Investigation Complete â€” Ready for Review  
**Scope:** Faculty-facing template management module design  

---

## 1. Executive Summary

The Faculty Resume Template Management module is completely unimplemented. The faculty page at `/dashboard/faculty/resume-templates` contains only a placeholder: "Template management interface coming in Phase 6."

The backend already has a functional but minimal template API:
- `POST /api/resume/templates` â€” upload, faculty/admin only
- `GET /api/resume/templates` â€” list, org-scoped
- `POST /api/resume/generate` â€” generate resume
- `GET /api/resume/draft` â€” fetch draft

The database schema (`ResumeTemplate`) exists but lacks management metadata: no status, versioning, usage analytics, preview images, descriptions, or soft delete.

**Recommendation:** Build Faculty Template Management as the next module. The backend foundation is solid; the frontend is entirely missing.

---

## 2. Current Codebase Assessment

### 2.1 Frontend State

| Area | Status | Notes |
|------|--------|-------|
| Faculty layout | âœ… Exists | `app/dashboard/faculty/layout.tsx` with sidebar |
| Faculty routing | âœ… Exists | Sidebar has "Resume Templates" link |
| Faculty page | âŒ Placeholder | Shows "coming in Phase 6" |
| Student Resume Builder | âœ… Complete | Phases 1â€“5 implemented |
| Shared Resume components | âœ… Exists | `components/Resume/` has reusable parts |
| Old template components | âš ï¸ Dead code | `TemplateEditor.tsx`, `TemplateList.tsx`, `TemplateUploadForm.tsx`, `ResumeBuilder.tsx` exist but are not imported anywhere |

### 2.2 Backend State

| Area | Status | Notes |
|------|--------|-------|
| Template upload endpoint | âœ… Exists | `POST /api/resume/templates` with multer + Cloudinary |
| Template list endpoint | âœ… Exists | `GET /api/resume/templates` with org isolation |
| Template delete endpoint | âŒ Missing | No DELETE route in `resumeRoutes.ts` |
| Template update endpoint | âŒ Missing | No PUT/PATCH route |
| Template metadata endpoints | âŒ Missing | No status, version, analytics |
| Placeholder extraction | âš ï¸ Disabled | Code exists in `resumeController.ts:76-104` but commented out |
| AI question generation | âš ï¸ Disabled | `aiService.generateTemplateQuestions` exists but not called |
| Interactive editor mapping | âš ï¸ Disabled | Code in `resumeController.ts:45-67` commented out |

---

## 3. Existing Architecture

### 3.1 Backend Architecture

```
resumeRoutes.ts
â”œâ”€â”€ POST /templates â†’ uploadTemplateController (FACULTY/ADMIN/SUPER_ADMIN)
â”œâ”€â”€ GET /templates â†’ getAvailableTemplatesController (all authenticated)
â”œâ”€â”€ POST /generate â†’ processResumeController (students)
â””â”€â”€ GET /draft â†’ getSavedResumeController (students)

resumeController.ts
â”œâ”€â”€ uploadTemplateController â†’ validates role, uploads to Cloudinary, saves metadata
â”œâ”€â”€ getAvailableTemplatesController â†’ org-scoped query, role-aware filtering
â”œâ”€â”€ processResumeController â†’ fetches DOCX, applies docxtemplater, generates preview
â””â”€â”€ getSavedResumeController â†’ returns draft data

resumeService.ts
â””â”€â”€ processResumeTemplate â†’ PizZip + Docxtemplater + Mammoth

storageService.ts
â”œâ”€â”€ uploadTimetable â†’ Firebase Storage
â””â”€â”€ uploadResumeTemplate â†’ Cloudinary (raw folder)
```

### 3.2 Frontend Architecture

```
app/dashboard/student/resume-builder/
â”œâ”€â”€ page.tsx (wrapper)
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ ResumeBuilderPage/
â”‚   â”‚   â”œâ”€â”€ ResumeBuilderPage.tsx (container)
â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”œâ”€â”€ useResumeBuilder.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ useTemplateSelection.ts
â”‚   â”‚   â”‚   â””â”€â”€ useAutoSave.ts
â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”œâ”€â”€ TemplateSelection/
â”‚   â”œâ”€â”€ ResumeForm/
â”‚   â”œâ”€â”€ Generation/
â”‚   â””â”€â”€ Preview/

app/dashboard/faculty/resume-templates/
â””â”€â”€ page.tsx (placeholder only)
```

### 3.3 Data Flow

```
Faculty Upload:
  Faculty Page â†’ templateApi.uploadTemplate() â†’ POST /api/resume/templates
    â†’ multer (memoryStorage, 5MB limit)
    â†’ storageService.uploadResumeTemplate() â†’ Cloudinary
    â†’ ResumeTemplate.save() â†’ MongoDB

Student Consumption:
  Student Page â†’ resumeApi.fetchTemplates() â†’ GET /api/resume/templates
    â†’ getAvailableTemplatesController â†’ ResumeTemplate.find({ organizationId })
    â†’ Returns templates with questions

Resume Generation:
  Student Page â†’ resumeApi.generateResume() â†’ POST /api/resume/generate
    â†’ processResumeController
    â†’ resumeService.processResumeTemplate()
      â†’ Fetches DOCX from Cloudinary
      â†’ Docxtemplater renders with data
      â†’ Mammoth converts to HTML
    â†’ Returns { htmlPreview, docxBase64, studentResumeId }
```

---

## 4. Backend Review

### 4.1 Existing Endpoints

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/api/resume/templates` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Upload template |
| GET | `/api/resume/templates` | JWT | All authenticated | List templates |
| POST | `/api/resume/generate` | JWT | All authenticated | Generate resume |
| GET | `/api/resume/draft` | JWT | All authenticated | Get draft |

### 4.2 Missing Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| DELETE | `/api/resume/templates/:id` | Delete template |
| PUT/PATCH | `/api/resume/templates/:id` | Update template metadata |
| GET | `/api/resume/templates/:id` | Get single template details |
| POST | `/api/resume/templates/:id/publish` | Publish template |
| POST | `/api/resume/templates/:id/unpublish` | Unpublish template |
| POST | `/api/resume/templates/:id/duplicate` | Duplicate template |
| GET | `/api/resume/templates/:id/usage` | Get usage statistics |

### 4.3 Controller Analysis

**uploadTemplateController:**
- Validates role correctly
- Accepts `templateName`, `type`, `target`, `mappings` (mappings disabled)
- Uploads to Cloudinary as `raw` resource type
- Extracts tags from DOCX (disabled for MVP)
- Saves to MongoDB with `questions` array (empty when disabled)
- Missing: file type validation, file size validation beyond multer limit, virus scanning

**getAvailableTemplatesController:**
- Role-aware query: faculty/admin see all org templates, students see global + targeted
- Populates `uploadedBy` with name and email
- Sorts by `createdAt` descending
- Missing: pagination, search, filter, sort parameters

### 4.4 Service Analysis

**ResumeService:**
- Uses `docxtemplater` for template rendering
- Uses `mammoth` for HTML preview generation
- Supports AI enhancement via `tone` parameter
- `enhanceableTags` allows selective AI rewriting
- Error handling is basic

**StorageService:**
- `uploadResumeTemplate` uses Cloudinary upload stream
- Stores in folder: `academicuniverse/templates/{organizationId}`
- Returns `secure_url`
- No file deduplication, no content-addressed storage

### 4.5 Middleware & Security

- `authenticateUser` â€” JWT verification, attaches `req.user`
- `authorize(...permissions)` â€” permission-based access control
- `enforceOrgIsolation` â€” prevents cross-org access
- Faculty upload already checks role: `['FACULTY', 'ADMIN', 'SUPER_ADMIN']`

### 4.6 Model Analysis

**ResumeTemplate (current):**
```typescript
{
  templateName: string;
  type: 'section' | 'department' | 'global';
  target: string;
  fileUrl: string;
  organizationId: ObjectId;
  uploadedBy: ObjectId;
  questions: [{ tag, question, type, aiEnhanceable }];
  createdAt: Date;
  updatedAt: Date;
}
```

**Missing fields:**
- `description` â€” template description
- `category` â€” category for grouping
- `tags` â€” searchable tags
- `version` â€” template versioning
- `status` â€” draft/published/archived
- `isPublished` â€” publication flag
- `previewImage` â€” thumbnail for template cards
- `placeholderList` â€” extracted placeholder catalog
- `fileSize` â€” upload size tracking
- `mimeType` â€” file type validation
- `lastUsedAt` â€” usage tracking
- `usageCount` â€” download/generation count
- `deletedAt` â€” soft delete

---

## 5. Frontend Review

### 5.1 Faculty Dashboard

- Uses `FacultyDashboardLayout` with sidebar navigation
- Auth check ensures only FACULTY role access
- Dashboard overview shows metrics cards and feature placeholders
- Sidebar includes "Resume Templates" link pointing to `/dashboard/faculty/resume-templates`

### 5.2 Student Resume Builder (Reference Implementation)

The student Resume Builder is the reference implementation for template consumption:
- `TemplateSelection` â€” search, filter, select template
- `ResumeForm` â€” dynamic form from `template.questions`
- `useAutoSave` â€” 2-second debounced draft saving
- `GenerationLoading` / `GenerationError` â€” generation states
- `ResumePreview` â€” sandboxed iframe with `srcDoc`
- `ExportActions` â€” DOCX download with retry

### 5.3 Dead Code Components

Four old components exist in `components/Resume/` but are not imported anywhere:
- `ResumeBuilder.tsx` â€” 101 lines, old monolithic component
- `TemplateEditor.tsx` â€” 232 lines, interactive DOCX tag editor with mammoth
- `TemplateList.tsx` â€” 107 lines, old template list
- `TemplateUploadForm.tsx` â€” 214 lines, old upload form with drag-and-drop

These contain useful patterns that can be refactored and reused.

---

## 6. Database Review

### 6.1 Current Schema Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No `status` field | Cannot distinguish draft vs published | High |
| No `version` field | Cannot track template iterations | Medium |
| No `previewImage` | No visual preview in template list | Medium |
| No `usageCount` | Cannot show popularity metrics | Low |
| No `lastUsedAt` | Cannot show recency | Low |
| No `description` | No template description | Medium |
| No `category`/`tags` | Poor searchability | Medium |
| No `fileSize`/`mimeType` | No file validation metadata | Low |
| No `deletedAt` | Hard delete only | Medium |
| No compound index on `(organizationId, type, createdAt)` | Slow filtered queries | Medium |

### 6.2 Recommended Schema Changes

```typescript
{
  templateName: string;
  type: 'section' | 'department' | 'global';
  target: string;
  fileUrl: string;
  organizationId: ObjectId;
  uploadedBy: ObjectId;
  questions: Array<{ tag, question, type, aiEnhanceable }>;

  description: string;
  category: string;
  tags: string[];
  version: number;
  status: 'draft' | 'published' | 'archived';
  isPublished: boolean;
  previewImage: string;
  fileSize: number;
  mimeType: string;
  placeholderList: string[];
  usageCount: number;
  lastUsedAt: Date;
  deletedAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
}
```

### 6.3 Recommended Indexes

```typescript
ResumeTemplateSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
ResumeTemplateSchema.index({ organizationId: 1, type: 1, isPublished: 1 });
ResumeTemplateSchema.index({ templateName: 'text', description: 'text', tags: 'text' });
```

---

## 7. Storage Review

### 7.1 Current Storage

| Aspect | Current State |
|--------|--------------|
| Provider | Cloudinary |
| Folder | `academicuniverse/templates/{organizationId}/` |
| Resource type | `raw` (for DOCX) |
| Public ID | `template_{timestamp}_{sanitized_filename}` |
| URL | `secure_url` from Cloudinary |
| Fallback | None (throws on failure) |

### 7.2 Storage Concerns

1. **No deduplication** â€” Same template uploaded twice creates two files
2. **No cleanup** â€” Old versions remain in Cloudinary
3. **No preview generation** â€” No thumbnail image generated from DOCX
4. **No virus scanning** â€” Uploaded files not scanned
5. **Hardcoded 5MB limit** â€” May need adjustment for complex templates

### 7.3 Recommended Improvements

- Generate preview image from DOCX first page
- Store preview as separate Cloudinary `image` resource
- Implement content-addressable storage for deduplication
- Add Cloudinary eager transformations for preview generation
- Consider signed URLs for temporary access

---

## 8. Authentication & Authorization

### 8.1 Current Auth Flow

1. Faculty logs in via Google OAuth or email/password
2. Firebase ID token sent to `/api/auth/login`
3. Backend creates/finds user, assigns role based on email domain
4. Backend returns JWT with `roleId`, `permissions`, `organizationId`
5. Frontend stores JWT in `localStorage`
6. All API calls include `Authorization: Bearer <token>`

### 8.2 Role Detection

| Email Domain | Role | Permissions |
|--------------|------|-------------|
| `@academicuniverse.com` | ADMIN/SUPER_ADMIN | All |
| `@fa.sharda.ac.in` | FACULTY | ADD_MARKS, VIEW_MARKS, EDIT_MARKS, VIEW_REPORTS, EDIT_PROFILE, USE_CHATBOT |
| `@ug.sharda.ac.in` | STUDENT | VIEW_MARKS, VIEW_REPORTS, EDIT_PROFILE, ACCESS_RESEARCH, USE_CHATBOT |
| `@pg.sharda.ac.in` | STUDENT | Same as UG |

### 8.3 Faculty Authorization for Templates

Current check in `uploadTemplateController`:
```typescript
const allowedRoles = ['FACULTY', 'ADMIN', 'SUPER_ADMIN'];
if (!allowedRoles.includes(roleName) && !req.user.isSuperAdmin) {
  return sendError(res, 403, 'You do not have permission...');
}
```

**Gap:** No ownership check. Any faculty in the org can modify/delete any template. Should add `uploadedBy` ownership check for non-admin roles.

---

## 9. Placeholder Engine Analysis

### 9.1 Current Placeholder System

**Format:** `{{tagName}}` (docxtemplater convention)

**Storage:** `ResumeTemplate.questions` array:
```typescript
{
  tag: string;
  question: string;
  type: 'text' | 'textarea';
  aiEnhanceable: boolean;
}
```

**Generation flow:**
1. Student fills form data mapped to tags
2. `docxtemplater` renders DOCX with data
3. `mammoth` converts rendered DOCX to HTML for preview
4. DOCX returned as base64 for download

### 9.2 Placeholder Extraction (Disabled)

In `resumeController.ts:76-104`, code exists to:
1. Unzip DOCX using PizZip
2. Extract `word/document.xml`
3. Strip XML tags to get raw text
4. Regex match `{{([^}]+)}}` patterns
5. Deduplicate tags
6. Call `aiService.generateTemplateQuestions(tags)` to create form questions

**Status:** Entirely commented out with `/* DISABLED FOR MVP */`

### 9.3 AI Question Generation (Exists)

`aiService.generateTemplateQuestions(tags)`:
- If Gemini API available: sends prompt to generate structured questions
- If Gemini API unavailable: falls back to basic mapping
- Returns array of `{ tag, question, type, aiEnhanceable }`

### 9.4 Interactive Editor (Disabled)

`TemplateEditor.tsx` (dead code) provides:
- DOCX upload and HTML rendering via mammoth
- Text selection and tag assignment
- Custom tag input
- Visual highlighting with `<mark>` tags
- XML rewriting to replace text with `{{tags}}`

**Status:** Dead code, but logic is sound and can be revived.

### 9.5 Placeholder Validation Gaps

| Gap | Impact |
|-----|--------|
| No validation of placeholder syntax | Malformed `{{tag` or `{tag}}` silently fails |
| No duplicate detection | Same placeholder used multiple times |
| No reserved word protection | `{{name}}` works, but `{{undefined}}` or `{{null}}` would fail |
| No placeholder-to-data mapping verification | Template may reference fields student never provides |
| No preview of mapped data | Faculty cannot see what data will fill placeholders |

---

## 10. UX Recommendations

### 10.1 Faculty Template Management UX

**Primary Interface:** Card grid with table toggle

**Template Card:**
- Preview thumbnail (first page of DOCX rendered as image)
- Template name
- Category/tags
- Type badge (Global/Section/Department)
- Target label (if section/department)
- Status indicator (Draft/Published/Archived)
- Usage count
- Last used date
- Action menu: Edit, Duplicate, Publish/Unpublish, Delete, Download

**Upload Flow:**
1. Drag & drop zone or file browser
2. DOCX validation (type, size, format check)
3. Automatic placeholder extraction
4. AI-generated question preview
5. Metadata form (name, description, type, target, category, tags)
6. Placeholder validation report
7. Preview of generated form
8. Publish or save as draft

**Preview Drawer:**
- Opens from template card
- Shows first page preview image
- Lists detected placeholders
- Shows associated questions
- Allows quick edit of metadata

### 10.2 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | Single column cards, full-width actions |
| Tablet (640px - 1024px) | 2-column grid, sidebar collapses |
| Desktop (> 1024px) | 3-column grid, full sidebar |

### 10.3 Accessibility

- All interactive elements keyboard accessible
- Drag & drop has keyboard alternative (file browser)
- Status announcements via `aria-live`
- Preview images have `alt` text
- Error messages associated with fields via `aria-describedby`
- Focus management in modals/drawers

---

## 11. Recommended User Journey

### 11.1 Upload New Template

1. Faculty clicks Upload Template.
2. Drag-and-drop zone appears with file-browser fallback.
3. Faculty selects DOCX.
4. System validates type, size, and basic integrity.
5. System extracts placeholders and generates AI questions.
6. Faculty sees validation report: valid, malformed, and duplicate placeholders.
7. Faculty fills metadata: name, description, type, target, category, tags, publish flag.
8. Faculty previews generated form and adjusts questions if needed.
9. Faculty saves template.
10. System uploads to Cloudinary, saves metadata to MongoDB, shows success toast, and redirects to list.

### 11.2 Manage Existing Templates

1. Faculty sees grid of template cards with preview, status, usage, and last-used date.
2. Faculty searches, filters, sorts, and toggles grid/table view.
3. Faculty opens preview drawer for metadata and placeholder review.
4. Faculty edits metadata, re-uploads DOCX, modifies questions, or changes publish status.

### 11.3 Publish/Unpublish

1. Faculty clicks Publish on a draft template.
2. Confirmation dialog appears.
3. On confirm, template status changes to published, isPublished is set, and publishedAt is recorded.
4. Students immediately see the template in their list.

---

## 12. Recommended Information Architecture

```
Faculty Dashboard
â””â”€â”€ Resume Templates
    â”œâ”€â”€ Template List
    â”‚   â”œâ”€â”€ Search bar
    â”‚   â”œâ”€â”€ Filter bar
    â”‚   â”œâ”€â”€ Sort dropdown
    â”‚   â”œâ”€â”€ View toggle
    â”‚   â”œâ”€â”€ Upload button
    â”‚   â””â”€â”€ Template Cards / Table Rows
    â”œâ”€â”€ Upload Flow
    â”‚   â”œâ”€â”€ File Drop Zone
    â”‚   â”œâ”€â”€ Validation Report
    â”‚   â”œâ”€â”€ Metadata Form
    â”‚   â””â”€â”€ Preview
    â”œâ”€â”€ Template Detail
    â”‚   â”œâ”€â”€ Preview Image
    â”‚   â”œâ”€â”€ Metadata
    â”‚   â”œâ”€â”€ Placeholder List
    â”‚   â”œâ”€â”€ Usage Stats
    â”‚   â””â”€â”€ Actions
    â””â”€â”€ Template Editor
        â”œâ”€â”€ DOCX Preview
        â”œâ”€â”€ Placeholder List
        â”œâ”€â”€ Question Editor
        â””â”€â”€ Save/Publish Actions
```

---

## 13. Recommended Folder Structure

```
app/dashboard/faculty/resume-templates/
â”œâ”€â”€ page.tsx
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ TemplateManagement/
â”‚   â”‚   â”œâ”€â”€ TemplateManagement.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateGrid.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateTable.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateCard.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateFilters.tsx
â”‚   â”‚   â”œâ”€â”€ TemplatePreviewDrawer.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateUploadModal.tsx
â”‚   â”‚   â””â”€â”€ TemplateEditor.tsx
â”‚   â”œâ”€â”€ Upload/
â”‚   â”‚   â”œâ”€â”€ DropZone.tsx
â”‚   â”‚   â”œâ”€â”€ FileValidation.tsx
â”‚   â”‚   â”œâ”€â”€ PlaceholderReport.tsx
â”‚   â”‚   â””â”€â”€ UploadProgress.tsx
â”‚   â””â”€â”€ shared/
â”‚       â”œâ”€â”€ TemplateStatusBadge.tsx
â”‚       â”œâ”€â”€ UsageStats.tsx
â”‚       â””â”€â”€ ConfirmDialog.tsx
hooks/
â”œâ”€â”€ useTemplateManagement.ts
â”œâ”€â”€ useTemplateUpload.ts
â”œâ”€â”€ useTemplateEditor.ts
â””â”€â”€ useTemplateFilters.ts
```

---

## 14. Recommended Component Tree

```
TemplateManagement
â”œâ”€â”€ TemplateHeader
â”‚   â”œâ”€â”€ Title
â”‚   â”œâ”€â”€ SearchInput
â”‚   â”œâ”€â”€ FilterDropdowns
â”‚   â”œâ”€â”€ SortDropdown
â”‚   â”œâ”€â”€ ViewToggle
â”‚   â””â”€â”€ UploadButton
â”œâ”€â”€ TemplateGrid / TemplateTable
â”‚   â””â”€â”€ TemplateCard / TableRow
â”‚       â”œâ”€â”€ PreviewImage
â”‚       â”œâ”€â”€ TemplateInfo
â”‚       â”œâ”€â”€ StatusBadge
â”‚       â”œâ”€â”€ UsageStats
â”‚       â””â”€â”€ ActionMenu
â”œâ”€â”€ TemplatePreviewDrawer
â”‚   â”œâ”€â”€ PreviewImage
â”‚   â”œâ”€â”€ MetadataSection
â”‚   â”œâ”€â”€ PlaceholderList
â”‚   â””â”€â”€ ActionButtons
â”œâ”€â”€ TemplateUploadModal
â”‚   â”œâ”€â”€ DropZone
â”‚   â”œâ”€â”€ FileValidation
â”‚   â”œâ”€â”€ PlaceholderReport
â”‚   â”œâ”€â”€ MetadataForm
â”‚   â””â”€â”€ PreviewForm
â””â”€â”€ TemplateEditorPage
    â”œâ”€â”€ EditorHeader
    â”œâ”€â”€ MetadataForm
    â”œâ”€â”€ PlaceholderList
    â”œâ”€â”€ QuestionEditor
    â””â”€â”€ EditorActions
```

---

## 15. Recommended Hooks

### 15.1 useTemplateManagement

```typescript
interface UseTemplateManagement {
  templates: ResumeTemplateDTO[];
  isLoading: boolean;
  error: string | null;
  search: string;
  filters: { type: string; status: string; category: string };
  sort: { field: string; direction: 'asc' | 'desc' };
  view: 'grid' | 'table';
  fetchTemplates: () => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<void>;
  publishTemplate: (id: string) => Promise<void>;
  unpublishTemplate: (id: string) => Promise<void>;
  downloadTemplate: (id: string) => Promise<void>;
  setSearch: (search: string) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setSort: (sort: Partial<Sort>) => void;
  setView: (view: 'grid' | 'table') => void;
}
```

### 15.2 useTemplateUpload

```typescript
interface UseTemplateUpload {
  file: File | null;
  isUploading: boolean;
  uploadProgress: number;
  validationResult: ValidationResult | null;
  placeholderReport: PlaceholderReport | null;
  extractedQuestions: TemplateQuestion[];
  validateFile: (file: File) => ValidationResult;
  extractPlaceholders: (buffer: Buffer) => Promise<PlaceholderReport>;
  generateQuestions: (tags: string[]) => Promise<TemplateQuestion[]>;
  uploadTemplate: (metadata: TemplateMetadata) => Promise<ResumeTemplateDTO>;
  reset: () => void;
}
```

### 15.3 useTemplateEditor

```typescript
interface UseTemplateEditor {
  template: ResumeTemplateDTO | null;
  isSaving: boolean;
  isPublishing: boolean;
  loadTemplate: (id: string) => Promise<void>;
  updateMetadata: (data: Partial<TemplateMetadata>) => Promise<void>;
  reuploadDocx: (file: File) => Promise<void>;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
}
```

### 15.4 useTemplateFilters

```typescript
interface UseTemplateFilters {
  search: string;
  filters: { type: string; status: string; category: string };
  sort: { field: 'createdAt' | 'name' | 'usageCount'; direction: 'asc' | 'desc' };
  setSearch: (search: string) => void;
  setFilter: (key: string, value: string) => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  clearFilters: () => void;
  filteredTemplates: (templates: ResumeTemplateDTO[]) => ResumeTemplateDTO[];
}
```

---

## 16. Recommended API Layer

### 16.1 New API Functions

```typescript
export async function fetchTemplate(backendToken: string, templateId: string): Promise<ResumeTemplateDTO>
export async function updateTemplate(backendToken: string, templateId: string, data: Partial<ResumeTemplateDTO>): Promise<ResumeTemplateDTO>
export async function publishTemplate(backendToken: string, templateId: string): Promise<ResumeTemplateDTO>
export async function unpublishTemplate(backendToken: string, templateId: string): Promise<ResumeTemplateDTO>
export async function duplicateTemplate(backendToken: string, templateId: string): Promise<ResumeTemplateDTO>
export async function fetchTemplateUsage(backendToken: string, templateId: string): Promise<UsageStatsDTO>
export async function searchTemplates(backendToken: string, query: string, filters: TemplateFilters): Promise<ResumeTemplateDTO[]>
export async function reuploadTemplateDocx(backendToken: string, templateId: string, formData: FormData): Promise<ResumeTemplateDTO>
```

### 16.2 Shared Request Helper

Extract duplicated `request<T>` helpers from `resumeApi.ts` and `templateApi.ts` into:

```typescript
// lib/apiClient.ts
export async function apiRequest<T>(endpoint: string, options: RequestInit, backendToken: string): Promise<T>
```
---

## 17. Recommended Database Improvements

### 17.1 Migration Strategy

Since this is MongoDB, use a soft migration approach:
1. Add new fields with defaults in the schema
2. Backfill existing documents with default values
3. No data loss, backward compatible

### 17.2 Backfill Script

```typescript
// scripts/backfillTemplateMetadata.ts
await ResumeTemplate.updateMany(
  { status: { $exists: false } },
  {
    $set: {
      status: 'published',
      isPublished: true,
      version: 1,
      usageCount: 0,
      deletedAt: null
    }
  }
);
```

---

## 18. Security Review

### 18.1 Current Security Posture

| Aspect | Status | Notes |
|--------|--------|-------|
| Authentication | âœ… | JWT required on all routes |
| Authorization | âœ… | Role check for upload |
| Organization Isolation | âœ… | All queries filtered by organizationId |
| File Size Limit | âœ… | 5MB multer limit |
| File Type Validation | âŒ | No MIME type check beyond extension |
| Virus Scanning | âŒ | None |
| Signed URLs | âŒ | Cloudinary public URLs |
| Rate Limiting | âŒ | None visible |
| Audit Logging | âŒ | No audit trail |

### 18.2 Security Recommendations

1. **File validation:** verify MIME type, check DOCX magic bytes, scan for macros/viruses
2. **Signed URLs:** use Cloudinary signed URLs with expiration
3. **Rate limiting:** limit uploads per faculty per hour
4. **Audit logging:** log all template CRUD operations
5. **Ownership checks:** faculty can only edit/delete their own templates; admins can manage all

---

## 19. Performance Review

### 19.1 Current Performance

| Aspect | Status |
|--------|--------|
| Template list query | âš ï¸ No pagination |
| Cloudinary upload | âœ… Async stream |
| Placeholder extraction | âš ï¸ Disabled |
| HTML preview generation | âš ï¸ Happens on every generation request |

### 19.2 Recommendations

1. Add cursor-based pagination for template lists
2. Cache template metadata in Redis with 5-minute TTL
3. Generate and cache preview images on upload
4. Lazy-load template details
5. Debounce search input by 300ms

---

## 20. Accessibility Review

### 20.1 Current State

| Criterion | Status |
|-----------|--------|
| Keyboard navigation | âš ï¸ Partial |
| ARIA labels | âŒ Missing |
| Focus management | âŒ Missing |
| Screen reader support | âŒ Missing aria-live |
| Color contrast | âœ… Consistent |
| Error association | âŒ Missing aria-describedby |

### 20.2 Recommendations

1. Add `role="listbox"` and `role="option"` to template grid
2. Add `aria-live="polite"` for upload status
3. Add `aria-describedby` for input errors
4. Ensure icon-only buttons have `aria-label`
5. Add focus trap to modals and drawers

---

## 21. Scalability Review

### 21.1 Current Scalability

| Dimension | Current Limit | Recommendation |
|-----------|--------------|----------------|
| Templates per org | Unlimited | Add pagination at 50/page |
| File size | 5MB | Keep for DOCX, warn above 2MB |
| Concurrent uploads | memoryStorage | Consider diskStorage for large files |
| Cloudinary storage | Unlimited | Monitor usage, set org quotas |
| Database queries | Unindexed filters | Add compound indexes |

### 21.2 Multi-Tenancy

- Organization isolation is correctly implemented
- Each org has separate Cloudinary folder
- No cross-org data leakage detected

---

## 22. Technical Debt

| # | Debt | Severity | Effort | Impact |
|---|------|----------|--------|--------|
| 1 | Duplicate request helper in resumeApi.ts and templateApi.ts | Low | 1h | DRY violation |
| 2 | 4 dead template components in components/Resume/ | Low | 2h | Confusion |
| 3 | Placeholder extraction disabled | Medium | 4h | Missing core feature |
| 4 | AI question generation disabled | Medium | 2h | Missing core feature |
| 5 | No template delete endpoint | High | 1h | Missing CRUD |
| 6 | No template update endpoint | High | 2h | Missing CRUD |
| 7 | No template status/versioning | Medium | 2h | Missing metadata |
| 8 | No preview image generation | Medium | 3h | Poor UX |
| 9 | No pagination in template list | Medium | 2h | Performance |
| 10 | No audit logging | Medium | 3h | Security |
| 11 | Hardcoded 5MB limit without MIME check | Low | 1h | Security |
| 12 | No ownership checks | High | 1h | Security |
| 13 | studentResumeId returned but not stored in frontend | Low | 30m | Missing data |
| 14 | generatedDocxUrl in StudentResume schema unused | Low | 30m | Dead field |

---

## 23. Potential Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Faculty uploads malicious DOCX | High | Low | Add file validation, virus scanning |
| Cross-org template leakage | High | Low | Enforce organizationId in all queries |
| Cloudinary cost overflow | Medium | Medium | Set upload quotas, monitor usage |
| Large DOCX causes OOM | Medium | Medium | Add streaming, size limits |
| Placeholder mismatch generates broken resume | High | Medium | Add validation, preview before publish |
| No backup of templates | Medium | Low | Enable Cloudinary backup, DB backups |
| Faculty accidentally deletes active template | Medium | Medium | Soft delete, confirmation dialogs |
| Template version conflicts | Low | Low | Add versioning, optimistic locking |

---

## 24. Open Questions

1. Should templates be owned by individual faculty or by the organization?
2. Should there be an approval step before templates are published to students?
3. When a faculty updates a template, should existing student drafts break?
4. Should the system enforce a standard set of placeholders or allow arbitrary custom placeholders?
5. Should faculty be able to configure which placeholders are AI-enhanceable?
6. What analytics metrics matter most: downloads, generations, completion rate, or time spent filling?
7. Should faculty be able to bulk upload templates?
8. Should templates be shareable between organizations or strictly org-scoped?
9. If a template DOCX is deleted from Cloudinary, should student generation fail gracefully?
10. Should the existing dead template components be refactored or deleted and rebuilt?

---

## 25. Implementation Strategy

### 25.1 Guiding Principles

1. Reuse over rebuild: refactor dead code before building new components
2. Backend-first: build missing endpoints before frontend
3. Incremental delivery: ship minimal viable management, then enhance
4. Type safety: all new code must pass tsc --noEmit
5. Security by default: organization isolation, ownership checks, file validation

### 25.2 Phase Approach

**Phase 1 â€” Foundation:**
- Backend: add missing endpoints
- Backend: add schema fields
- Backend: uncomment placeholder extraction and AI question generation
- Frontend: build TemplateManagement container and routing
- Frontend: build TemplateGrid and TemplateCard

**Phase 2 â€” Upload Flow:**
- Frontend: build DropZone, FileValidation, PlaceholderReport, TemplateUploadModal
- Backend: add file validation and preview image generation

**Phase 3 â€” Edit & Manage:**
- Frontend: build TemplateEditor page and TemplatePreviewDrawer
- Backend: add update and duplicate endpoints

**Phase 4 â€” Polish:**
- Frontend: search, filter, sort, pagination, bulk actions, accessibility
- Backend: audit logging, rate limiting
- Testing: unit tests, integration tests

---

## 26. Sprint Breakdown

### Sprint 1: Backend Foundation
- Add GET /api/resume/templates/:id
- Add PUT /api/resume/templates/:id
- Add DELETE /api/resume/templates/:id
- Add schema fields: status, version, description, previewImage, deletedAt
- Uncomment placeholder extraction
- Uncomment AI question generation
- Add file validation
- Add ownership check middleware

### Sprint 2: Frontend Foundation
- Create TemplateManagement container
- Create TemplateGrid and TemplateCard
- Create TemplateFilters
- Create useTemplateManagement hook
- Wire fetchTemplates with pagination
- Implement grid/table view toggle

### Sprint 3: Upload Experience
- Create DropZone component
- Create FileValidation component
- Create PlaceholderReport component
- Create TemplateUploadModal
- Implement placeholder extraction on client
- Implement preview image generation
- Wire up upload API

### Sprint 4: Edit & Manage
- Create TemplateEditor page
- Create TemplatePreviewDrawer
- Implement metadata editing
- Implement DOCX re-upload
- Implement publish/unpublish
- Implement duplicate

### Sprint 5: Polish & Production
- Add search debounce
- Add pagination
- Add bulk actions
- Add accessibility improvements
- Add audit logging
- Add rate limiting
- Write tests

---

## 27. Recommended Development Order

1. Backend endpoints first
2. Schema changes first
3. Reuse dead code
4. Student-first parity
5. Feature flags for gradual rollout

---

## 28. Acceptance Criteria for Phase 1

### Backend
- GET /api/resume/templates/:id returns template with all new fields
- PUT /api/resume/templates/:id updates metadata and/or DOCX
- DELETE /api/resume/templates/:id soft-deletes template
- Placeholder extraction works on upload
- AI question generation works or gracefully falls back
- File validation rejects non-DOCX files
- Ownership checks prevent faculty from editing others' templates

### Frontend
- Faculty sees template list with grid and table views
- Faculty can upload a DOCX template
- Faculty sees placeholder extraction report
- Faculty can edit template metadata
- Faculty can publish/unpublish templates
- Students still see only published, org-scoped templates

---

## 29. Go / No-Go Recommendation

**GO** â€” Proceed with Faculty Template Management implementation.

The backend foundation is solid, the student Resume Builder provides a proven reference implementation, and the required endpoints/schema changes are well-scoped. The main effort is frontend construction and re-enabling disabled backend features.

**Primary risk:** Scope creep into advanced features like bulk operations, approval workflows, and analytics. **Mitigation:** enforce strict Phase 1 boundaries and ship core CRUD + upload first.

**Secondary risk:** Reviving dead code may introduce legacy patterns. **Mitigation:** refactor dead components into the new folder structure rather than copying them inline.
