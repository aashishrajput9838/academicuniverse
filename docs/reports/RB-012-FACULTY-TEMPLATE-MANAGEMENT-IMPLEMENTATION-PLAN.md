# RB-012 — Faculty Template Management: Implementation Plan

**Date:** 2026-07-21  
**Status:** Plan Complete — Awaiting Approval  
**Sources:** RB-010 Investigation, RB-011 Architecture  
**Next:** Begin Phase 1 on approval

---

## 1. Overall Roadmap

```
Phase 1 — Foundation          (Sprints 1-2)
Phase 2 — Upload Experience   (Sprint 3)
Phase 3 — Template Editing    (Sprint 4)
Phase 4 — Production Polish   (Sprint 5)
```

Milestones: M1 = Phase 1, M2 = Phase 2, M3 = Phase 3, M4 = Phase 4.

---

## 2. Phase 1 — Foundation

### Objective
Backend CRUD + schema extension; faculty can view templates in grid/table with search, filter, sort, pagination.

### Scope
In: schema fields, indexes, GET/PUT/DELETE endpoints, ownership/file-validation middleware, backfill, placeholder extraction + AI questions uncommented, frontend list UI. Out: upload modal, editor, publish/unpublish, audit logging, tests.

### Files to Create
- `backend/src/middleware/templateOwnership.ts`
- `backend/src/middleware/templateValidation.ts`
- `backend/src/types/template.ts`
- `backend/src/utils/validation/templateValidation.ts`
- `backend/scripts/backfillTemplateMetadata.ts`
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

### Files to Modify
- `backend/src/models/ResumeTemplate.ts`
- `backend/src/controllers/resumeController.ts`
- `backend/src/routes/resumeRoutes.ts`
- `backend/src/services/resumeService.ts`
- `app/dashboard/faculty/resume-templates/page.tsx`
- `components/Resume/api/templateApi.ts`

### Backend Tasks
1. Extend `ResumeTemplate` schema with status, version, description, previewImage, fileSize, mimeType, placeholderList, usageCount, lastUsedAt, deletedAt, publishedAt, archivedAt, tags, category, isPublished.
2. Add compound indexes: `(organizationId, status, createdAt)`, `(organizationId, type, isPublished)`, `(organizationId, uploadedBy)`, text index on name/description/tags.
3. Add controllers: `listTemplatesController`, `getTemplateController`, `updateTemplateController`, `deleteTemplateController`.
4. Add routes: `GET /templates`, `GET /templates/:id`, `PUT /templates/:id`, `DELETE /templates/:id`.
5. Implement `requireTemplateOwnership` middleware.
6. Implement `validateTemplateFile` middleware (MIME, magic bytes, size).
7. Uncomment placeholder extraction and AI question generation in `resumeService.ts`.
8. Run backfill script for existing documents.

### Frontend Tasks
1. Replace faculty page placeholder with `TemplateManagement` container.
2. Build grid and table views with toggle.
3. Build filters: search, type, status, category, sort.
4. Build pagination component.
5. Build preview drawer for template details.
6. Add API functions: fetchTemplate, updateTemplate, deleteTemplate, publishTemplate, unpublishTemplate, duplicateTemplate, fetchTemplateUsage.
7. Implement `useTemplateManagement` and `useTemplateFilters` hooks.

### Acceptance Criteria
- `GET /api/resume/templates/:id` returns all new fields.
- `PUT /api/resume/templates/:id` updates metadata.
- `DELETE /api/resume/templates/:id` soft-deletes.
- Ownership blocks unauthorized edits.
- Organization isolation enforced on all queries.
- Grid and table views render; search/filter/sort/pagination work.
- Preview drawer opens on card click.

### Verification Checklist
- [ ] `tsc --noEmit` passes (backend + frontend)
- [ ] `npm run build` passes
- [ ] New endpoints return correct status codes
- [ ] Backfill completes without errors
- [ ] Ownership middleware blocks unauthorized access
- [ ] Organization isolation enforced
- [ ] Placeholder extraction works on sample DOCX
- [ ] AI question generation falls back gracefully
- [ ] Grid/table toggle works
- [ ] Search, filter, sort, pagination work
- [ ] Preview drawer opens/closes
- [ ] No console errors

---

## 3. Phase 2 — Upload Experience

### Objective
Faculty can upload DOCX templates via drag-and-drop with automatic validation, placeholder extraction, and preview generation.

### Scope
In: upload modal, drop zone, file validation, placeholder report, upload progress, metadata form, preview image generation. Out: editor, publish/unpublish UI, audit logging, tests.

### Files to Create
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateUploadModal.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/DropZone.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/FileValidation.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/PlaceholderReport.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/UploadProgress.tsx`
- `app/dashboard/faculty/resume-templates/components/Upload/MetadataForm.tsx`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateUpload.ts`

### Files to Modify
- `backend/src/services/resumeService.ts`
- `backend/src/services/storageService.ts`
- `backend/src/controllers/resumeController.ts`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateManagement.tsx`
- `components/Resume/api/templateApi.ts`

### Backend Tasks
1. Add `extractPlaceholders(buffer)` to `resumeService.ts`.
2. Add `validatePlaceholders(placeholders)` to `resumeService.ts`.
3. Add `generatePreviewImage(buffer)` to `resumeService.ts`.
4. Add `uploadPreviewImage(buffer, orgId)` to `storageService.ts`.
5. Enhance `uploadTemplateController` to generate preview and run placeholder extraction + AI questions on upload.

### Frontend Tasks
1. Build `TemplateUploadModal` triggered from template list.
2. Build `DropZone` with drag-and-drop and file-browser fallback.
3. Build `FileValidation` inline report.
4. Build `PlaceholderReport` showing extracted tags, warnings, AI questions preview.
5. Build `UploadProgress` indicator.
6. Build `MetadataForm` (name, type, target, description, category, tags, publish toggle).
7. Implement `useTemplateUpload` hook.
8. Wire upload API to backend; redirect to list on success.

### Acceptance Criteria
- Drag-and-drop and file-browser upload work.
- Invalid files rejected with inline errors.
- Placeholder extraction report displayed.
- Upload progress indicator shown.
- Success/error toasts shown.
- New template appears in list with preview image.

### Verification Checklist
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Drag-and-drop upload works
- [ ] File-browser fallback works
- [ ] Invalid file rejection works
- [ ] Placeholder report displays
- [ ] Upload progress shows
- [ ] Success toast + redirect work
- [ ] Preview image generated
- [ ] No console/backend errors

---

## 4. Phase 3 — Template Editing & Management

### Objective
Faculty can edit metadata, re-upload DOCX with versioning, publish/unpublish, duplicate, delete, and download templates.

### Scope
In: editor page, preview drawer actions, metadata editing, DOCX re-upload, publish/unpublish, duplicate, delete confirmation, download, audit logging. Out: bulk actions, search/filter polish, tests.

### Files to Create
- `backend/src/models/TemplateAuditLog.ts`
- `backend/src/services/templateAuditService.ts`
- `backend/src/utils/audit/auditLogger.ts`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateEditor.tsx`
- `app/dashboard/faculty/resume-templates/components/Editor/QuestionEditor.tsx`
- `app/dashboard/faculty/resume-templates/components/Editor/PlaceholderList.tsx`
- `app/dashboard/faculty/resume-templates/components/Editor/EditorActions.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/ConfirmDialog.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/UsageStats.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/TemplatePreviewImage.tsx`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateEditor.ts`
- `app/dashboard/faculty/resume-templates/hooks/useTemplateBulkActions.ts`

### Files to Modify
- `backend/src/controllers/resumeController.ts`
- `backend/src/routes/resumeRoutes.ts`
- `backend/src/services/storageService.ts`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateCard.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateTable.tsx`
- `components/Resume/api/templateApi.ts`

### Backend Tasks
1. Add `publishTemplateController`, `unpublishTemplateController`, `duplicateTemplateController`, `getTemplateUsageController`.
2. Add routes: `POST /templates/:id/publish`, `POST /templates/:id/unpublish`, `POST /templates/:id/duplicate`, `GET /templates/:id/usage`.
3. Add `TemplateAuditLog` model with TTL index (90 days).
4. Implement `templateAuditService.logTemplateEvent`.
5. Add `getSignedUrl` to `storageService.ts`.
6. Ensure duplicate assigns new owner, increments version, resets status to draft.
7. Log audit events for all mutations.

### Frontend Tasks
1. Build `TemplateEditor` page (metadata form, placeholder list, question editor, DOCX re-upload).
2. Enhance `TemplatePreviewDrawer` with action buttons (Edit, Duplicate, Publish/Unpublish, Delete, Download).
3. Add action menus to `TemplateCard` and `TemplateTable`.
4. Implement `useTemplateEditor` hook.
5. Implement `useTemplateBulkActions` hook.
6. Add API functions: publish, unpublish, duplicate, usage, download.
7. Wire delete with `ConfirmDialog`.

### Acceptance Criteria
- Publish/unpublish transitions status and timestamps.
- Duplicate creates new draft owned by current user.
- Delete requires confirmation; soft-deletes.
- Download returns DOCX via signed URL.
- Usage stats display correctly.
- Audit log entries created for mutations.
- Editor page loads and saves metadata.

### Verification Checklist
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Publish/unpublish works
- [ ] Duplicate works
- [ ] Delete confirmation + soft delete works
- [ ] Download works
- [ ] Usage stats accurate
- [ ] Audit logs created
- [ ] Editor saves metadata
- [ ] No console/backend errors

---

## 5. Phase 4 — Production Polish

### Objective
Production readiness: search debounce, pagination, bulk actions, accessibility, audit logging, rate limiting, and tests.

### Scope
In: search debounce, pagination component, bulk actions, accessibility, loading skeletons, error boundaries, rate limiting, audit logging integration, virus scanning interface, unit/integration/E2E tests, manual QA. Out: new features.

### Files to Create
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateBulkActions.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateHeader.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/TemplateStatusBadge.tsx`
- `app/dashboard/faculty/resume-templates/components/shared/index.ts`
- Test files for hooks and components

### Files to Modify
- All Phase 1-3 components for accessibility improvements
- `app/dashboard/faculty/resume-templates/components/TemplateManagement/TemplateManagement.tsx`
- `components/Resume/api/templateApi.ts`
- `backend/src/middleware/rateLimiter.ts` (new or existing)
- `backend/src/utils/audit/auditLogger.ts`

### Backend Tasks
1. Add rate limiting middleware for uploads (e.g., 20/hour per faculty).
2. Integrate audit logging into all mutation controllers.
3. Add virus scanning interface for future ClamAV integration.
4. Ensure TTL index on `TemplateAuditLog.createdAt`.

### Frontend Tasks
1. Add 300ms search debounce.
2. Add `TemplateBulkActions` (select all, bulk delete, bulk publish).
3. Add `TemplateHeader` with view toggle and upload button.
4. Add loading skeletons and error boundaries.
5. Add ARIA labels, `aria-live`, focus trap in modals/drawers, keyboard navigation.
6. Write unit tests for hooks and components.
7. Write integration tests for upload/edit/delete flows.
8. Write E2E tests for critical journeys.

### Acceptance Criteria
- Search debounced by 300ms.
- Pagination functional.
- Bulk select, bulk delete, bulk publish work.
- All interactive elements keyboard accessible.
- ARIA labels present on icon buttons.
- Focus management in modals/drawers.
- `aria-live` regions for status updates.
- Unit test coverage > 70% for new code.
- Integration and E2E tests pass.
- Rate limiting blocks excessive uploads.
- Audit logs retained for 90 days.

### Verification Checklist
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Search debounce works
- [ ] Pagination works
- [ ] Bulk actions work
- [ ] Keyboard navigation passes
- [ ] ARIA labels present
- [ ] Focus trap works in modals/drawers
- [ ] Tests pass
- [ ] Rate limiting active
- [ ] Audit logs retained
- [ ] No console/backend errors

---

## 6. Dependencies

- Phase 1: no internal dependencies
- Phase 2: depends on Phase 1
- Phase 3: depends on Phase 2
- Phase 4: depends on Phase 3

External: RB-010 + RB-011 approved, existing auth/RBAC/organization isolation, faculty layout, `AuthContext`, Cloudinary configured.

---

## 7. Quality Gates (Every Phase)

1. `tsc --noEmit` = 0 errors
2. `npm run build` = 0 new errors
3. Regression checklist = all pass
4. Verification report = all pass

---

## 8. Go / No-Go

**Recommendation: GO**

**Conditions:**
1. Enforce phase boundaries; no later-phase features in earlier phases.
2. Do not modify student Resume Builder APIs.
3. Maintain organization isolation on every new endpoint.
4. Add ownership checks before any update/delete endpoint.
5. Run TypeScript check + production build before marking phase complete.

**Blockers:** None.

---

*Stop here. Awaiting approval to begin Phase 1 — Foundation.*
