# RB-012 — Faculty Resume Template Management: Implementation Plan

**Date:** 2026-07-21T05:32:00+05:30  
**Status:** Plan Complete — Ready for Execution  
**Scope:** Production-grade implementation roadmap for faculty template management  
**Sources:** RB-010 Investigation Report, RB-011 Architecture Document  

---

## 1. Executive Summary

This document converts the RB-011 architecture into an executable, phase-based implementation plan. Each phase is independently verifiable and follows the same workflow used successfully for the Student Resume Builder (RB-001 through RB-009).

**Guiding principles:**
- Small, shippable phases with clear acceptance criteria.
- Backend endpoints before frontend consumption.
- Reuse dead code before writing new components.
- Zero TypeScript errors at each phase boundary.
- Security and organization isolation enforced from day one.

**Total phases:** 4
**Total sprints:** 5
**Estimated scope:** 20+ new files, 15+ modified files, ~3,500 LOC

---

## 2. Overall Development Roadmap

```
Phase 1 — Foundation
  Sprint 1: Backend CRUD + Schema
  Sprint 2: Frontend List + Grid

Phase 2 — Upload Experience
  Sprint 3: Upload Flow + Placeholder Extraction

Phase 3 — Template Editing & Manage
  Sprint 4: Editor + Publish/Unpublish + Duplicate

Phase 4 — Polish
  Sprint 5: Search/Filter/Sort/Pagination + Accessibility + Audit Logging + Rate Limiting
```

**Milestones:**
- M1: Phase 1 complete — faculty can view and manage templates
- M2: Phase 2 complete — faculty can upload templates with placeholder extraction
- M3: Phase 3 complete — faculty can edit, publish, duplicate templates
- M4: Phase 4 complete — production-ready with accessibility, audit logging, and tests

---

## 3. Phase Breakdown

### Phase 1 — Foundation

**Goal:** Establish backend CRUD endpoints, extend database schema, and build faculty-facing template list with grid/table views.

**Duration:** 2 sprints

**Sprint 1 — Backend Foundation**
- Extend ResumeTemplate schema with management metadata
- Add missing endpoints: GET /:id, PUT /:id, DELETE /:id
- Add ownership middleware
- Add file validation middleware
- Backfill existing documents
- Uncomment placeholder extraction and AI question generation

**Sprint 2 — Frontend Foundation**
- Build TemplateManagement container
- Build TemplateGrid and TemplateCard
- Build TemplateFilters (search, type, status, category)
- Build useTemplateManagement and useTemplateFilters hooks
- Wire up fetchTemplates with pagination
- Implement grid/table view toggle

### Phase 2 — Upload Experience

**Goal:** Enable faculty to upload DOCX templates with automatic placeholder extraction, validation, and preview generation.

**Duration:** 1 sprint

**Sprint 3 — Upload Flow**
- Build TemplateUploadModal
- Build DropZone with drag-and-drop
- Build FileValidation component
- Build PlaceholderReport component
- Build UploadProgress component
- Implement client-side placeholder extraction
- Wire up upload API
- Generate preview images on upload

### Phase 3 — Template Editing & Manage

**Goal:** Enable faculty to edit template metadata, publish/unpublish, duplicate, and delete templates.

**Duration:** 1 sprint

**Sprint 4 — Edit & Manage**
- Build TemplateEditorPage
- Build TemplatePreviewDrawer
- Implement metadata editing
- Implement DOCX re-upload with versioning
- Implement publish/unpublish workflows
- Implement duplicate template
- Implement delete with confirmation
- Implement download with signed URLs
- Add audit logging service

### Phase 4 — Polish

**Goal:** Production readiness — search, filter, sort, pagination, bulk actions, accessibility, audit logging, rate limiting, and comprehensive testing.

**Duration:** 1 sprint

**Sprint 5 — Polish & Production**
- Add search debounce
- Add pagination component
- Add bulk actions (select all, bulk delete, bulk publish)
- Add accessibility improvements
- Add loading skeletons and error boundaries
- Add audit logging with TTL
- Add rate limiting
- Add virus scanning integration point
- Write unit tests, integration tests, E2E tests
- Manual QA pass

---

## 4. File-by-file Plan

### 4.1 Phase 1 Files

**Backend — Modify:**
- `backend/src/models/ResumeTemplate.ts` — add 14 new fields, compound indexes
- `backend/src/controllers/resumeController.ts` — add 5 new controllers
- `backend/src/routes/resumeRoutes.ts` — add 5 new routes
- `backend/src/services/resumeService.ts` — uncomment placeholder extraction and AI question generation

**Backend — Create:**
- `backend/src/middleware/templateOwnership.ts` — ownership validation middleware
- `backend/src/middleware/templateValidation.ts` — file validation middleware
- `backend/src/types/template.ts` — DTOs and validation schemas
- `backend/src/utils/validation/templateValidation.ts` — Zod schemas
- `backend/scripts/backfillTemplateMetadata.ts` — migration script

**Frontend — Create:**
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateManagement.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateGrid.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateCard.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateFilters.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateTable.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplatePagination.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplatePreviewDrawer.tsx`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateManagement.ts`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateFilters.ts`
- `app/dashboard/faculty/resume-templates/types/template.ts`
- `app/dashboard/faculty/resume-templates/types/api.ts`
- `app/dashboard/faculty/resume-templates/types/filters.ts`

**Frontend — Modify:**
- `app/dashboard/faculty/resume-templates/page.tsx` — replace placeholder with TemplateManagement
- `components/Resume/api/templateApi.ts` — add 5 new API functions

### 4.2 Phase 2 Files

**Backend — Modify:**
- `backend/src/services/resumeService.ts` — add extractPlaceholders, validatePlaceholders, generatePreviewImage
- `backend/src/services/storageService.ts` — add uploadPreviewImage, deleteResumeTemplate
- `backend/src/controllers/resumeController.ts` — enhance uploadTemplateController with preview generation

**Frontend — Create:**
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateUploadModal.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/DropZone.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/FileValidation.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/PlaceholderReport.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/UploadProgress.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/MetadataForm.tsx`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateUpload.ts`

**Frontend — Modify:**
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateManagement.tsx` — add upload modal trigger
- `components/Resume/api/templateApi.ts` — ensure upload handles preview and questions

### 4.3 Phase 3 Files

**Backend — Create:**
- `backend/src/controllers/resumeController.ts` — add publish, unpublish, duplicate, usage controllers
- `backend/src/routes/resumeRoutes.ts` — add publish, unpublish, duplicate, usage routes
- `backend/src/services/templateAuditService.ts` — audit logging service
- `backend/src/models/TemplateAuditLog.ts` — audit log schema

**Frontend — Create:**
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateEditor.tsx`
- `app/dashboard/faculty/resume-templates/components/Editor/QuestionEditor.tsx`
- `app/dashboard/faculty/resume-templates/components/Editor/PlaceholderList.tsx`
- `app/dashboard/faculty/resume-templates/components/Editor/EditorActions.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/ConfirmDialog.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/UsageStats.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/TemplatePreviewImage.tsx`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateEditor.ts`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateBulkActions.ts`

**Frontend — Modify:**
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateCard.tsx` — add action menu
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateTable.tsx` — add actions column
- `components/Resume/api/templateApi.ts` — add publish, unpublish, duplicate, usage, download functions

### 4.4 Phase 4 Files

**Backend — Create:**
- `backend/src/middleware/rateLimiter.ts` — rate limiting middleware
- `backend/src/utils/audit/auditLogger.ts` — audit logging utility
- `backend/src/services/virusScanner.ts` — virus scanning interface (future ClamAV)

**Frontend — Create:**
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateBulkActions.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateHeader.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/TemplateStatusBadge.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/index.ts`
- Test files for all hooks and components

**Frontend — Modify:**
- All existing components for accessibility improvements
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateManagement.tsx` — add bulk actions
- `components/Resume/api/templateApi.ts` — add retry logic, error normalization

---

## 5. Dependency Graph

```
Phase 1
├── Backend Schema Changes
│   ├── ResumeTemplate model extension
│   ├── Index creation
│   └── Backfill script
├── Backend Endpoints
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── Backend Middleware
│   ├── templateOwnership
│   └── templateValidation
└── Frontend Foundation
    ├── TemplateManagement container
    ├── TemplateGrid / TemplateCard
    ├── TemplateFilters
    ├── useTemplateManagement
    ├── useTemplateFilters
    └── templateApi extensions

Phase 2 (depends on Phase 1)
├── Backend Services
│   ├── extractPlaceholders
│   ├── validatePlaceholders
│   └── generatePreviewImage
├── Backend Controller Enhancements
│   └── uploadTemplateController (preview + questions)
└── Frontend Upload Flow
    ├── TemplateUploadModal
    ├── DropZone
    ├── FileValidation
    ├── PlaceholderReport
    ├── UploadProgress
    ├── MetadataForm
    └── useTemplateUpload

Phase 3 (depends on Phase 2)
├── Backend Controllers
│   ├── publishTemplateController
│   ├── unpublishTemplateController
│   ├── duplicateTemplateController
│   └── getTemplateUsageController
├── Backend Services
│   ├── templateAuditService
│   └── TemplateAuditLog model
└── Frontend Edit & Manage
    ├── TemplateEditorPage
    ├── TemplatePreviewDrawer
    ├── QuestionEditor
    ├── PlaceholderList
    ├── EditorActions
    ├── ConfirmDialog
    ├── UsageStats
    ├── TemplatePreviewImage
    ├── useTemplateEditor
    └── useTemplateBulkActions

Phase 4 (depends on Phase 3)
├── Backend Polish
│   ├── rateLimiter middleware
│   ├── audit logging integration
│   └── virus scanning interface
└── Frontend Polish
    ├── TemplateBulkActions
    ├── TemplateHeader
    ├── TemplateStatusBadge
    ├── Accessibility improvements
    ├── Loading skeletons
    ├── Error boundaries
    ├── Search debounce
    ├── Pagination component
    └── Tests
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Backend:**
- `resumeController.ts`: upload, list, get, update, delete, publish, unpublish, duplicate
- `resumeService.ts`: extractPlaceholders, validatePlaceholders, generatePreviewImage
- `storageService.ts`: uploadResumeTemplate, deleteResumeTemplate, uploadPreviewImage
- `templateAuditService.ts`: logTemplateEvent
- Middleware: requireTemplateOwnership, enforceOrgIsolation, templateValidation
- Validation schemas: UploadTemplateSchema, UpdateTemplateSchema

**Frontend:**
- `useTemplateManagement`: fetch, delete, duplicate, publish, unpublish, bulk actions
- `useTemplateUpload`: validateFile, extractPlaceholders, uploadTemplate
- `useTemplateEditor`: load, update, save, publish, delete
- `useTemplateFilters`: search, filter, sort, pagination logic
- `useTemplateBulkActions`: select, bulk delete, bulk publish
- Components: TemplateCard, TemplateGrid, DropZone, PlaceholderReport, TemplatePreviewDrawer

### 6.2 Integration Tests

**Backend:**
- Full upload flow: multipart request → Cloudinary → MongoDB
- Update flow: metadata update → version increment → audit log
- Delete flow: soft delete → Cloudinary cleanup → audit log
- Publish flow: status transition → student visibility
- Placeholder extraction: real DOCX with known tags
- AI question generation: mocked Gemini, mocked fallback
- Ownership checks: faculty cannot edit others' templates
- Organization isolation: cross-org access denied

**Frontend:**
- Upload modal: drag-drop, file select, validation, submission
- Template list: search, filter, sort, pagination, view toggle
- Preview drawer: open, close, actions
- Editor: load, edit, save, publish
- Bulk actions: select all, bulk delete, bulk publish
- Error states: network failure, validation errors, 403/404

### 6.3 E2E Tests

**User journeys:**
1. Faculty uploads template → sees it in list → publishes → student sees it
2. Faculty edits template → re-uploads DOCX → version increments
3. Faculty duplicates template → new draft created
4. Faculty deletes template → confirmation → soft deleted
5. Faculty searches/filters/sorts templates
6. Faculty downloads template
7. Student generates resume from published template

### 6.4 Manual QA

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

## 7. Verification Strategy

### 7.1 Phase 1 Verification

**Backend:**
- [ ] `npx tsc --noEmit` passes with 0 new errors
- [ ] All new endpoints return correct status codes
- [ ] Schema backfill completes without errors
- [ ] Ownership middleware blocks unauthorized access
- [ ] Organization isolation enforced on all queries
- [ ] Placeholder extraction works on sample DOCX
- [ ] AI question generation falls back gracefully without Gemini API key

**Frontend:**
- [ ] `npx tsc --noEmit` passes with 0 new errors
- [ ] Template list renders with grid and table views
- [ ] Search, filter, sort, pagination work correctly
- [ ] Template cards show preview, status, usage, last used
- [ ] Preview drawer opens and closes correctly
- [ ] No TypeScript errors in new code
- [ ] No console errors in browser

### 7.2 Phase 2 Verification

**Backend:**
- [ ] Preview image generated on upload
- [ ] Cloudinary stores both DOCX and preview
- [ ] File validation rejects invalid files
- [ ] Placeholder extraction report accurate

**Frontend:**
- [ ] Drag-and-drop upload works
- [ ] File browser fallback works
- [ ] Validation errors shown inline
- [ ] Placeholder extraction report displayed
- [ ] Upload progress indicator shown
- [ ] Success/error toasts shown
- [ ] Redirect to list after successful upload

### 7.3 Phase 3 Verification

**Backend:**
- [ ] Publish/unpublish transitions status correctly
- [ ] Duplicate creates copy with new owner
- [ ] Usage stats accurate
- [ ] Audit log entries created for all mutations

**Frontend:**
- [ ] Metadata editing works
- [ ] DOCX re-upload works
- [ ] Publish/unpublish works
- [ ] Duplicate works
- [ ] Delete with confirmation works
- [ ] Download works
- [ ] Preview drawer shows placeholders and questions

### 7.4 Phase 4 Verification

- [ ] Search debounced by 300ms
- [ ] Pagination component functional
- [ ] Bulk actions work correctly
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels present on icon buttons
- [ ] Focus management in modals/drawers
- [ ] aria-live regions for status updates
- [ ] Unit test coverage > 70% for new code
- [ ] Integration tests pass
- [ ] E2E tests pass for critical journeys
- [ ] Rate limiting blocks excessive uploads
- [ ] Audit logs retained for 90 days

---

## 8. Risk Matrix

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
| Phase 2 blocks on Phase 1 | Medium | Low | Clear API contracts, mock backend for frontend development |
| Phase 3 blocks on Phase 2 | Medium | Low | Stub upload components, feature flags |
| Frontend scope creep | Medium | Medium | Strict phase boundaries, reject out-of-scope features |
| Dead code refactor introduces bugs | Low | Medium | Comprehensive tests, incremental refactoring |
| TypeScript errors in new code | Low | Low | tsc --noEmit in CI, pre-commit hooks |

---

## 9. Milestones

| Milestone | Deliverable | Criteria |
|-----------|-------------|----------|
| M1 — Phase 1 Complete | Faculty can view templates | List, grid, table, filters, search, sort, pagination all working |
| M2 — Phase 2 Complete | Faculty can upload templates | Upload flow, placeholder extraction, preview generation all working |
| M3 — Phase 3 Complete | Faculty can manage templates | Edit, publish, unpublish, duplicate, delete, download all working |
| M4 — Phase 4 Complete | Production ready | Accessibility, audit logging, rate limiting, tests all passing |

---

## 10. Go / No-Go Recommendation

**GO** — Proceed with implementation.

**Rationale:**
- Architecture is complete and approved in RB-011
- Backend foundation is solid and extensible
- Student Resume Builder provides proven reference implementation
- Dead code can be refactored rather than rebuilt
- Scope is well-defined with clear phase boundaries
- Risks are identified and mitigated
- Each phase is independently verifiable

**Conditions:**
1. Enforce phase boundaries: no feature from later phases in earlier phases
2. Do not modify student Resume Builder APIs
3. Maintain organization isolation on every new endpoint
4. Add ownership checks before any update/delete endpoint
5. Generate RB-012 phase completion report after each phase
6. Run `npx tsc --noEmit` and fix all errors before marking phase complete
7. Run `npm run build` and ensure no new errors before marking phase complete

**Blockers:** None

**Next step:** Begin Phase 1 — Foundation.

---

## 11. Phase 1 — Foundation

### 11.1 Goal

Establish backend CRUD endpoints, extend database schema, and build faculty-facing template list with grid/table views.

### 11.2 Scope

**In scope:**
- Backend schema extension with management metadata
- Backend CRUD endpoints: GET /:id, PUT /:id, DELETE /:id
- Ownership middleware
- File validation middleware
- Database backfill
- Uncomment placeholder extraction and AI question generation
- Frontend template list with grid/table views
- Search, filter, sort, pagination
- Template preview drawer

**Out of scope:**
- Upload flow (Phase 2)
- Template editor (Phase 3)
- Publish/unpublish (Phase 3)
- Duplicate/delete (Phase 3)
- Audit logging (Phase 4)
- Rate limiting (Phase 4)
- Accessibility improvements (Phase 4)
- Tests (Phase 4)

### 11.3 Backend Work

#### 11.3.1 Schema Changes

**File:** `backend/src/models/ResumeTemplate.ts`

Add fields:
- description: String, max 500, default ''
- category: String, max 50, default ''
- tags: [String], default []
- version: Number, default 1, min 1
- status: String, enum ['draft', 'published', 'archived'], default 'draft', indexed
- isPublished: Boolean, default false, indexed
- previewImage: String, default ''
- fileSize: Number, default 0
- mimeType: String, default DOCX MIME
- placeholderList: [String], default []
- usageCount: Number, default 0
- lastUsedAt: Date, default null
- deletedAt: Date, default null, indexed
- publishedAt: Date, default null
- archivedAt: Date, default null

Add indexes:
- { organizationId: 1, status: 1, createdAt: -1 }
- { organizationId: 1, type: 1, isPublished: 1 }
- { organizationId: 1, uploadedBy: 1 }
- { templateName: 'text', description: 'text', tags: 'text' }

#### 11.3.2 Middleware

**File:** `backend/src/middleware/templateOwnership.ts` (new)

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

**File:** `backend/src/middleware/templateValidation.ts` (new)

```typescript
export const validateTemplateFile = (req: any, res: Response, next: NextFunction) => {
  const file = req.file;
  if (!file) {
    return sendError(res, 400, 'No template file provided');
  }

  // MIME type check
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return sendError(res, 422, 'Invalid file type. Only DOCX files are allowed.');
  }

  // Magic bytes check
  const magicBytes = file.buffer.slice(0, 2);
  if (magicBytes.toString('hex') !== '504b') {
    return sendError(res, 422, 'Invalid DOCX file format');
  }

  // Size check
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return sendError(res, 413, 'File size exceeds 10MB limit');
  }

  next();
};
```

#### 11.3.3 Controllers

**File:** `backend/src/controllers/resumeController.ts` (extend)

Add controllers:
- `listTemplatesController` — paginated, filtered, sorted list
- `getTemplateController` — single template by ID
- `updateTemplateController` — metadata and/or DOCX update
- `deleteTemplateController` — soft delete

#### 11.3.4 Routes

**File:** `backend/src/routes/resumeRoutes.ts` (extend)

Add routes:
- `GET /templates` → listTemplatesController
- `GET /templates/:id` → getTemplateController
- `PUT /templates/:id` → updateTemplateController
- `DELETE /templates/:id` → deleteTemplateController

#### 11.3.5 Services

**File:** `backend/src/services/resumeService.ts` (extend)

Uncomment:
- Placeholder extraction logic (lines 76-104)
- AI question generation call (line 96)

Add:
- `validatePlaceholders(placeholders: string[]): ValidationResult`

#### 11.3.6 Backfill Script

**File:** `backend/scripts/backfillTemplateMetadata.ts` (new)

```typescript
import ResumeTemplate from '../src/models/ResumeTemplate';

async function backfill() {
  const result = await ResumeTemplate.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: 'published',
        isPublished: true,
        version: 1,
        usageCount: 0,
        deletedAt: null,
      },
    }
  );
  console.log(`Backfilled ${result.modifiedCount} templates`);
  process.exit(0);
}

backfill();
```

### 11.4 Frontend Work

#### 11.4.1 Container

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateManagement.tsx` (new)

Responsibilities:
- Orchestrate template list, filters, grid/table view
- Wire useTemplateManagement and useTemplateFilters
- Render TemplateHeader, TemplateFilters, TemplateGrid/TemplateTable, TemplatePagination
- Handle loading, error, empty states

#### 11.4.2 Grid Components

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateGrid.tsx` (new)
- Renders responsive grid of TemplateCard components
- Handles empty state

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateCard.tsx` (new)
- Displays preview image, template name, type, target, status, usage, last used
- Action menu: Edit, Duplicate, Publish/Unpublish, Delete, Download
- Keyboard accessible

#### 11.4.3 Table Components

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateTable.tsx` (new)
- Renders table rows with sortable headers
- Columns: Preview, Name, Type, Target, Status, Usage, Last Used, Actions

#### 11.4.4 Filters

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateFilters.tsx` (new)
- Search input with 300ms debounce
- Filter dropdowns: type, status, category
- Sort dropdown: date, name, usage
- Clear filters button

#### 11.4.5 Pagination

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplatePagination.tsx` (new)
- Page info display
- Previous/Next buttons
- Page size selector

#### 11.4.6 Preview Drawer

**File:** `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplatePreviewDrawer.tsx` (new)
- Opens from TemplateCard click
- Shows preview image, metadata, placeholder list, usage stats
- Action buttons: Edit, Duplicate, Delete, Download, Publish/Unpublish
- Keyboard accessible, focus trap

#### 11.4.7 Hooks

**File:** `app/dashboard/faculty/resume-templates/hooks/useTemplateManagement.ts` (new)
- State: templates, isLoading, error, view, selectedIds, pagination
- Actions: fetchTemplates, deleteTemplate, duplicateTemplate, publishTemplate, unpublishTemplate, downloadTemplate
- Delegates filtering to useTemplateFilters

**File:** `app/dashboard/faculty/resume-templates/hooks/useTemplateFilters.ts` (new)
- State: search, filters, sort, pagination
- Derived: filteredTemplates, paginatedTemplates
- Actions: setSearch, setFilter, setSort, clearFilters, setPage, setPageSize

#### 11.4.8 Types

**File:** `app/dashboard/faculty/resume-templates/types/template.ts` (new)
- ResumeTemplateDTO extension with new fields
- TemplateQuestion type
- TemplateUsageDTO

**File:** `app/dashboard/faculty/resume-templates/types/api.ts` (new)
- ListResponse, UsageResponse, ErrorResponse

**File:** `app/dashboard/faculty/resume-templates/types/filters.ts` (new)
- TemplateFilters, TemplateSort, TemplatePagination

#### 11.4.9 API Extensions

**File:** `components/Resume/api/templateApi.ts` (modify)

Add functions:
- `fetchTemplate(backendToken, templateId)`
- `updateTemplate(backendToken, templateId, data)`
- `deleteTemplate(backendToken, templateId)` — already exists, ensure correct usage
- `publishTemplate(backendToken, templateId)`
- `unpublishTemplate(backendToken, templateId)`
- `duplicateTemplate(backendToken, templateId)`
- `fetchTemplateUsage(backendToken, templateId)`

### 11.5 Database Work

- Run backfill script: `npx ts-node scripts/backfillTemplateMetadata.ts`
- Verify indexes created
- Verify no documents have undefined status

### 11.6 API Work

**New Endpoints:**
- `GET /api/resume/templates` — list with pagination, search, filter, sort
- `GET /api/resume/templates/:id` — get single template
- `PUT /api/resume/templates/:id` — update metadata
- `DELETE /api/resume/templates/:id` — soft delete

**Modified Endpoints:**
- `POST /api/resume/templates` — enhanced with preview generation and placeholder extraction

### 11.7 Acceptance Criteria

**Backend:**
- [ ] `GET /api/resume/templates/:id` returns template with all new fields
- [ ] `PUT /api/resume/templates/:id` updates metadata and/or DOCX
- [ ] `DELETE /api/resume/templates/:id` soft-deletes template
- [ ] Placeholder extraction works on upload
- [ ] AI question generation works or gracefully falls back
- [ ] File validation rejects non-DOCX files
- [ ] Ownership checks prevent faculty from editing others' templates
- [ ] Organization isolation enforced on all queries
- [ ] Schema migration backfills existing templates

**Frontend:**
- [ ] Faculty sees template list with grid and table views
- [ ] Faculty can search templates by name/description/tags
- [ ] Faculty can filter by type, status, category
- [ ] Faculty can sort by date, name, usage
- [ ] Faculty can paginate through results
- [ ] Template cards show preview, status, usage, last used
- [ ] Faculty can click template to open preview drawer
- [ ] No TypeScript errors in new code

### 11.8 Manual Test Plan

1. Login as faculty user
2. Navigate to Resume Templates page
3. Verify template list loads with grid view
4. Toggle to table view
5. Search for template by name
6. Filter by type, status, category
7. Sort by date, name, usage
8. Navigate through pages
9. Click template card to open preview drawer
10. Verify preview drawer shows metadata, placeholders, usage
11. Close preview drawer
12. Verify no console errors

### 11.9 Verification Checklist

- [ ] `npx tsc --noEmit` passes with 0 new errors
- [ ] `npm run build` passes with no new errors
- [ ] All new endpoints return correct status codes
- [ ] Schema backfill completes
- [ ] Ownership middleware blocks unauthorized access
- [ ] Organization isolation enforced
- [ ] Placeholder extraction works
- [ ] AI question generation falls back gracefully
- [ ] Grid view renders correctly
- [ ] Table view renders correctly
- [ ] Search, filter, sort, pagination work
- [ ] Preview drawer opens/closes
- [ ] Keyboard navigation works
- [ ] No console errors

### 11.10 Expected Deliverables

- 12 new frontend files
- 5 new backend files
- 4 modified backend files
- 3 modified frontend files
- ~1,800 LOC new code
- 0 TypeScript errors
- Working template list with grid/table views

### 11.11 Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Schema migration fails on existing data | Medium | Low | Test backfill on staging first |
| Ownership middleware blocks valid access | High | Low | Unit tests for admin/owner/superadmin paths |
| Placeholder extraction crashes on malformed DOCX | Medium | Medium | Try/catch with fallback, validation |
| Frontend pagination state desync | Low | Medium | Controlled components, single source of truth |
| TypeScript errors in new DTOs | Low | Low | tsc --noEmit in CI |

### 11.12 Rollback Considerations

- Schema changes are additive only (no removals), safe to rollback
- New endpoints are additive, no breaking changes to existing APIs
- Frontend changes isolated to new page, no student Resume Builder impact
- Backfill script is idempotent
- Feature flag: wrap new faculty UI behind flag for instant disable

### 11.13 Dependencies

- Phase 1 has no internal dependencies
- Depends on RB-010 and RB-011 approval
- Requires existing backend auth, RBAC, organization isolation
- Requires existing frontend AuthContext and faculty layout
