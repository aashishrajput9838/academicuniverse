# RB-001: Resume Builder Investigation

**Date:** 2026-07-21T02:17:00+05:30  
**Status:** Investigation Complete — No Code Changes  
**Owner:** Lead Software Architect / Senior Full Stack Engineer  
**Related:** BUG-007, BUG-008  

---

## 1. Executive Summary

The Resume Builder module exists as a **functional backend with a broken frontend**.

**Backend:** Fully implemented and operational. Routes, controllers, services, models, DOCX generation, AI enhancement, template storage, and module registry integration are all present and working.

**Frontend:** Structurally absent. The page routes exist but import non-existent components. No API integration, no state management, no UI forms, and no preview/download functionality.

**Classification:** Dead UI / Placeholder (frontend), Functional MVP (backend).

**Recommendation:** Implement the three missing frontend components to unlock the existing backend. Do not change backend logic. Treat this as a frontend implementation task with a fully prepared backend.

---

## 2. Backend Audit

### 2.1 Routes

| File | Status |
|------|--------|
| `backend/src/routes/resumeRoutes.ts` | ✅ Implemented |
| `backend/src/routes/index.ts` | ✅ Mounted at `/resume` |

**Endpoints:**

| Method | Route | Purpose | Request | Response | Used by Frontend? |
|--------|-------|---------|---------|----------|-------------------|
| POST | `/api/resume/templates` | Faculty uploads .docx template | `multipart/form-data`: `templateFile`, `templateName`, `type`, `target` | `{ template, fileUrl }` | NO |
| GET | `/api/resume/templates` | Student fetches available templates | Query: `target?` (department/section) | `[ResumeTemplate]` | NO |
| POST | `/api/resume/generate` | Generate resume from template + data | Body: `{ templateId, data, tone? }` | `{ htmlPreview, docxBase64, studentResumeId }` | NO |
| GET | `/api/resume/draft` | Retrieve saved draft | Query: `templateId` | `filledData \| null` | NO |

### 2.2 Controllers

| File | Status | Notes |
|------|--------|-------|
| `backend/src/controllers/resumeController.ts` | ✅ Implemented | 250 lines, 4 controller methods |

**Controllers:**

| Controller | Purpose | Key Logic |
|------------|---------|-----------|
| `uploadTemplateController` | Upload .docx template | Role check (FACULTY/ADMIN/SUPER_ADMIN), multer memoryStorage (5MB limit), Cloudinary upload, save metadata |
| `getAvailableTemplatesController` | List templates for student | Organization-scoped, role-aware filtering, supports `global` and `target`-specific templates |
| `processResumeController` | Generate resume DOCX | Fetches template, extracts `enhanceableTags`, calls `resumeService.processResumeTemplate`, saves draft to `StudentResume` |
| `getSavedResumeController` | Retrieve draft | Returns `filledData` for user + template combination |

**Disabled Features (commented out):**
- Interactive template mappings (`mappings` body param) — disabled for MVP
- Tag extraction and AI question generation from `{{tags}}` — disabled for MVP

### 2.3 Services

| File | Status | Notes |
|------|--------|-------|
| `backend/src/services/resumeService.ts` | ✅ Implemented | 67 lines, single method |

**Service: `ResumeService`**

| Method | Purpose | Dependencies |
|--------|---------|--------------|
| `processResumeTemplate(templateUrl, data, tone?, enhanceableTags?)` | Generate DOCX + HTML preview | `axios`, `PizZip`, `Docxtemplater`, `mammoth`, `aiService.enhanceResumeFields` |

**Flow:**
1. Fetch DOCX template from URL (Cloudinary)
2. Load with PizZip
3. If `tone` and `enhanceableTags` provided, call AI to enhance specific fields
4. Inject data with Docxtemplater
5. Render DOCX buffer
6. Convert to HTML preview with Mammoth
7. Return `{ docxBuffer, htmlPreview }`

**AI Integration:**
- `aiService.enhanceResumeFields(data, tone, enhanceableTags)` — rewrites specified fields using Gemini 2.5 Flash
- Supports tones: PROFESSIONAL, CREATIVE, CONCISE
- Fallback to original data if AI fails

### 2.4 Storage

| File | Method | Purpose | Storage |
|------|--------|---------|---------|
| `backend/src/services/storageService.ts` | `uploadResumeTemplate` | Upload .docx to Cloudinary | Cloudinary (raw resource type) |

**Path:** `academicuniverse/templates/{organizationId}/template_{timestamp}_{filename}`

**Fallback:** Returns dummy PDF URL on storage failure (mock mode).

### 2.5 Module Registry

| File | Status | Notes |
|------|--------|-------|
| `backend/src/shared/application/module-registry/resumeBuilder.config.ts` | ✅ Registered | Module ID: `resume_builder` |

**Config:**
```typescript
{
  moduleId: 'resume_builder',
  moduleName: 'Resume Builder',
  description: 'Builds student resumes using skills, experience, and projects.',
  acceptedDocumentCategories: ['RESUME', 'CERTIFICATE', 'INTERNSHIP', 'OFFER_LETTER'],
  requiredEntities: ['skills', 'experience', 'projects'],
  requiredCandidateFields: ['skills', 'experience', 'projects'],
  canonicalCollection: 'StudentResume',
  priority: 3,
  eventName: 'ResumeUpdated',
}
```

### 2.6 Routing Engine Integration

| File | Status | Notes |
|------|--------|-------|
| `backend/src/shared/application/routingEngine.ts` | ✅ Implemented | `ResumeAdapter` class registered |

**ResumeAdapter:**
- `MODULE_ID = 'resume_builder'`
- `CANONICAL_COLLECTION = 'StudentResume'`
- `validateData`: Always returns `true` (no validation)
- `mapCandidateFields`: Pass-through (no transformation)
- `writeCanonical`: Upserts `StudentResume` with `userId`, `templateId`, `filledData`
- `deleteCanonical`: Deletes `StudentResume` records by IDs

**Hardcoded template ID in adapter:** `templateOid = toObjectId('64c58cfcb6fcd8ef57c0e5a8')` — this is a hardcoded fallback that does not match user-selected templates.

### 2.7 AI Service Integration

| Feature | Status | Method |
|---------|--------|--------|
| Field enhancement | ✅ Implemented | `aiService.enhanceResumeFields(data, tone, enhanceableTags)` |
| Template question generation | ⚠️ Disabled | `generateTemplateQuestions(tags)` — code exists but commented out in controller |

**AI Enhancement Details:**
- Model: `gemini-2.5-flash`
- System prompt: Senior professional resume writer/coach
- Supports tones: PROFESSIONAL, CREATIVE, CONCISE
- Only modifies specified `enhanceableTags`
- Falls back to original data on AI failure

### 2.8 Export Capabilities

| Export Type | Status | Implementation |
|-------------|--------|----------------|
| DOCX Export | ✅ Supported | `docxtemplater` + `mammoth` in `resumeService.ts` |
| PDF Export | ❌ Not supported for resumes | `exportUtils.ts` has `generatePdfBuffer` but only for research papers, not resumes |
| HTML Preview | ✅ Supported | `mammoth.convertToHtml()` in `resumeService.ts` |

### 2.9 Validation

| Validation Layer | Status | Notes |
|------------------|--------|-------|
| Authentication | ✅ Implemented | `authenticateUser` middleware on all routes |
| Authorization (faculty) | ✅ Implemented | Role check for template upload |
| Request validation | ⚠️ Minimal | Only checks `templateId` and `data` presence for generation |
| Template existence | ✅ Implemented | Returns 404 if template not found |
| File type/size | ⚠️ Partial | 5MB limit enforced, no .docx extension validation |

---

## 3. Database Audit

### 3.1 Collections

| Collection | Model | Status | Purpose |
|------------|-------|--------|---------|
| `studentresumes` | `StudentResume` | ✅ Active | Stores user resume drafts and generated URLs |
| `resumetemplates` | `ResumeTemplate` | ✅ Active | Stores faculty-uploaded .docx templates |

### 3.2 StudentResume Schema

| Field | Type | Required | Indexed | Notes |
|-------|------|----------|---------|-------|
| `userId` | ObjectId (ref: User) | Yes | Yes | Student who owns the resume |
| `templateId` | ObjectId (ref: ResumeTemplate) | Yes | No | Template used |
| `filledData` | Mixed | No | No | Form data submitted by student |
| `generatedDocxUrl` | String | No | No | URL to generated DOCX (not currently populated in controller) |
| `createdAt` | Date | Auto | No | Timestamp |
| `updatedAt` | Date | Auto | No | Timestamp |

**Missing Fields:**
- `htmlPreview` — not stored, returned ephemerally in API response only
- `status` — no draft/published/archived states
- `version` — no versioning
- `sharedWith` — no sharing permissions
- `exportedAt` — no download tracking

### 3.3 ResumeTemplate Schema

| Field | Type | Required | Indexed | Notes |
|-------|------|----------|---------|-------|
| `templateName` | String | Yes | No | Display name |
| `type` | String (enum) | Yes | No | `section`, `department`, `global` |
| `target` | String | No | No | Department/section name (e.g., `CSE-A`) |
| `fileUrl` | String | Yes | No | Cloudinary URL |
| `organizationId` | ObjectId (ref: Organization) | Yes | Yes | Multi-tenant scoping |
| `uploadedBy` | ObjectId (ref: User) | Yes | No | Faculty who uploaded |
| `questions` | Array of objects | No | No | Auto-generated questionnaire from template tags |
| `createdAt` | Date | Auto | No | Timestamp |
| `updatedAt` | Date | Auto | No | Timestamp |

**questions array structure:**
```typescript
{
  tag: string;           // e.g., "name", "skills", "experience1_desc"
  question: string;      // e.g., "Please enter your full name"
  type: 'text' | 'textarea';
  aiEnhanceable: boolean;
}
```

**Missing Fields:**
- `version` — no template versioning
- `isActive` — no soft delete/disable
- `downloadCount` — no usage tracking
- `tags` — no manual categorization beyond type/target
- `previewImage` — no visual preview thumbnail

### 3.4 Dead Models

| Model | Status | Notes |
|-------|--------|-------|
| `ResumeTemplate` | ✅ Active | Used by backend |
| `StudentResume` | ✅ Active | Used by backend and exportService |

No dead models found.

---

## 4. Feature Matrix

| Feature | Status | Evidence |
|---------|--------|----------|
| **Personal Information** | ⚠️ Partial | Supported via template fields (name, email, phone, etc. as `{{tags}}`), but no dedicated form/section |
| **Education** | ⚠️ Partial | Supported via template fields only |
| **Experience** | ⚠️ Partial | Supported via template fields only |
| **Projects** | ⚠️ Partial | Supported via template fields only |
| **Skills** | ⚠️ Partial | Supported via template fields only; no auto-fill from Skills Engine |
| **Certifications** | ⚠️ Partial | Supported via template fields only |
| **Achievements** | ⚠️ Partial | Supported via template fields only |
| **Research** | ⚠️ Partial | Supported via template fields only |
| **Languages** | ⚠️ Partial | Supported via template fields only |
| **Interests** | ⚠️ Partial | Supported via template fields only |
| **Custom Sections** | ⚠️ Partial | Supported via template fields only |
| **Resume Templates** | ✅ Supported | Faculty can upload .docx templates with `{{placeholders}}` |
| **Resume Versions** | ❌ Missing | No versioning, no multiple drafts per user |
| **PDF Export** | ❌ Missing | Only DOCX + HTML preview; no PDF generation for resumes |
| **DOCX Export** | ✅ Supported | Returns Base64 DOCX buffer |
| **Resume Preview** | ✅ Supported | HTML preview via Mammoth |
| **Auto-fill from Skills Engine** | ❌ Missing | No integration with Skills Tracker |
| **Auto-fill from Academic Records** | ❌ Missing | No integration with Academic Records |
| **Auto-fill from Career Profile** | ❌ Missing | No integration with Career Profile |
| **AI Enhancement** | ✅ Supported | Tone-based field rewriting via Gemini |
| **Template Question Generation** | ⚠️ Disabled | Code exists but commented out in controller |
| **Interactive Template Mapping** | ⚠️ Disabled | Code exists but commented out in controller |
| **Draft Save/Load** | ✅ Supported | `StudentResume.findOneAndUpdate` with upsert |
| **Multi-tenant Scoping** | ✅ Supported | Organization-scoped templates |

---

## 5. Frontend Audit

### 5.1 Existing Pages

| Path | Status | Notes |
|------|--------|-------|
| `/dashboard/student/resume-builder` | ⚠️ Broken | Imports `@/components/Resume/ResumeBuilder` — file does not exist |
| `/dashboard/faculty/resume-templates` | ⚠️ Broken | Imports `TemplateUploadForm` and `TemplateList` — files do not exist |
| `/dashboard/student/career` | ⚠️ Static mock | Contains hardcoded "Resume Builder" section with fake data |

### 5.2 Existing Components

| Component | Status | Location |
|-----------|--------|----------|
| `ResumeReadinessBadge` | ⚠️ Dead UI | `skills/components/ResumeReadinessBadge.tsx` — no longer used after BUG-007 fix |
| `ResumeBuilder` | ❌ Missing | Expected at `@/components/Resume/ResumeBuilder` |
| `TemplateUploadForm` | ❌ Missing | Expected at `@/components/Resume/TemplateUploadForm` |
| `TemplateList` | ❌ Missing | Expected at `@/components/Resume/TemplateList` |

### 5.3 Broken Components

| Component | Issue |
|-----------|-------|
| `ResumeBuilderPage` | Crashes on import — `ResumeBuilder` component does not exist |
| `ResumeTemplatesPage` | Crashes on import — `TemplateUploadForm` and `TemplateList` do not exist |

### 5.4 Dead UI

| UI Element | Issue |
|------------|-------|
| `ResumeReadinessBadge` | Component exists but is no longer used in SkillDetailPanel after BUG-007 cleanup |
| Career page Resume section | Hardcoded mock data, not connected to any backend or Resume Builder |

### 5.5 Missing Pages

| Expected Page | Status |
|---------------|--------|
| `/dashboard/student/resume-builder` | ⚠️ Route exists, component missing |
| `/dashboard/faculty/resume-templates` | ⚠️ Route exists, components missing |

### 5.6 Missing API Integration

| Expected API Call | Status |
|-------------------|--------|
| `GET /api/resume/templates` | ❌ Not called from frontend |
| `POST /api/resume/generate` | ❌ Not called from frontend |
| `GET /api/resume/draft` | ❌ Not called from frontend |
| `POST /api/resume/templates` | ❌ Not called from frontend |

### 5.7 Missing State Management

| State | Status |
|-------|--------|
| Selected template | ❌ Not managed |
| Form data | ❌ Not managed |
| Generated preview | ❌ Not managed |
| Draft status | ❌ Not managed |
| AI tone selection | ❌ Not managed |

---

## 6. API Inventory

### 6.1 Documented Endpoints

| # | Method | Route | Controller | Service | Model | Frontend Consumer |
|---|--------|-------|------------|---------|-------|-------------------|
| 1 | POST | `/api/resume/templates` | `uploadTemplateController` | `storageService.uploadResumeTemplate` | `ResumeTemplate` | ❌ None |
| 2 | GET | `/api/resume/templates` | `getAvailableTemplatesController` | — | `ResumeTemplate` | ❌ None |
| 3 | POST | `/api/resume/generate` | `processResumeController` | `resumeService.processResumeTemplate` | `StudentResume` | ❌ None |
| 4 | GET | `/api/resume/draft` | `getSavedResumeController` | — | `StudentResume` | ❌ None |

### 6.2 Missing Endpoints

| Expected Endpoint | Purpose | Priority |
|-------------------|---------|----------|
| `GET /api/resume/status` | Check if user has resume, completion % | High |
| `GET /api/resume/history` | List all saved resumes/drafts | Medium |
| `DELETE /api/resume/:id` | Delete a saved resume | Medium |
| `PUT /api/resume/:id` | Update resume metadata (name, status) | Low |
| `GET /api/resume/templates/:id/preview` | Preview template before selection | Medium |
| `POST /api/resume/upload` | Student uploads own base resume (optional) | Low |

---

## 7. Dependency Analysis

### 7.1 Internal Dependencies

| Module | Type | Status | Integration Point |
|--------|------|--------|-------------------|
| **Skills Tracker** | Required | ✅ Backend ready, ❌ Frontend missing | `resumeBuilder.config.ts` lists `skills` as required entity; no auto-fill implemented |
| **Academic Records** | Required | ✅ Backend ready, ❌ Frontend missing | `resumeBuilder.config.ts` lists `experience` and `projects` as required; no auto-fill implemented |
| **Career Profile** | Optional | ✅ Backend ready, ❌ Frontend missing | Could provide work experience data |
| **Growth Hub** | Optional | ✅ Backend ready | Could provide skill progression data |
| **GitHub Integration** | Optional | ✅ Backend ready | Could provide project repositories for auto-fill |
| **Document Intelligence** | Optional | ✅ Backend ready | Could parse uploaded resumes for enhancement |
| **Research Wing** | Optional | ✅ Backend ready | Could populate research/publications section |
| **AI Service (Gemini)** | Required | ✅ Backend ready | `enhanceResumeFields` for tone-based rewriting |
| **Storage Service (Cloudinary)** | Required | ✅ Backend ready | Template file storage |
| **Export Service** | Optional | ✅ Backend ready | Excel export includes resume link |

### 7.2 External Dependencies

| Dependency | Version | Purpose | Status |
|------------|---------|---------|--------|
| `docxtemplater` | ^3.68.3 | DOCX template rendering | ✅ Installed |
| `pizzip` | ^3.2.0 | ZIP handling for DOCX | ✅ Installed |
| `mammoth` | ^1.12.0 | DOCX → HTML conversion | ✅ Installed |
| `jspdf` | — | PDF generation | ✅ Available in `exportUtils.ts` but not used for resumes |
| `docx` | — | DOCX generation | ✅ Available in `exportUtils.ts` but not used for resumes |
| `@google/genai` | ^1.45.0 | AI field enhancement | ✅ Installed |
| `cloudinary` | ^2.9.0 | Template storage | ✅ Installed |
| `firebase-admin` | ^13.7.0 | Firebase integration | ✅ Installed |

### 7.3 Dependency Classification

| Dependency | Classification | Rationale |
|------------|---------------|-----------|
| Skills Tracker | Required | Resume Builder config explicitly requires `skills`, `experience`, `projects` |
| Academic Records | Required | Resume Builder config requires `experience` and `projects` |
| AI Service (Gemini) | Optional | Enhancement is optional; resume generation works without AI |
| Cloudinary Storage | Required | Template files must be stored somewhere |
| Career Profile | Optional | Nice-to-have for experience auto-fill |
| GitHub Integration | Optional | Nice-to-have for project auto-fill |
| PDF Export | Future Enhancement | Not in current backend; requires additional library integration |
| Resume Versions | Future Enhancement | Not in current data model |

---

## 8. Missing Components

### 8.1 Frontend Components (Critical)

| Component | Purpose | Estimated Effort | Complexity |
|-----------|---------|------------------|------------|
| `@/components/Resume/ResumeBuilder` | Main student resume builder UI | 2-3 days | Medium |
| `@/components/Resume/TemplateUploadForm` | Faculty template upload form | 1 day | Low |
| `@/components/Resume/TemplateList` | Faculty template management list | 1 day | Low |

### 8.2 Frontend Features (High Priority)

| Feature | Purpose | Estimated Effort |
|---------|---------|------------------|
| API service layer (`skillsApi.ts` pattern) | `fetchTemplates`, `generateResume`, `saveDraft` | 0.5 day |
| Template selection UI | Display available templates to student | 0.5 day |
| Dynamic form renderer | Generate form from template `questions` array | 1-2 days |
| HTML preview modal | Show generated resume preview | 0.5 day |
| DOCX download handler | Trigger download from Base64 | 0.25 day |
| Draft auto-save | Save form data periodically | 0.5 day |
| Error boundaries | Prevent crashes on missing components | 0.5 day |

### 8.3 Backend Features (Medium Priority)

| Feature | Purpose | Estimated Effort |
|---------|---------|------------------|
| PDF export endpoint | Generate PDF from DOCX or HTML | 1-2 days |
| Resume status endpoint | Check completion, existence | 0.5 day |
| Resume history endpoint | List all drafts/versions | 0.5 day |
| Delete resume endpoint | Allow user to delete drafts | 0.25 day |
| Template soft-delete | Disable instead of hard-delete | 0.5 day |
| Template preview endpoint | Serve template as HTML/PDF preview | 0.5 day |

### 8.4 Auto-Fill Integration (Low Priority)

| Integration | Source | Target Fields | Estimated Effort |
|-------------|--------|---------------|------------------|
| Skills Engine → Resume | `SkillRecord` | Skills section | 1 day |
| Academic Records → Resume | `AcademicRecord` | Education section | 1 day |
| Career Profile → Resume | `CareerRecord` | Experience section | 1 day |
| GitHub → Resume | `GithubRecord` | Projects section | 1 day |

---

## 9. Architecture Observations

### 9.1 Strengths

1. **Backend is solid** — Routes, services, models, and module registry are all properly implemented
2. **AI integration is thoughtful** — Tone-based enhancement with safe merge logic
3. **Multi-tenant design is correct** — Organization-scoped templates, role-based access
4. **Storage abstraction is good** — Cloudinary for templates, Firebase for other assets
5. **Module registry integration** — Resume Builder is properly registered and routed

### 9.2 Weaknesses

1. **Frontend is completely missing** — The largest gap; no UI exists at all
2. **No PDF export** — Only DOCX + HTML preview; PDF generation for resumes is absent
3. **No auto-fill** — Despite listing `skills`, `experience`, `projects` as required entities, no auto-population exists
4. **Hardcoded template ID in ResumeAdapter** — `64c58cfcb6fcd8ef57c0e5a8` is hardcoded in the routing engine adapter
5. **Disabled features** — Template tag extraction and interactive mappings are commented out
6. **No resume versioning** — `findOneAndUpdate` with upsert overwrites previous drafts
7. **Minimal validation** — No schema validation for `filledData` structure
8. **No download tracking** — `generatedDocxUrl` is populated in exportService but not in resumeController

### 9.3 Data Flow Gaps

**Current (broken):**
```
Faculty uploads template → Cloudinary
                            ↓
Student selects template → ❌ No UI
                            ↓
Student fills form → ❌ No UI
                            ↓
Resume generated → ❌ No UI to trigger
                            ↓
DOCX returned → ❌ No download handler
```

**Required:**
```
Faculty uploads template → Cloudinary → ResumeTemplate
                            ↓
Student selects template → TemplateList component → GET /api/resume/templates
                            ↓
Student fills form → Dynamic form from template.questions → POST /api/resume/generate
                            ↓
Resume generated → HTML preview + DOCX Base64 → Download handler
                            ↓
Draft saved → StudentResume.findOneAndUpdate
                            ↓
Auto-fill (optional) → Skills/Academic/Career data → Pre-populate form
```

---

## 10. MVP Recommendations

### 10.1 Required for MVP

| Component | Priority | Rationale |
|-----------|----------|-----------|
| `ResumeBuilder` component | P0 | Core student UI — without this, the feature is inaccessible |
| `TemplateList` component | P0 | Faculty cannot manage templates without this |
| `TemplateUploadForm` component | P0 | Faculty cannot create templates without this |
| API service layer | P0 | Frontend needs typed API calls |
| Template selection UI | P0 | Student must select a template before filling |
| Dynamic form renderer | P0 | Must render fields from template `questions` |
| HTML preview modal | P0 | Students need to preview before downloading |
| DOCX download handler | P0 | Primary deliverable is a DOCX file |

### 10.2 Can Wait Until Post-MVP

| Component | Priority | Rationale |
|-----------|----------|-----------|
| PDF export | P1 | DOCX is acceptable for MVP; PDF is a nice-to-have |
| AI tone enhancement UI | P1 | Works without AI; enhancement is optional |
| Auto-fill from Skills Engine | P1 | Manual entry is acceptable for MVP |
| Auto-fill from Academic Records | P1 | Manual entry is acceptable for MVP |
| Resume versions/history | P2 | Single draft per template is sufficient for MVP |
| Template soft-delete | P2 | Hard delete is acceptable for MVP |
| Template preview endpoint | P2 | Faculty can download and preview locally |
| Resume status endpoint | P2 | Not needed for core flow |

---

## 11. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Frontend components not implemented | High | High | This investigation confirms the gap; implementation is straightforward |
| DOCX template compatibility issues | Medium | Medium | Docxtemplater is strict about placeholder matching; need validation |
| AI enhancement API failures | Low | Medium | Already has fallback to original data |
| Cloudinary storage failures | Low | Low | Has fallback to dummy URL; mock mode exists |
| Large template files (5MB limit) | Low | Low | Multer enforces limit |
| Multi-tenant template leakage | Medium | Low | Organization-scoped queries already implemented |
| No resume versioning → data loss | Medium | Medium | `findOneAndUpdate` with upsert overwrites; add versioning post-MVP |
| Hardcoded template ID in ResumeAdapter | Medium | High | Must be fixed before production use |

---

## 12. Final Recommendation

### 12.1 Immediate Actions (No Code Changes)

1. **Approve this investigation** — Confirm that the backend is ready and the gap is purely frontend
2. **Create implementation plan** — Break down the 3 missing components into tasks
3. **Assign frontend developer** — The backend is ready; frontend is the only blocker

### 12.2 Implementation Order

| Phase | Components | Deliverable |
|-------|-----------|-------------|
| **Phase 1** | `TemplateList`, `TemplateUploadForm` | Faculty can upload and manage templates |
| **Phase 2** | `ResumeBuilder` (template selection + form) | Student can select template and fill form |
| **Phase 3** | Preview + Download | Student can preview and download DOCX |
| **Phase 4** | Auto-fill integrations | Skills, Academic, Career data pre-populate form |

### 12.3 What NOT to Change

- **Do not modify backend logic** — It is functional and tested
- **Do not redesign the data model** — `StudentResume` and `ResumeTemplate` are sufficient for MVP
- **Do not add PDF export** — Post-MVP feature
- **Do not add resume versioning** — Post-MVP feature
- **Do not implement auto-fill** — Post-MVP feature

### 12.4 Success Criteria

MVP is complete when:
1. Faculty can upload a .docx template with `{{placeholders}}`
2. Student can see available templates
3. Student can select a template and fill a dynamically generated form
4. Student can preview the generated resume as HTML
5. Student can download the resume as DOCX
6. Draft is saved and can be reloaded

---

## 13. Appendix

### 13.1 Backend File Inventory

| File | Lines | Status |
|------|-------|--------|
| `backend/src/routes/resumeRoutes.ts` | 32 | ✅ Active |
| `backend/src/controllers/resumeController.ts` | 250 | ✅ Active |
| `backend/src/services/resumeService.ts` | 67 | ✅ Active |
| `backend/src/services/storageService.ts` | 119 | ✅ Active (uploadResumeTemplate method) |
| `backend/src/services/aiService.ts` | 278 | ✅ Active (enhanceResumeFields, generateTemplateQuestions) |
| `backend/src/models/StudentResume.ts` | 37 | ✅ Active |
| `backend/src/models/ResumeTemplate.ts` | 62 | ✅ Active |
| `backend/src/shared/application/module-registry/resumeBuilder.config.ts` | 15 | ✅ Active |
| `backend/src/shared/application/routingEngine.ts` | 1147 | ✅ Active (ResumeAdapter) |
| `backend/src/services/exportService.ts` | 76 | ⚠️ Partial (uses StudentResume for Excel export) |
| `backend/src/shared/services/review.service.ts` | 993 | ⚠️ Partial (StudentResume in rollback logic) |

### 13.2 Frontend File Inventory

| File | Lines | Status |
|------|-------|--------|
| `app/dashboard/student/resume-builder/page.tsx` | 16 | ⚠️ Broken (missing component) |
| `app/dashboard/faculty/resume-templates/page.tsx` | 28 | ⚠️ Broken (missing components) |
| `app/dashboard/student/skills/components/ResumeReadinessBadge.tsx` | 42 | ⚠️ Dead UI (unused after BUG-007) |
| `app/dashboard/student/career/page.tsx` | 171 | ⚠️ Static mock (hardcoded resume section) |

### 13.3 Key Dependencies Installed

| Package | Version | Purpose |
|---------|---------|---------|
| `docxtemplater` | ^3.68.3 | DOCX template engine |
| `pizzip` | ^3.2.0 | ZIP library for DOCX |
| `mammoth` | ^1.12.0 | DOCX → HTML conversion |
| `@google/genai` | ^1.45.0 | AI field enhancement |
| `cloudinary` | ^2.9.0 | Template file storage |
| `multer` | ^2.1.1 | Multipart file upload |

### 13.4 Key Dependencies NOT Installed (Post-MVP)

| Package | Purpose | When Needed |
|---------|---------|-------------|
| `jspdf` + `jspdf-autotable` | PDF generation for resumes | Post-MVP |
| `html2canvas` | HTML → image for PDF | Post-MVP |
| `react-hook-form` + `zod` | Form validation | Post-MVP (or during Phase 2) |
| `react-query` / `tanstack-query` | Server state management | Post-MVP (or during Phase 2) |

---

**End of Report**
