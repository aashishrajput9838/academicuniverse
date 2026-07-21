# RB-002 — Resume Builder: Frontend Architecture

**Date:** 2026-07-21  
**Status:** Design Complete — Ready for Review  
**Scope:** Student-facing Resume Builder MVP frontend architecture  
**Backend:** Production-ready (RB-001 complete)  
**Constraint:** Design only. No implementation. No code generation.

---

## 1. Folder Structure

```
app/dashboard/student/resume-builder/
├── page.tsx                                    # Route wrapper (minimal)
└── components/
    ├── ResumeBuilderPage/
    │   ├── ResumeBuilderPage.tsx               # Orchestrator / state machine
    │   └── hooks/
    │       ├── useResumeBuilder.ts             # Core builder state + actions
    │       ├── useTemplateSelection.ts         # Template fetching + selection
    │       └── useAutoSave.ts                  # Debounced draft persistence
    │   └── utils/
    │       └── resumeHelpers.ts                # Derived data, formatting
    ├── TemplateSelection/
    │   ├── TemplateSelection.tsx               # Template list container
    │   ├── TemplateCard.tsx                    # Individual template card
    │   └── TemplateFilters.tsx                 # Search / filter / sort
    ├── ResumeForm/
    │   ├── ResumeForm.tsx                      # Form orchestrator
    │   ├── FormSection.tsx                     # Grouped field section
    │   ├── FormFieldRenderer.tsx               # Input / textarea per question type
    │   └── FormNavigation.tsx                  # Back / Next / Save indicators
    ├── Generation/
    │   ├── GenerationLoading.tsx               # Loading state
    │   └── GenerationError.tsx                 # Error state with retry
    ├── Preview/
    │   ├── ResumePreview.tsx                   # Sandboxed iframe preview
    │   ├── PreviewToolbar.tsx                  # Back / Regenerate actions
    │   └── ExportActions.tsx                   # DOCX / PDF download buttons
    ├── Draft/
    │   └── DraftIndicator.tsx                  # Auto-save status badge
    └── shared/
        ├── ResumeEmptyState.tsx                # Empty list / no templates
        ├── ResumeErrorState.tsx                # Generic error with retry
        └── ResumeSkeleton.tsx                  # Loading skeletons

components/Resume/
├── api/
│   ├── resumeApi.ts                            # Student-facing API: generate, draft
│   └── templateApi.ts                          # Template CRUD API (faculty)
├── types/
│   ├── api.ts                                  # DTOs: responses, requests
│   ├── resume.ts                               # Resume state types
│   └── template.ts                             # Template + question types
└── shared/
    ├── ResumeEmptyState.tsx                    # Shared empty state (mirror)
    ├── ResumeErrorState.tsx                    # Shared error state (mirror)
    └── ResumeSkeleton.tsx                      # Shared skeleton (mirror)
```

**Principles:**
- Student builder lives under `app/dashboard/student/resume-builder/`.
- Legacy faculty components (`components/Resume/TemplateEditor.tsx`, `TemplateList.tsx`, `TemplateUploadForm.tsx`, `ResumeBuilder.tsx`) are **not** imported by the student flow.
- Shared types and API layer remain in `components/Resume/` to avoid duplicating contracts consumed by faculty pages.
- `app/dashboard/student/resume-builder/components/shared/` is removed; use `components/Resume/shared/` instead.

---

## 2. Component Hierarchy

```
ResumeBuilderPage (orchestrator)
├── TemplateSelection
│   ├── TemplateFilters
│   └── TemplateCard (×N)
│       └── [select action]
├── ResumeForm
│   ├── FormSection (×M)
│   │   └── FormFieldRenderer (×K)
│   │       ├── Input (text)
│   │       └── Textarea
│   └── FormNavigation
│       └── DraftIndicator
├── GenerationLoading
├── GenerationError
└── Preview
    ├── PreviewToolbar
    ├── ResumePreview (iframe)
    └── ExportActions
        ├── DownloadDocxButton
        └── DownloadPdfButton
```

**Container / Presentational split:**
- `ResumeBuilderPage` is the only container. It owns the step state machine and orchestrates which child to render.
- All children under `TemplateSelection`, `ResumeForm`, `Generation`, `Preview` are presentational. They receive data + callbacks via props.
- Hooks (`useResumeBuilder`, `useTemplateSelection`, `useAutoSave`) encapsulate all side effects.

---

## 3. API Layer

### Location
`components/Resume/api/resumeApi.ts` (student-facing), `components/Resume/api/templateApi.ts` (faculty-facing).

### Contract
- All responses follow the envelope: `{ success: boolean, data: T, message?: string }`.
- Errors throw with parsed message; `apiRequest` from `@/utils/api` handles token injection and error normalization.
- For the student builder, prefer `apiRequest` directly over bespoke wrappers to reduce duplication.

### Endpoints Consumed

| Method | Endpoint | Used By | Purpose |
|--------|----------|---------|---------|
| GET | `/api/resume/templates` | TemplateSelection | List published templates for org |
| POST | `/api/resume/generate` | ResumeForm → Generation | Render DOCX + HTML preview |
| GET | `/api/resume/draft` | useAutoSave / useResumeBuilder | Fetch existing draft on template open |
| POST | `/api/resume/templates` | TemplateUploadForm (faculty) | Upload template (faculty only) |

### API Functions

```ts
// resumeApi.ts
export async function fetchTemplates(backendToken: string, target?: string): Promise<ResumeTemplateDTO[]>
export async function generateResume(backendToken: string, payload: GenerateResumeRequest): Promise<GenerateResumeResponse>
export async function fetchDraft(backendToken: string, templateId: string): Promise<DraftDTO | null>

// templateApi.ts (faculty)
export async function uploadTemplate(backendToken: string, formData: FormData): Promise<ResumeTemplateDTO>
export async function fetchAllTemplates(backendToken: string): Promise<ResumeTemplateDTO[]>
export async function deleteTemplate(backendToken: string, templateId: string): Promise<void>
```

### Error Mapping

| HTTP | Meaning | UI Action |
|------|---------|-----------|
| 401 | Unauthenticated | Redirect to login via AuthContext |
| 403 | Student viewing draft-only / faculty upload denied | Show permission error |
| 404 | Template not found | Show not-found state, offer back to selection |
| 413 | File too large | Show inline validation error |
| 422 | Invalid DOCX / generation failed | Show generation error with retry |
| 500 | Server error | Show generic error with retry |

---

## 4. State Management

### Pattern
Custom React hooks + local component state. No global store (Zustand not required for MVP).

### Hooks

**`useResumeBuilder(backendToken)`**
- **State:** `currentStep`, `selectedTemplate`, `formData`, `generatedPreview`, `generatedDocx`, `isGenerating`, `error`, `generationError`, `draftStatus`, `lastSavedAt`, `isDownloading`, `downloadError`, `isDownloadingPdf`, `pdfDownloadError`
- **Actions:** `selectTemplate(template)`, `generatePreview(data, tone?)`, `downloadResume()`, `downloadPdf()`, `retryGeneration()`, `resetBuilder()`, `goBackToForm()`
- **Derived:** `canGenerate` (all required fields filled), `hasPreview` (generatedPreview !== null)
- **Side effects:** None directly; delegates to `useAutoSave` and `useTemplateSelection`.

**`useTemplateSelection(backendToken)`**
- **State:** `templates`, `isLoading`, `error`, `selectedTemplateId`
- **Actions:** `fetchTemplates()`, `selectTemplate(id)`, `clearSelection()`
- **Side effects:** Fetches templates on mount; optionally loads draft if query param present.

**`useAutoSave(backendToken, templateId, formData)`**
- **State:** `draftStatus`, `lastSavedAt`, `error`
- **Actions:** `saveDraft()` (debounced 2s), `loadDraft()`, `clearDraft()`
- **Side effects:** Calls `generateResume` with `tone: 'none'` to persist draft without rendering; on mount loads existing draft.

### State Flow

```
ResumeBuilderPage
├── useResumeBuilder (orchestrator)
│   ├── useTemplateSelection (template list)
│   └── useAutoSave (draft persistence)
└── Conditional render by currentStep:
    ├── 'template'  → TemplateSelection
    ├── 'form'      → ResumeForm + DraftIndicator
    ├── 'loading'   → GenerationLoading
    ├── 'error'     → GenerationError
    └── 'preview'   → PreviewToolbar + ResumePreview + ExportActions
```

---

## 5. Data Flow

### Template Selection Flow
```
Mount → useTemplateSelection.fetchTemplates()
  → apiRequest(GET /api/resume/templates)
  → set templates state
  → TemplateSelection renders TemplateCard list
User clicks TemplateCard
  → selectTemplate(template)
  → useResumeBuilder.selectTemplate(template)
  → set currentStep = 'form'
  → ResumeForm mounts
```

### Form + Draft Flow
```
ResumeForm mounts
  → useAutoSave.loadDraft(templateId)
    → apiRequest(GET /api/resume/draft)
    → if found: populate formData
  → render FormSection + FormFieldRenderer per question
User types
  → formData updated via React state (passed down)
  → useAutoSave debounces 2s → saveDraft()
    → apiRequest(POST /api/resume/generate, { templateId, data, tone: 'none' })
    → persists StudentResume in backend
    → set draftStatus = 'saved', lastSavedAt = now
User clicks "Generate Resume"
  → validate required fields
  → useResumeBuilder.generatePreview(data, tone: 'none')
    → set currentStep = 'loading', isGenerating = true
    → apiRequest(POST /api/resume/generate, { templateId, data, tone: 'none' })
    → on success: set generatedPreview, generatedDocx, currentStep = 'preview'
    → on error: set generationError, currentStep = 'error'
```

### Preview Flow
```
Preview mounts
  → ResumePreview renders iframe with srcDoc = generatedPreview (sanitized)
  → ExportActions available:
      Download DOCX → base64 → Blob → <a download>
      Download PDF  → html2pdf.js via hidden iframe / window
  → PreviewToolbar "Back to Form" → currentStep = 'form'
```

---

## 6. User Flow

```
1. Student opens /dashboard/student/resume-builder
   → ResumeBuilderPage mounts
   → useTemplateSelection fetches templates
   → TemplateSelection renders

2. Student browses templates
   → Search / filter / sort (client-side on fetched array)
   → Click template card

3. Student fills form
   → ResumeForm renders fields from template.questions
   → Auto-save indicator shows "Saving..." → "Saved"
   → Student can navigate back to selection

4. Student generates resume
   → Loading spinner (GenerationLoading)
   → On success: Preview with DOCX + PDF download
   → On failure: GenerationError with retry button

5. Student downloads
   → DOCX: base64 decode → Blob → anchor click
   → PDF: html2pdf.js render → download
   → Errors shown inline with retry
```

---

## 7. Error Handling

### Strategy
Three-state UI pattern: `loading` → `error` (with retry) → `data` / `empty`.

### Categories

| Error | Source | Handling |
|-------|--------|----------|
| Network failure | `fetch` / `apiRequest` | Catch → set error state → ResumeErrorState with retry |
| 401 Unauthorized | AuthContext | Redirect to login |
| 403 Forbidden | API | Show "You do not have access" |
| 404 Not Found | API | Show "Template not found" + back button |
| 422 Generation failed | API | GenerationError with retry; preserve formData |
| 500 Server error | API | ResumeErrorState with retry |
| Validation error | FormFieldRenderer | Inline error below field; `aria-describedby` |
| Empty template list | API (no templates) | ResumeEmptyState with CTA / help text |

### Error State Shape
```ts
interface ResumeErrorState {
  message: string;
  retry: () => void;
  onBack?: () => void;
}
```

### Components
- `ResumeErrorState` — generic error banner with retry + optional back action.
- `GenerationError` — extends ResumeErrorState with generation-specific messaging.
- Inline form errors — rendered under `FormFieldRenderer` with red border + `aria-invalid`.

---

## 8. Loading States

### Skeleton Strategy
- Template list: `ResumeSkeleton` grid (3 cards × 2 rows).
- Form: `ResumeSkeleton` form fields (4-6 field placeholders).
- Preview: `ResumeSkeleton` iframe placeholder + toolbar.

### Spinner Strategy
- Generation: full-screen `GenerationLoading` with progress text: "Generating your resume..."
- Download: button-level spinner + disabled state.
- Auto-save: small inline indicator (dot + "Saving..." / "Saved").

### Hydration
- All client components marked `'use client'`.
- Use `ResumeSkeleton` during initial data fetch to prevent layout shift.

---

## 9. Empty States

| State | Component | Message | CTA |
|-------|-----------|---------|-----|
| No templates published | ResumeEmptyState | "No templates available yet." | Contact admin / refresh |
| Draft exists but no template | ResumeEmptyState | "Select a template to continue." | Browse templates |
| No form data | Handled by ResumeForm | Fields shown empty; auto-save idle | — |
| Preview generation returned empty | GenerationError | "Generated preview is empty." | Retry generation |

---

## 10. Download Flow

### DOCX Download
```
User clicks "Download DOCX"
  → set isDownloading = true
  → decode base64 docxBase64 → Uint8Array → Blob (type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
  → createObjectURL(blob)
  → <a download={filename}> click programmatically
  → revokeObjectURL after 1s
  → set isDownloading = false
  → on error: set downloadError, show retry
```

### PDF Download
```
User clicks "Download PDF"
  → set isDownloadingPdf = true
  → html2pdf.js().from(element).save()
    → uses generatedPreview HTML rendered in hidden container
  → on success: set isDownloadingPdf = false
  → on error: set pdfDownloadError, show retry
```

### Filename Convention
`{StudentName}_Resume_{TemplateName}_{Date}.docx` / `.pdf`

### Error Recovery
- Retry button re-triggers download from cached `generatedDocx` / `generatedPreview`.
- If cache missing, fallback to re-generate.

---

## 11. Preview Flow

```
generatePreview() resolves
  → set generatedPreview (HTML string), generatedDocx (base64)
  → currentStep = 'preview'
  → ResumePreview mounts
    → iframe sandbox="allow-same-origin allow-scripts"
    → srcDoc = sanitized generatedPreview
    → onLoad: focus iframe for accessibility
  → PreviewToolbar renders: "Back to Form", "Regenerate"
  → ExportActions renders: "Download DOCX", "Download PDF"
```

### Sanitization
- `generatedPreview` is generated server-side by mammoth (trusted HTML from DOCX).
- Still set iframe `sandbox` to restrict navigation, form submission, popups.
- Do NOT use `dangerouslySetInnerHTML` outside iframe.

### Regenerate
- "Regenerate" button → `generatePreview(formData, tone)` again.
- Preserve formData; allow tone toggle in future.

---

## 12. Draft Save Flow

```
ResumeForm mounts with templateId + formData
  → useAutoSave.loadDraft(templateId)
    → GET /api/resume/draft?templateId=...
    → if exists: merge filledData into formData
    → set draftStatus = 'saved', lastSavedAt = draft.updatedAt

User types in any field
  → formData updated (React state in ResumeBuilderPage)
  → useAutoSave debounce 2s starts
  → if user types again before 2s: debounce resets

After 2s idle
  → saveDraft()
    → POST /api/resume/generate { templateId, data, tone: 'none' }
    → backend persists StudentResume without rendering
    → on success: draftStatus = 'saved', lastSavedAt = now
    → on error: draftStatus = 'error', show retry

User navigates away
  → cleanup debounce timer
  → optional: flush pending save synchronously

User returns to same template
  → loadDraft() again
  → restore last saved formData
```

### Indicator UI
- `DraftIndicator` shows: `● Saving...` (amber), `● Saved` (green), `● Error` (red, with retry).
- Positioned near form header or bottom sticky bar.

---

## 13. Sequence Diagrams

### 13.1 Template Selection → Generation → Preview

```
Student          Frontend           Backend            Cloudinary
  |                |                  |                   |
  |-- open page -->|                  |                   |
  |                |-- GET /templates -------------------->|
  |                |<-- {templates} ----------------------|
  |<-- list --------|                  |                   |
  |                |                  |                   |
  |-- select ----->|                  |                   |
  |                |-- GET /draft ----------------------->|
  |                |<-- {draft} --------------------------|
  |<-- form --------|                  |                   |
  |                |                  |                   |
  |-- fill form -->|                  |                   |
  |                |                  |                   |
  |-- generate --->|                  |                   |
  |                |-- POST /generate ------------------->|
  |                |   (templateId, data)                  |
  |                |                  |-- fetch DOCX ----->|
  |                |                  |<-- DOCX buffer ----|
  |                |                  |-- render DOCX ---->|
  |                |                  |-- mammoth HTML --->|
  |                |                  |<-- html preview ---|
  |                |<-- {preview, docx} -------------------|
  |<-- preview -----|                  |                   |
```

### 13.2 Auto-Save

```
Student          Frontend           Backend
  |                |                  |
  |-- type ------->|                  |
  |                |-- debounce 2s --|                  |
  |                |-- POST /generate ------------------->|
  |                |   (templateId, data, tone:'none')     |
  |                |<-- {studentResumeId} -----------------|
  |<-- saved -------|                  |
```

### 13.3 Download DOCX

```
Student          Frontend           Backend
  |                |                  |
  |-- download --->|                  |
  |                |-- decode base64 -->|
  |                |-- Blob / anchor --->|
  |<-- file --------|                  |
```

---

## 14. Component Responsibilities

| Component / Hook | Responsibility |
|------------------|----------------|
| `page.tsx` | Route wrapper; no logic. |
| `ResumeBuilderPage` | Step state machine. Selects which child to render. Owns `formData`, `generatedPreview`, `generatedDocx`, error states. Passes callbacks down. |
| `useResumeBuilder` | Core builder logic: select template, generate, download, retry, reset. Wraps API calls. |
| `useTemplateSelection` | Fetch templates, handle selection, load draft on mount. |
| `useAutoSave` | Debounced draft persistence. Load draft on mount. |
| `TemplateSelection` | Render template list + filters. Dispatches select up. |
| `TemplateCard` | Presentational. Shows template name, type, target, preview placeholder. Click → onSelect. |
| `TemplateFilters` | Client-side search/filter/sort on `templates` array. |
| `ResumeForm` | Render questions as form fields. Validate required. Show DraftIndicator. Dispatch generate up. |
| `FormSection` | Optional grouping of questions (e.g., Personal, Education). |
| `FormFieldRenderer` | Render `<input>` or `<textarea>` per `question.type`. Show AI badge. Inline validation. |
| `FormNavigation` | Back button, Generate button, progress indicator. |
| `GenerationLoading` | Full-step loading with status text. |
| `GenerationError` | Error message + retry button + back button. |
| `ResumePreview` | iframe with `srcDoc`. Sandboxed. |
| `PreviewToolbar` | Back to Form, Regenerate. |
| `ExportActions` | DOCX + PDF download buttons with loading/error states. |
| `DraftIndicator` | Auto-save status dot + text. |
| `ResumeEmptyState` | Empty list / no templates UI. |
| `ResumeErrorState` | Generic error UI with retry. |
| `ResumeSkeleton` | Loading placeholder for list, form, preview. |

---

## 15. Implementation Order

### Phase A — Core Scaffolding (Day 1)
1. Finalize types in `components/Resume/types/api.ts`, `resume.ts`, `template.ts`.
2. Refactor `components/Resume/api/resumeApi.ts` to use `apiRequest` from `@/utils/api` (or keep explicit token passing if `apiRequest` does not support it; if kept, document the deviation).
3. Build `useResumeBuilder`, `useTemplateSelection`, `useAutoSave` hooks (logic only, no UI).
4. Build `ResumeBuilderPage` state machine with placeholder children.
5. Verify API layer against backend contracts.

### Phase B — Template Selection (Day 2)
1. Build `TemplateSelection`, `TemplateCard`, `TemplateFilters`.
2. Wire `useTemplateSelection` → list UI.
3. Implement template card click → step transition to form.
4. Add loading (`ResumeSkeleton`) and empty (`ResumeEmptyState`) states.

### Phase C — Form + Auto-Save (Day 3)
1. Build `ResumeForm`, `FormSection`, `FormFieldRenderer`, `FormNavigation`.
2. Build `DraftIndicator`.
3. Wire `useAutoSave` to form inputs.
4. Implement validation (required fields) before allowing generate.
5. Implement "Back to Selection" from form.

### Phase D — Generation + Preview (Day 4)
1. Build `GenerationLoading`, `GenerationError`.
2. Wire `generatePreview` in `useResumeBuilder`.
3. Build `ResumePreview` (iframe), `PreviewToolbar`, `ExportActions`.
4. Implement DOCX download (base64 → Blob).
5. Implement PDF download (html2pdf.js).

### Phase E — Polish + Edge Cases (Day 5)
1. Add error boundaries.
2. Add keyboard navigation (Enter to select template, Escape to go back).
3. Add ARIA labels and live regions for auto-save status.
4. Add mobile responsive adjustments (single column cards, stacked form fields).
5. Verify three-state pattern across all steps.
6. Cross-browser test (Chrome, Firefox, Edge).

---

## 16. Non-Functional Requirements

### Performance
- Template list: client-side search/filter/sort on 50-200 items; no pagination needed for MVP.
- Auto-save: 2s debounce; cancel pending save on unmount.
- Preview: iframe `srcDoc` set once after generation; avoid re-renders.

### Accessibility
- All interactive elements focusable.
- `aria-live="polite"` on draft indicator.
- `aria-invalid` + `aria-describedby` on invalid fields.
- iframe has `title="{template name} resume preview"`.

### Responsiveness
- Template grid: 1 col mobile, 2 col tablet, 3 col desktop.
- Form: single column, full width.
- Preview: full width, min-height 600px.

### Security
- No tokens in URL.
- `generatedPreview` sanitized by backend (mammoth); iframe sandboxed.
- DOCX/PDF downloads use object URLs; revoked after use.

---

## 17. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Backend `generateResume` times out on large DOCX | Medium | Frontend shows loading; backend already async. Add client timeout with retry. |
| mammoth produces inconsistent HTML across DOCX versions | Low | Backend issue; frontend iframe sandbox contains risk. |
| Auto-save races with manual navigation | Low | Cancel debounce on unmount; flush on beforeunload. |
| base64 DOCX exceeds memory on very large files | Low | Backend enforces 5MB limit; browser handles ~5MB base64 fine. |
| html2pdf.js fails on complex CSS | Low | Fallback message: "PDF export failed. Please use DOCX download." |

---

## 18. Open Decisions (Pending Approval)

1. **API layer consistency:** Keep explicit `backendToken` param in resume API, or migrate to `apiRequest` from `@/utils/api`?
   - **Recommendation:** Migrate to `apiRequest` to eliminate duplication. `apiRequest` reads token from localStorage; pass `backendToken` only if `apiRequest` does not support it.
2. **Tone selector:** MVP uses `tone: 'none'`. UI for tone selection deferred to post-MVP.
3. **Bulk draft management:** Single draft per student+template. Bulk actions deferred.
4. **Template preview thumbnails:** Faculty uploads preview images; student builder shows static placeholder or fetched `previewImage` if available.

---

## 19. Next Steps

1. Review and approve RB-002.
2. Proceed to RB-003 (Implementation Plan) with phase breakdown.
3. Execute Phase A → E in order.
