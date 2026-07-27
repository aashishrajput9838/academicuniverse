# RB-011 â€” Faculty Resume Template Management: Architecture & Technical Design

**Date:** 2026-07-21T05:27:00+05:30  
**Status:** Architecture Complete â€” Ready for Implementation  
**Scope:** Production-grade architecture for faculty template management  
**Source of Truth:** RB-010 Investigation Report  

---

## 1. Executive Summary

This document defines the complete architecture for the Faculty Resume Template Management module. The design follows the same engineering quality as the Student Resume Builder (RB-001 through RB-009) and is derived from the approved RB-010 investigation.

**Guiding principles:**
- Backend-first: endpoints and schema before frontend.
- Reuse over rebuild: refactor dead code before creating new components.
- Incremental delivery: core CRUD + upload first, then polish.
- Type safety: zero TypeScript errors.
- Security by default: organization isolation, ownership checks, upload validation.
- Accessibility: keyboard navigation, ARIA, focus management.

**Phasing:**
- Phase 1: Foundation â€” backend CRUD endpoints, schema extensions, frontend list/grid.
- Phase 2: Upload Experience â€” drop zone, placeholder extraction, preview generation.
- Phase 3: Edit & Manage â€” metadata editor, publish/unpublish, duplicate.
- Phase 4: Polish â€” search/filter/sort/pagination, accessibility, audit logging, rate limiting.

---

## 2. Final Architecture

### 2.1 System Overview

```
Faculty Dashboard
â””â”€â”€ Resume Templates
    â”œâ”€â”€ Template List
    â”‚   â”œâ”€â”€ TemplateHeader
    â”‚   â”œâ”€â”€ TemplateFilters
    â”‚   â”œâ”€â”€ TemplateGrid / TemplateTable
    â”‚   â””â”€â”€ Pagination / Bulk Actions
    â”œâ”€â”€ TemplateUploadModal
    â”‚   â”œâ”€â”€ DropZone
    â”‚   â”œâ”€â”€ FileValidation
    â”‚   â”œâ”€â”€ PlaceholderReport
    â”‚   â””â”€â”€ MetadataForm
    â”œâ”€â”€ TemplatePreviewDrawer
    â”‚   â”œâ”€â”€ PreviewImage
    â”‚   â”œâ”€â”€ Metadata
    â”‚   â”œâ”€â”€ PlaceholderList
    â”‚   â””â”€â”€ Actions
    â””â”€â”€ TemplateEditorPage
        â”œâ”€â”€ MetadataForm
        â”œâ”€â”€ PlaceholderList
        â”œâ”€â”€ QuestionEditor
        â””â”€â”€ EditorActions
```

### 2.2 Backend Architecture

```
resumeRoutes.ts
â”œâ”€â”€ POST   /templates                      â†’ uploadTemplateController
â”œâ”€â”€ GET    /templates                      â†’ listTemplatesController
â”œâ”€â”€ GET    /templates/:id                  â†’ getTemplateController
â”œâ”€â”€ PUT    /templates/:id                  â†’ updateTemplateController
â”œâ”€â”€ DELETE /templates/:id                  â†’ deleteTemplateController
â”œâ”€â”€ POST   /templates/:id/publish          â†’ publishTemplateController
â”œâ”€â”€ POST   /templates/:id/unpublish        â†’ unpublishTemplateController
â”œâ”€â”€ POST   /templates/:id/duplicate        â†’ duplicateTemplateController
â”œâ”€â”€ GET    /templates/:id/usage            â†’ getTemplateUsageController
â”œâ”€â”€ POST   /generate                       â†’ processResumeController
â””â”€â”€ GET    /draft                          â†’ getSavedResumeController

resumeController.ts
â”œâ”€â”€ uploadTemplateController
â”œâ”€â”€ listTemplatesController
â”œâ”€â”€ getTemplateController
â”œâ”€â”€ updateTemplateController
â”œâ”€â”€ deleteTemplateController
â”œâ”€â”€ publishTemplateController
â”œâ”€â”€ unpublishTemplateController
â”œâ”€â”€ duplicateTemplateController
â”œâ”€â”€ getTemplateUsageController
â”œâ”€â”€ processResumeController
â””â”€â”€ getSavedResumeController

resumeService.ts
â”œâ”€â”€ processResumeTemplate
â”œâ”€â”€ extractPlaceholders
â”œâ”€â”€ generatePreviewImage
â””â”€â”€ validateDocxStructure

storageService.ts
â”œâ”€â”€ uploadResumeTemplate
â”œâ”€â”€ deleteResumeTemplate
â”œâ”€â”€ uploadPreviewImage
â””â”€â”€ getSignedUrl

templateAuditService.ts (new)
â””â”€â”€ logTemplateEvent
```

### 2.3 Data Flow

```
Faculty Upload:
  Faculty Page
    â†’ templateApi.uploadTemplate()
    â†’ POST /api/resume/templates
    â†’ multer (memoryStorage)
    â†’ storageService.uploadResumeTemplate()
    â†’ Cloudinary raw upload
    â†’ resumeService.extractPlaceholders()
    â†’ aiService.generateTemplateQuestions()
    â†’ ResumeTemplate.save()
    â†’ Returns DTO

Student Consumption:
  Student Page
    â†’ resumeApi.fetchTemplates()
    â†’ GET /api/resume/templates
    â†’ listTemplatesController
    â†’ ResumeTemplate.find({ organizationId, isPublished })
    â†’ Returns templates with questions

Resume Generation:
  Student Page
    â†’ resumeApi.generateResume()
    â†’ POST /api/resume/generate
    â†’ processResumeController
    â†’ resumeService.processResumeTemplate()
    â†’ Returns { htmlPreview, docxBase64, studentResumeId }
```

---

## 3. Folder Structure

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
â”‚   â”‚   â”œâ”€â”€ TemplateHeader.tsx
â”‚   â”‚   â”œâ”€â”€ TemplatePagination.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateBulkActions.tsx
â”‚   â”‚   â”œâ”€â”€ TemplatePreviewDrawer.tsx
â”‚   â”‚   â”œâ”€â”€ TemplateUploadModal.tsx
â”‚   â”‚   â””â”€â”€ TemplateEditor.tsx
â”‚   â”œâ”€â”€ Upload/
â”‚   â”‚   â”œâ”€â”€ DropZone.tsx
â”‚   â”‚   â”œâ”€â”€ FileValidation.tsx
â”‚   â”‚   â”œâ”€â”€ PlaceholderReport.tsx
â”‚   â”‚   â”œâ”€â”€ UploadProgress.tsx
â”‚   â”‚   â””â”€â”€ MetadataForm.tsx
â”‚   â”œâ”€â”€ Editor/
â”‚   â”‚   â”œâ”€â”€ QuestionEditor.tsx
â”‚   â”‚   â”œâ”€â”€ PlaceholderList.tsx
â”‚   â”‚   â””â”€â”€ EditorActions.tsx
â”‚   â””â”€â”€ shared/
â”‚       â”œâ”€â”€ TemplateStatusBadge.tsx
â”‚       â”œâ”€â”€ UsageStats.tsx
â”‚       â”œâ”€â”€ ConfirmDialog.tsx
â”‚       â”œâ”€â”€ TemplatePreviewImage.tsx
â”‚       â””â”€â”€ index.ts
â”œâ”€â”€ hooks/
â”‚   â”œâ”€â”€ useTemplateManagement.ts
â”‚   â”œâ”€â”€ useTemplateUpload.ts
â”‚   â”œâ”€â”€ useTemplateEditor.ts
â”‚   â”œâ”€â”€ useTemplateFilters.ts
â”‚   â””â”€â”€ useTemplateBulkActions.ts
â””â”€â”€ types/
    â”œâ”€â”€ template.ts
    â”œâ”€â”€ api.ts
    â””â”€â”€ filters.ts

backend/src/controllers/resumeController.ts (extend)
backend/src/routes/resumeRoutes.ts (extend)
backend/src/services/resumeService.ts (extend)
backend/src/services/storageService.ts (extend)
backend/src/services/templateAuditService.ts (new)
backend/src/models/ResumeTemplate.ts (extend)
backend/src/middleware/templateOwnership.ts (new)
backend/src/types/template.ts (new)
backend/src/utils/validation/templateValidation.ts (new)
backend/src/utils/audit/auditLogger.ts (new)
```

---

## 4. Component Tree

```
TemplateManagement (main container)
â”œâ”€â”€ TemplateHeader
â”‚   â”œâ”€â”€ Title
â”‚   â”œâ”€â”€ Description
â”‚   â”œâ”€â”€ SearchInput
â”‚   â”œâ”€â”€ FilterDropdowns
â”‚   â”œâ”€â”€ SortDropdown
â”‚   â”œâ”€â”€ ViewToggle (grid/table)
â”‚   â”œâ”€â”€ UploadButton
â”‚   â””â”€â”€ BulkActions
â”œâ”€â”€ TemplateGrid
â”‚   â””â”€â”€ TemplateCard (Ã—N)
â”‚       â”œâ”€â”€ TemplatePreviewImage
â”‚       â”œâ”€â”€ TemplateInfo
â”‚       â”œâ”€â”€ TemplateStatusBadge
â”‚       â”œâ”€â”€ UsageStats
â”‚       â””â”€â”€ ActionMenu
â”‚           â”œâ”€â”€ EditAction
â”‚           â”œâ”€â”€ DuplicateAction
â”‚           â”œâ”€â”€ PublishAction
â”‚           â”œâ”€â”€ UnpublishAction
â”‚           â”œâ”€â”€ DeleteAction
â”‚           â””â”€â”€ DownloadAction
â”œâ”€â”€ TemplateTable
â”‚   â””â”€â”€ TableRow (Ã—N)
â”‚       â”œâ”€â”€ PreviewCell
â”‚       â”œâ”€â”€ InfoCell
â”‚       â”œâ”€â”€ StatusCell
â”‚       â”œâ”€â”€ UsageCell
â”‚       â”œâ”€â”€ DateCell
â”‚       â””â”€â”€ ActionsCell
â”œâ”€â”€ TemplateFilters
â”‚   â”œâ”€â”€ SearchInput
â”‚   â”œâ”€â”€ TypeFilter
â”‚   â”œâ”€â”€ StatusFilter
â”‚   â”œâ”€â”€ CategoryFilter
â”‚   â”œâ”€â”€ SortSelect
â”‚   â””â”€â”€ ClearFilters
â”œâ”€â”€ TemplatePagination
â”‚   â”œâ”€â”€ PageInfo
â”‚   â”œâ”€â”€ PrevButton
â”‚   â”œâ”€â”€ NextButton
â”‚   â””â”€â”€ PageSizeSelect
â”œâ”€â”€ TemplatePreviewDrawer
â”‚   â”œâ”€â”€ DrawerHeader
â”‚   â”œâ”€â”€ PreviewImage
â”‚   â”œâ”€â”€ MetadataSection
â”‚   â”œâ”€â”€ PlaceholderList
â”‚   â”œâ”€â”€ UsageStats
â”‚   â””â”€â”€ ActionButtons
â”œâ”€â”€ TemplateUploadModal
â”‚   â”œâ”€â”€ ModalHeader
â”‚   â”œâ”€â”€ DropZone
â”‚   â”œâ”€â”€ FileValidation
â”‚   â”œâ”€â”€ PlaceholderReport
â”‚   â”œâ”€â”€ MetadataForm
â”‚   â””â”€â”€ ModalFooter
â””â”€â”€ TemplateEditorPage
    â”œâ”€â”€ EditorHeader
    â”œâ”€â”€ MetadataForm
    â”œâ”€â”€ PlaceholderList
    â”œâ”€â”€ QuestionEditor
    â””â”€â”€ EditorActions
```

---

## 5. Hook Architecture

### 5.1 useTemplateManagement

**Responsibilities:** Main list management, CRUD actions, view state.

**State:**
- `templates: ResumeTemplateDTO[]`
- `isLoading: boolean`
- `error: string | null`
- `view: 'grid' | 'table'`
- `selectedIds: string[]`
- `pagination: { page: number; pageSize: number; total: number }`

**Actions:**
- `fetchTemplates()`
- `deleteTemplate(id: string)`
- `duplicateTemplate(id: string)`
- `publishTemplate(id: string)`
- `unpublishTemplate(id: string)`
- `downloadTemplate(id: string)`
- `bulkDelete(ids: string[])`
- `bulkPublish(ids: string[])`
- `bulkUnpublish(ids: string[])`
- `setView(view)`
- `setSelectedIds(ids)`

**Callbacks:**
- `onSuccess?: () => void`
- `onError?: (error: string) => void`

**Dependencies:**
- `templateApi`
- `useTemplateFilters`

### 5.2 useTemplateUpload

**Responsibilities:** Upload flow, validation, placeholder extraction.

**State:**
- `file: File | null`
- `isUploading: boolean`
- `uploadProgress: number`
- `validationResult: ValidationResult | null`
- `placeholderReport: PlaceholderReport | null`
- `extractedQuestions: TemplateQuestion[]`

**Actions:**
- `validateFile(file: File): ValidationResult`
- `extractPlaceholders(buffer: ArrayBuffer): Promise<PlaceholderReport>`
- `generateQuestions(tags: string[]): Promise<TemplateQuestion[]>`
- `uploadTemplate(metadata: TemplateMetadata): Promise<ResumeTemplateDTO>`
- `reset()`

**Dependencies:**
- `templateApi`
- `resumeService` (placeholder extraction)

### 5.3 useTemplateEditor

**Responsibilities:** Load, edit, save, publish single template.

**State:**
- `template: ResumeTemplateDTO | null`
- `isSaving: boolean`
- `isPublishing: boolean`
- `isDeleting: boolean`

**Actions:**
- `loadTemplate(id: string)`
- `updateMetadata(data: Partial<TemplateMetadata>)`
- `reuploadDocx(file: File)`
- `saveDraft()`
- `publish()`
- `unpublish()`
- `duplicate()`
- `delete()`

**Dependencies:**
- `templateApi`

### 5.4 useTemplateFilters

**Responsibilities:** Search, filter, sort, pagination logic.

**State:**
- `search: string`
- `filters: { type: string; status: string; category: string }`
- `sort: { field: string; direction: 'asc' | 'desc' }`
- `pagination: { page: number; pageSize: number }`

**Actions:**
- `setSearch(search: string)`
- `setFilter(key: string, value: string)`
- `setSort(field: string, direction: 'asc' | 'desc')`
- `clearFilters()`
- `setPage(page: number)`
- `setPageSize(size: number)`

**Derived:**
- `filteredTemplates(templates: ResumeTemplateDTO[]): ResumeTemplateDTO[]`
- `paginatedTemplates(templates: ResumeTemplateDTO[]): ResumeTemplateDTO[]`

**Dependencies:**
- None (pure logic)

### 5.5 useTemplateBulkActions

**Responsibilities:** Bulk selection and bulk operations.

**State:**
- `selectedIds: Set<string>`
- `isBulkProcessing: boolean`

**Actions:**
- `toggleSelect(id: string)`
- `toggleSelectAll()`
- `clearSelection()`
- `bulkDelete()`
- `bulkPublish()`
- `bulkUnpublish()`

**Dependencies:**
- `useTemplateManagement`

---

## 6. API Design

### 6.1 Endpoints

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/api/resume/templates` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Upload template |
| GET | `/api/resume/templates` | JWT | All authenticated | List templates |
| GET | `/api/resume/templates/:id` | JWT | All authenticated | Get single template |
| PUT | `/api/resume/templates/:id` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Update template |
| DELETE | `/api/resume/templates/:id` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Soft delete template |
| POST | `/api/resume/templates/:id/publish` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Publish template |
| POST | `/api/resume/templates/:id/unpublish` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Unpublish template |
| POST | `/api/resume/templates/:id/duplicate` | JWT | FACULTY, ADMIN, SUPER_ADMIN | Duplicate template |
| GET | `/api/resume/templates/:id/usage` | JWT | All authenticated | Get usage stats |
| POST | `/api/resume/generate` | JWT | All authenticated | Generate resume |
| GET | `/api/resume/draft` | JWT | All authenticated | Get draft |

### 6.2 Request/Response DTOs

**Upload Request:**
```typescript
interface UploadTemplateRequest {
  templateName: string;
  type: 'global' | 'section' | 'department';
  target?: string;
  description?: string;
  category?: string;
  tags?: string[];
  publish?: boolean;
}
```

**Update Request:**
```typescript
interface UpdateTemplateRequest {
  templateName?: string;
  type?: 'global' | 'section' | 'department';
  target?: string;
  description?: string;
  category?: string;
  tags?: string[];
  questions?: TemplateQuestion[];
}
```

**List Response:**
```typescript
interface TemplateListResponse {
  data: ResumeTemplateDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

**Usage Response:**
```typescript
interface TemplateUsageResponse {
  templateId: string;
  usageCount: number;
  lastUsedAt: Date | null;
  studentCount: number;
  recentGenerations: Array<{
    studentId: string;
    studentName: string;
    generatedAt: Date;
  }>;
}
```

### 6.3 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Unauthorized |
| 404 | Not found |
| 413 | File too large |
| 422 | Invalid DOCX / placeholder mismatch |
| 500 | Server error |

### 6.4 Error Codes

```typescript
type TemplateErrorCode =
  | 'TEMPLATE_NAME_REQUIRED'
  | 'TEMPLATE_TYPE_REQUIRED'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'PLACEHOLDER_EXTRACTION_FAILED'
  | 'PLACEHOLDER_SYNTAX_INVALID'
  | 'DUPLICATE_PLACEHOLDER'
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_ALREADY_PUBLISHED'
  | 'TEMPLATE_NOT_PUBLISHED'
  | 'TEMPLATE_IN_USE'
  | 'UNAUTHORIZED_TEMPLATE_ACCESS'
  | 'CROSS_ORG_TEMPLATE_ACCESS';
```

---

## 7. Backend Design

### 7.1 Controllers

**listTemplatesController:**
- Accepts query params: `page`, `pageSize`, `search`, `type`, `status`, `category`, `sortField`, `sortDirection`
- Enforces organization isolation
- Role-aware: faculty/admin see all statuses, students see only published
- Returns paginated response with metadata

**getTemplateController:**
- Fetches single template by ID
- Populates `uploadedBy` with user details
- Checks organization membership

**updateTemplateController:**
- Accepts multipart/form-data or JSON
- Validates ownership unless admin/superadmin
- Supports metadata update and DOCX re-upload
- Creates new version on DOCX change
- Logs audit event

**deleteTemplateController:**
- Soft delete only
- Checks if template is in active use
- Requires confirmation if usageCount > 0
- Logs audit event

**publishTemplateController / unpublishTemplateController:**
- Transitions status between draft/published/archived
- Validates template has at least one valid placeholder
- Logs audit event

**duplicateTemplateController:**
- Clones template metadata and file
- Assigns new Cloudinary file or reuses existing
- Sets status to draft
- Sets `uploadedBy` to current user
- Increments version

**getTemplateUsageController:**
- Returns usageCount, lastUsedAt, studentCount, recentGenerations
- Aggregates from StudentResume collection

### 7.2 Services

**ResumeService (extend):**
- `extractPlaceholders(buffer: Buffer): Promise<string[]>`
- `validatePlaceholders(placeholders: string[]): ValidationResult`
- `generatePreviewImage(buffer: Buffer): Promise<string>`

**StorageService (extend):**
- `deleteResumeTemplate(fileUrl: string): Promise<void>`
- `uploadPreviewImage(buffer: Buffer, organizationId: string): Promise<string>`
- `getSignedUrl(fileUrl: string, expiresIn?: number): Promise<string>`

**TemplateAuditService (new):**
- `logTemplateEvent(event: AuditEvent): Promise<void>`
- Events: created, updated, deleted, published, unpublished, duplicated, downloaded, generated

### 7.3 Routes

```
resumeRoutes.ts
â”œâ”€â”€ POST   /templates                      â†’ uploadTemplateController
â”œâ”€â”€ GET    /templates                      â†’ listTemplatesController
â”œâ”€â”€ GET    /templates/:id                  â†’ getTemplateController
â”œâ”€â”€ PUT    /templates/:id                  â†’ updateTemplateController
â”œâ”€â”€ DELETE /templates/:id                  â†’ deleteTemplateController
â”œâ”€â”€ POST   /templates/:id/publish          â†’ publishTemplateController
â”œâ”€â”€ POST   /templates/:id/unpublish        â†’ unpublishTemplateController
â”œâ”€â”€ POST   /templates/:id/duplicate        â†’ duplicateTemplateController
â”œâ”€â”€ GET    /templates/:id/usage            â†’ getTemplateUsageController
â”œâ”€â”€ POST   /generate                       â†’ processResumeController
â””â”€â”€ GET    /draft                          â†’ getSavedResumeController
```

### 7.4 Validation

**Upload Validation:**
- `templateName`: required, 3-100 chars, no leading/trailing spaces
- `type`: required, enum: `global | section | department`
- `target`: required if type is `section` or `department`
- `file`: required, max 10MB, MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `description`: optional, max 500 chars
- `category`: optional, max 50 chars
- `tags`: optional, array of strings, max 10 tags

**Placeholder Validation:**
- Must match `{{[a-zA-Z0-9_]+}}`
- No reserved words: `undefined`, `null`, `NaN`, `Infinity`
- No duplicates allowed
- At least one valid placeholder required for publish

### 7.5 Middleware

**templateOwnership:**
- Checks `req.user.userId === template.uploadedBy` OR user is admin/superadmin
- Returns 403 if unauthorized

**templateVersioning:**
- On update with new DOCX, increments version
- Creates version history entry (optional future enhancement)

### 7.6 Cloudinary Flow

**Upload:**
1. Faculty selects DOCX
2. Backend receives buffer via multer
3. `storageService.uploadResumeTemplate()` uploads to Cloudinary raw folder
4. Backend generates preview image from first page
5. Backend saves template metadata + fileUrl + previewImage to MongoDB

**Re-upload:**
1. Faculty uploads new DOCX
2. Backend uploads to Cloudinary with version suffix
3. Old file optionally deleted
4. Preview image regenerated

**Delete:**
1. Soft delete in MongoDB
2. Cloudinary file marked for deletion (delayed)
3. Preview image deleted immediately

### 7.7 Placeholder Extraction

**Flow:**
1. Receive DOCX buffer
2. Unzip with PizZip
3. Extract `word/document.xml`
4. Strip XML tags: `xml.replace(/<[^>]+>/g, '')`
5. Regex match: `cleanText.match(/\{\{([^}]+)\}\}/g)`
6. Deduplicate tags
7. Validate syntax
8. Return `string[]` of unique tags

**AI Question Generation:**
1. Call `aiService.generateTemplateQuestions(tags)`
2. If Gemini unavailable, fallback to basic mapping:
   - `tag` â†’ `Please provide: ${tag}`
   - `type` â†’ `textarea` if tag contains `desc`/`experience`/`project`, else `text`
   - `aiEnhanceable` â†’ `false`
3. Return `TemplateQuestion[]`

### 7.8 Ownership Validation

```typescript
export const requireTemplateOwnership = async (req: any, res: Response, next: NextFunction) => {
  const template = await ResumeTemplate.findById(req.params.id);
  if (!template) return sendError(res, 404, 'Template not found');

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role) || req.user.isSuperAdmin;
  const isOwner = template.uploadedBy.toString() === req.user.userId;

  if (!isAdmin && !isOwner) {
    return sendError(res, 403, 'You do not own this template');
  }

  req.template = template;
  next();
};
```

### 7.9 Soft Delete

```typescript
// Delete controller
template.deletedAt = new Date();
template.isDeleted = true;
await template.save();
await storageService.deleteResumeTemplate(template.fileUrl);
```

### 7.10 Versioning

```typescript
// On DOCX re-upload
const newVersion = template.version + 1;
template.version = newVersion;
template.fileUrl = newFileUrl;
template.previewImage = newPreviewUrl;
template.updatedAt = new Date();
await template.save();
```

### 7.11 Audit Logging

```typescript
interface AuditEvent {
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'duplicate' | 'download' | 'generate';
  templateId: string;
  userId: string;
  organizationId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
```

Events logged to MongoDB collection `TemplateAuditLog` with TTL index (90 days).
---

## 8. Database Design

### 8.1 Final Schema

```typescript
const ResumeTemplateSchema = new Schema<IResumeTemplate>(
  {
    templateName: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    type: {
      type: String,
      enum: ['section', 'department', 'global'],
      required: [true, 'Template type is required'],
    },
    target: {
      type: String,
      trim: true,
      default: '',
    },
    fileUrl: {
      type: String,
      required: true,
    },
    previewImage: {
      type: String,
      default: '',
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: [{
      tag: { type: String, required: true },
      question: { type: String, required: true },
      type: { type: String, enum: ['text', 'textarea'], default: 'text' },
      aiEnhanceable: { type: Boolean, default: false }
    }],
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category must be at most 50 characters'],
      default: '',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    placeholderList: [{
      type: String,
      trim: true,
    }],
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  } as any,
  {
    timestamps: true,
  }
);

ResumeTemplateSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
ResumeTemplateSchema.index({ organizationId: 1, type: 1, isPublished: 1 });
ResumeTemplateSchema.index({ organizationId: 1, uploadedBy: 1 });
ResumeTemplateSchema.index({ templateName: 'text', description: 'text', tags: 'text' });
```

### 8.2 Migration Strategy

Soft migration for MongoDB:
1. Add new fields with defaults in schema
2. Backfill existing documents:
   - status â†’ 'published'
   - isPublished â†’ true
   - version â†’ 1
   - usageCount â†’ 0
   - deletedAt â†’ null
3. No data loss, backward compatible

### 8.3 Soft Delete

- deletedAt: Date | null
- All queries filter deletedAt: null by default
- Soft-deleted templates hidden from faculty UI but retained for audit
- Hard delete only after 90-day retention via background job

### 8.4 Versioning

- version: Number increments on each DOCX re-upload
- Version history stored in separate collection TemplateVersion (future)
- Students always get latest published version
- Existing drafts reference template ID only; regeneration uses current version

### 8.5 Usage Analytics

- usageCount: Number incremented on each resume generation
- lastUsedAt: Date updated on each generation
- studentCount derived from distinct userId in StudentResume for template
- recentGenerations from StudentResume.createdAt descending, limited to 10

---

## 9. Storage Design

### 9.1 Cloudinary Structure

Folder: academicuniverse/templates/{organizationId}/
Files:
  - template_{timestamp}_{sanitized_name}.docx
  - template_{timestamp}_{sanitized_name}_preview.png

Resource types:
  - DOCX: raw
  - Preview: image

### 9.2 Upload Flow

1. Multer memoryStorage receives file buffer
2. Validate MIME type and magic bytes
3. Upload DOCX to Cloudinary raw folder
4. Generate preview image from first page
5. Upload preview to Cloudinary image folder
6. Return { fileUrl, previewImage }

### 9.3 Re-upload Flow

1. Upload new DOCX with versioned public ID
2. Delete old DOCX from Cloudinary (async)
3. Generate and upload new preview
4. Delete old preview from Cloudinary (async)
5. Update template metadata with new URLs and version

### 9.4 Delete Flow

1. Soft delete in MongoDB
2. Schedule Cloudinary deletion with 90-day delay
3. Delete preview immediately

### 9.5 Signed URLs

For faculty download action:
- Cloudinary signed URLs with 1-hour expiration
- Faculty preview images: public URLs with 24-hour CDN TTL

### 9.6 Deduplication (Future)

- Compute SHA-256 hash of DOCX buffer on upload
- Check existing templates for matching hash
- If found, reuse existing fileUrl instead of uploading duplicate
- Store hash in ResumeTemplate.fileHash
---

## 10. Security Design

### 10.1 Ownership Checks

```typescript
export const requireTemplateOwnership = async (req: any, res: Response, next: NextFunction) => {
  const template = await ResumeTemplate.findById(req.params.id);
  if (!template) return sendError(res, 404, 'Template not found');

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role) || req.user.isSuperAdmin;
  const isOwner = template.uploadedBy.toString() === req.user.userId;

  if (!isAdmin && !isOwner) {
    return sendError(res, 403, 'You do not own this template');
  }

  req.template = template;
  next();
};
```

### 10.2 Organization Isolation

All queries include organizationId filter:
```typescript
const query = { organizationId: req.user.organizationId, deletedAt: null };
```

Middleware enforceOrgIsolation already exists and is applied globally.

### 10.3 Upload Validation

1. MIME type check: verify Content-Type header matches DOCX MIME
2. Magic bytes check: DOCX files start with PK (0x50 0x4B)
3. Size check: max 10MB for DOCX, max 5MB for preview image
4. Zip integrity check: attempt to unzip with PizZip, fail if corrupted

### 10.4 Virus Scanning Integration Point

Interface for future ClamAV integration:
```typescript
interface VirusScanner {
  scan(buffer: Buffer): Promise<{ clean: boolean; threats?: string[] }>;
}

// In upload controller:
const scanner = new ClamAVScanner();
const scanResult = await scanner.scan(file.buffer);
if (!scanResult.clean) {
  return sendError(res, 422, 'File failed virus scan');
}
```

### 10.5 Rate Limiting

Per faculty per hour:
```typescript
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user.userId,
  message: 'Too many uploads. Please try again later.',
});
```

### 10.6 Audit Logging

All template mutations logged to TemplateAuditLog:
```typescript
{
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'duplicate' | 'download' | 'generate',
  templateId: string,
  userId: string,
  organizationId: string,
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  createdAt: Date,
}
```

TTL index on createdAt with 90-day expiry.

### 10.7 Signed URLs

All template downloads use Cloudinary signed URLs with 1-hour expiration. Faculty preview images use public URLs with 24-hour CDN TTL.

---

## 11. State Management

### 11.1 Principles

- Hooks encapsulate feature logic
- No global state library (per project requirements)
- Localized state with prop drilling where needed
- Avoid god hooks: split by responsibility

### 11.2 Hook Contracts

**useTemplateManagement:**
- Owns list state, loading, error, view mode, selection
- Exposes CRUD actions
- Delegates filtering to useTemplateFilters

**useTemplateUpload:**
- Owns upload state, validation, placeholder extraction
- Exposes upload action
- Resets state after completion

**useTemplateEditor:**
- Owns single template state, save/publish/delete actions
- Exposes metadata update and DOCX re-upload
- Does NOT manage list state

**useTemplateFilters:**
- Pure logic hook
- Owns search, filters, sort, pagination state
- Exposes filtered/paginated derived arrays
- No side effects

**useTemplateBulkActions:**
- Owns selection state
- Exposes bulk actions
- Delegates CRUD to useTemplateManagement

### 11.3 State Flow

Faculty Page
â”œâ”€â”€ TemplateManagement (container)
â”‚   â”œâ”€â”€ useTemplateManagement (list + CRUD)
â”‚   â”œâ”€â”€ useTemplateFilters (search/filter/sort/pagination)
â”‚   â””â”€â”€ useTemplateBulkActions (selection + bulk ops)
â”œâ”€â”€ TemplateUploadModal
â”‚   â””â”€â”€ useTemplateUpload (upload flow)
â””â”€â”€ TemplateEditorPage
    â””â”€â”€ useTemplateEditor (single template edit)

---

## 12. Validation Strategy

### 12.1 Frontend Validation

Upload Form:
- Template name: required, min 3 chars, max 100 chars
- Type: required, enum validation
- Target: required if type is section/department
- File: required, DOCX only, max 10MB
- Tags: max 10 tags, each max 30 chars

Placeholder Report:
- Syntax validation: {{[a-zA-Z0-9_]+}}
- Duplicate detection
- Reserved word blacklist: undefined, null, NaN, Infinity
- Minimum 1 valid placeholder required for publish

Metadata Editor:
- Same as upload form
- Questions array editable with add/remove/reorder

### 12.2 Backend Validation

Zod schemas enforce:
- templateName: string, min 3, max 100
- type: enum global | section | department
- target: string if section/department
- description: string, max 500
- category: string, max 50
- tags: array of strings, max 10 items, each max 30 chars
- questions: array of { tag, question, type, aiEnhanceable }

File validation:
- MIME type check
- Magic bytes check (PK zip header)
- Size limit enforcement
- Zip integrity check

---

## 13. Error Handling Strategy

### 13.1 Error Categories

| Category | Handling |
|----------|----------|
| Validation error | 400 with field-level errors |
| Authentication error | 401 with redirect to login |
| Authorization error | 403 with permission message |
| Not found | 404 with resource identifier |
| File error | 413/422 with file-specific message |
| Conflict | 409 for duplicate names or locked templates |
| Server error | 500 with generic message + request ID |

### 13.2 Frontend Error Handling

Component-level:
- ResumeErrorState reused for template operations
- Inline errors for form fields
- Toast notifications for success/error
- Retry buttons for transient failures

Hook-level:
- All hooks expose error state
- Actions throw typed errors
- Callers decide UI presentation

### 13.3 Backend Error Handling

Controller-level:
- Try/catch with structured error responses
- Log errors with Winston + request ID
- Return { success: false, message, statusCode, details }

Service-level:
- Throw custom error classes
- Wrap third-party errors (Cloudinary, PizZip)
- Preserve original error message for debugging

---

## 14. Performance Strategy

### 14.1 Pagination

- Cursor-based pagination for large lists
- Default page size: 20, options: 10, 20, 50
- Cursor = last template _id + createdAt
- Response includes nextCursor and hasMore

### 14.2 Caching

- Template metadata cached in Redis: 5-minute TTL
- Preview images cached in Cloudinary with 24-hour CDN TTL
- Placeholder extraction results cached per file hash
- Cache invalidation on template update/delete

### 14.3 Preview Generation

- Generate preview image once on upload
- Store in Cloudinary as image resource type
- Reuse on duplicate/reupload if content unchanged
- Lazy-load preview images in grid (Intersection Observer)

### 14.4 Lazy Loading

- Template details loaded on demand (drawer open)
- Questions expanded only when editor opens
- Preview images lazy-loaded with skeleton placeholder

### 14.5 Optimistic Updates

- Delete action: remove card immediately, rollback on failure
- Publish/unpublish: update badge immediately, rollback on failure
- Duplicate: add new card with generating state, replace on success

### 14.6 Memoization

- useMemo for filtered/sorted/paginated templates
- useCallback for all event handlers
- React.memo for TemplateCard and TableRow

### 14.7 Debouncing

- Search input: 300ms debounce
- Filter changes: no debounce (instant)
- Sort changes: no debounce (instant)

---

## 15. Accessibility Strategy

### 15.1 Keyboard Navigation

- Template grid: role="listbox" with role="option" items
- Arrow keys navigate between cards
- Enter/Space opens preview drawer
- Escape closes modals/drawers
- Tab order follows visual layout

### 15.2 ARIA

- Upload button: aria-label="Upload template"
- Search input: aria-label="Search templates"
- Filter dropdowns: aria-label="Filter by {type}"
- Sort dropdown: aria-label="Sort templates"
- View toggle: aria-label="Switch to {grid|table} view"
- Bulk actions: aria-label="Select all templates"
- Status badges: aria-label="Status: {draft|published|archived}"
- Preview images: alt="{template name} preview"

### 15.3 Focus Management

- Modal open: focus first interactive element
- Modal close: return focus to trigger element
- Drawer open: focus drawer header
- Drawer close: return focus to triggering card
- Bulk actions: focus moves to action toolbar

### 15.4 Screen Reader Support

- aria-live="polite" for upload status
- aria-live="assertive" for errors
- Loading spinners: aria-busy="true" with loading text
- Empty states: descriptive text explaining no templates

### 15.5 Error Association

- Form errors: aria-describedby pointing to error text
- Inline validation: aria-invalid="true" on inputs
- Error summaries at top of forms

---

## 16. Testing Strategy

### 16.1 Unit Tests

Backend:
- resumeController.ts: upload, list, get, update, delete, publish, unpublish, duplicate
- resumeService.ts: processResumeTemplate, extractPlaceholders, validatePlaceholders, generatePreviewImage
- storageService.ts: uploadResumeTemplate, deleteResumeTemplate, uploadPreviewImage
- templateAuditService.ts: logTemplateEvent
- Middleware: requireTemplateOwnership, enforceOrgIsolation

Frontend:
- useTemplateManagement: fetch, delete, duplicate, publish, unpublish, bulk actions
- useTemplateUpload: validateFile, extractPlaceholders, uploadTemplate
- useTemplateEditor: load, update, save, publish, delete
- useTemplateFilters: search, filter, sort, pagination logic
- TemplateCard: selection, actions, accessibility

### 16.2 Integration Tests

Backend:
- Full upload flow: multipart request â†’ Cloudinary â†’ MongoDB
- Update flow: metadata update â†’ version increment â†’ audit log
- Delete flow: soft delete â†’ Cloudinary cleanup â†’ audit log
- Publish flow: status transition â†’ student visibility
- Placeholder extraction: real DOCX with known tags
- AI question generation: mocked Gemini, mocked fallback

Frontend:
- Upload modal: drag-drop, file select, validation, submission
- Template list: search, filter, sort, pagination, view toggle
- Preview drawer: open, close, actions
- Editor: load, edit, save, publish
- Bulk actions: select all, bulk delete, bulk publish

### 16.3 E2E Tests

User journeys:
1. Faculty uploads template â†’ sees it in list â†’ publishes â†’ student sees it
2. Faculty edits template â†’ re-uploads DOCX â†’ version increments
3. Faculty duplicates template â†’ new draft created
4. Faculty deletes template â†’ confirmation â†’ soft deleted
5. Faculty searches/filters/sorts templates
6. Faculty downloads template
7. Student generates resume from published template

### 16.4 Manual QA

- Upload various DOCX formats (complex layouts, tables, images)
- Upload invalid files (.pdf, .txt, corrupted .docx)
- Upload oversized files
- Test with slow network (upload progress)
- Test concurrent uploads
- Test placeholder extraction accuracy
- Test AI question generation with/without Gemini API key
- Test mobile responsive behavior
- Test keyboard-only navigation
- Test screen reader announcements
---

## 17. Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Faculty uploads malicious DOCX | High | Low | File validation, magic bytes check, future ClamAV integration |
| Cross-org template leakage | High | Low | Strict organizationId filtering, middleware enforcement |
| Cloudinary cost overflow | Medium | Medium | Upload quotas per org, preview caching, monitoring |
| Large DOCX causes OOM | Medium | Medium | multer limits, streaming, chunked processing |
| Placeholder mismatch breaks generation | High | Medium | Pre-publish validation, preview before publish |
| No template backup | Medium | Low | Cloudinary backup, DB backups, soft delete retention |
| Accidental deletion of active template | Medium | Medium | Soft delete, confirmation dialogs, usage check |
| Template version conflicts | Low | Low | Versioning, immutable published versions |
| Audit log storage growth | Low | Medium | TTL index 90 days, archiving to cold storage |
| AI API quota exhaustion | Low | Medium | Graceful fallback, caching generated questions |

---

## 18. Technical Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Soft delete over hard delete | Preserves audit trail, allows recovery | Hard delete (rejected: no recovery) |
| Cloudinary raw for DOCX | Supports non-image formats, preserves filename | Firebase Storage (rejected: less flexible) |
| docxtemplater for rendering | Industry standard, supports loops/conditionals | Custom parser (rejected: too complex) |
| mammoth for HTML preview | Lightweight, good DOCX support | LibreOffice (rejected: heavy) |
| PizZip for placeholder extraction | Lightweight zip library for Node.js | AdmZip, yauzl (rejected: larger APIs) |
| MongoDB soft migration | No downtime, backward compatible | SQL-style migrations (rejected: not applicable) |
| Ownership middleware separate from role check | Single responsibility, composable | Combined middleware (rejected: less flexible) |
| Cursor-based pagination | Better performance on large datasets | Offset pagination (rejected: slow on deep pages) |
| Preview image generation on upload | Fast list rendering, no runtime generation | Runtime generation (rejected: slow, inconsistent) |
| Separate audit collection | Queryable, indexable, TTL-managed | Embedded in template (rejected: document bloat) |

---

## 19. Implementation Order

### Phase 1 â€” Foundation (Sprint 1-2)

Backend:
1. Add schema fields: status, version, description, previewImage, deletedAt, publishedAt, archivedAt, fileSize, mimeType, placeholderList, category, tags, usageCount, lastUsedAt
2. Add compound indexes
3. Add endpoints: GET /:id, PUT /:id, DELETE /:id
4. Add ownership middleware
5. Add file validation middleware
6. Backfill existing documents
7. Uncomment placeholder extraction
8. Uncomment AI question generation

Frontend:
1. Create TemplateManagement container
2. Create TemplateGrid and TemplateCard
3. Create TemplateFilters (search, type, status, category)
4. Create useTemplateManagement hook
5. Create useTemplateFilters hook
6. Wire up fetchTemplates with pagination
7. Implement grid/table view toggle

### Phase 2 â€” Upload Experience (Sprint 3)

Backend:
1. Add preview image generation service
2. Add Cloudinary eager transformations
3. Add usage tracking on generation

Frontend:
1. Create TemplateUploadModal
2. Create DropZone with drag-and-drop
3. Create FileValidation component
4. Create PlaceholderReport component
5. Create UploadProgress component
6. Implement placeholder extraction on client
7. Wire up upload API

### Phase 3 â€” Edit & Manage (Sprint 4)

Backend:
1. Add publish/unpublish endpoints
2. Add duplicate endpoint
3. Add usage endpoint
4. Add audit logging service
5. Add rate limiting middleware

Frontend:
1. Create TemplateEditorPage
2. Create TemplatePreviewDrawer
3. Implement metadata editing
4. Implement DOCX re-upload
5. Implement publish/unpublish
6. Implement duplicate
7. Implement download with signed URLs

### Phase 4 â€” Polish (Sprint 5)

Frontend:
1. Add search debounce
2. Add pagination component
3. Add bulk actions
4. Add accessibility improvements
5. Add loading skeletons
6. Add error boundaries

Backend:
1. Add audit log collection with TTL
2. Add rate limiting
3. Add virus scanning integration point
4. Add content-addressable storage (future)
5. Add template version history (future)

Testing:
1. Unit tests for all hooks
2. Unit tests for all controllers
3. Integration tests for upload/edit/delete flows
4. E2E tests for user journeys
5. Manual QA pass

---

## 20. Acceptance Criteria

### Phase 1 â€” Foundation

Backend:
- [ ] GET /api/resume/templates/:id returns template with all new fields
- [ ] PUT /api/resume/templates/:id updates metadata and/or DOCX
- [ ] DELETE /api/resume/templates/:id soft-deletes template
- [ ] Placeholder extraction works on upload
- [ ] AI question generation works or gracefully falls back
- [ ] File validation rejects non-DOCX files
- [ ] Ownership checks prevent faculty from editing others' templates
- [ ] Organization isolation enforced on all queries
- [ ] Schema migration backfills existing templates

Frontend:
- [ ] Faculty sees template list with grid and table views
- [ ] Faculty can search templates by name/description/tags
- [ ] Faculty can filter by type, status, category
- [ ] Faculty can sort by date, name, usage
- [ ] Faculty can paginate through results
- [ ] Template cards show preview, status, usage, last used
- [ ] Faculty can click template to open preview drawer
- [ ] No TypeScript errors in new code

### Phase 2 â€” Upload Experience

Backend:
- [ ] Preview image generated on upload
- [ ] Cloudinary upload stores both DOCX and preview
- [ ] File validation enforces MIME type and size limit
- [ ] Placeholder extraction accuracy verified on sample DOCX files

Frontend:
- [ ] Drag-and-drop upload works
- [ ] File browser fallback works
- [ ] File validation errors shown inline
- [ ] Placeholder extraction report displayed
- [ ] Upload progress indicator shown
- [ ] Success/error toasts shown
- [ ] Redirect to list after successful upload

### Phase 3 â€” Edit & Manage

Backend:
- [ ] POST /:id/publish transitions status and sets timestamps
- [ ] POST /:id/unpublish transitions status
- [ ] POST /:id/duplicate creates copy with new owner
- [ ] GET /:id/usage returns accurate stats
- [ ] Audit log entries created for all mutations

Frontend:
- [ ] Faculty can edit template metadata
- [ ] Faculty can re-upload DOCX
- [ ] Faculty can publish/unpublish templates
- [ ] Faculty can duplicate templates
- [ ] Faculty can delete templates with confirmation
- [ ] Faculty can download original DOCX
- [ ] Preview drawer shows placeholders and questions

### Phase 4 â€” Polish

- [ ] Search debounced by 300ms
- [ ] Pagination component functional
- [ ] Bulk select, bulk delete, bulk publish work
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels present on icon buttons
- [ ] Focus management in modals/drawers
- [ ] aria-live regions for status updates
- [ ] Unit test coverage > 70% for new code
- [ ] Integration tests pass
- [ ] E2E tests pass for critical journeys

---

## 21. Go / No-Go Recommendation

GO â€” Proceed with implementation.

Rationale:
- Backend foundation is solid and extensible
- Student Resume Builder provides proven reference implementation
- Dead code can be refactored rather than rebuilt
- Scope is well-defined with clear phase boundaries
- Risks are identified and mitigated

Conditions:
1. Enforce Phase 1 boundaries: no advanced features until core CRUD is complete
2. Do not modify student Resume Builder APIs
3. Maintain organization isolation on every new endpoint
4. Add ownership checks before any update/delete endpoint
5. Generate RB-012 implementation report after each phase

Blockers: None

Next step: Begin Phase 1 â€” Backend Foundation.
