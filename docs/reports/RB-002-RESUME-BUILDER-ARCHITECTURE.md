# RB-002: Resume Builder — Frontend Architecture Design

**Date:** 2026-07-21T02:43:00+05:30  
**Status:** Design Complete — Ready for Implementation  
**Owner:** Lead Software Architect / Senior Full Stack Engineer  
**Related:** RB-001 (Investigation), BUG-007, BUG-008  

---

## 1. Folder Structure

```
app/
├── dashboard/
│   ├── student/
│   │   ├── resume-builder/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── ResumeBuilderPage/
│   │   │       │   ├── ResumeBuilderPage.tsx
│   │   │       │   ├── ResumeBuilderPage.test.tsx
│   │   │       │   ├── hooks/
│   │   │       │   │   ├── useResumeBuilder.ts
│   │   │       │   │   ├── useAutoSave.ts
│   │   │       │   │   └── useTemplateSelection.ts
│   │   │       │   └── utils/
│   │   │       │       └── resumeHelpers.ts
│   │   │       ├── TemplateSelection/
│   │   │       │   ├── TemplateSelection.tsx
│   │   │       │   ├── TemplateCard.tsx
│   │   │       │   └── TemplateFilters.tsx
│   │   │       ├── ResumeForm/
│   │   │       │   ├── ResumeForm.tsx
│   │   │       │   ├── FormFieldRenderer.tsx
│   │   │       │   ├── FormSection.tsx
│   │   │       │   └── FormNavigation.tsx
│   │   │       ├── Preview/
│   │   │       │   ├── ResumePreview.tsx
│   │   │       │   ├── PreviewToolbar.tsx
│   │   │       │   └── PreviewSkeleton.tsx
│   │   │       ├── Download/
│   │   │       │   ├── DownloadButton.tsx
│   │   │       │   ├── DownloadProgress.tsx
│   │   │       │   └── DownloadSuccess.tsx
│   │   │       ├── Draft/
│   │   │       │   ├── DraftIndicator.tsx
│   │   │       │   ├── DraftHistory.tsx
│   │   │       │   └── DraftRestore.tsx
│   │   │       ├── Enhancement/
│   │   │       │   ├── ToneSelector.tsx
│   │   │       │   ├── EnhancementPanel.tsx
│   │   │       │   └── EnhancementPreview.tsx
│   │   │       └── shared/
│   │   │           ├── ResumeEmptyState.tsx
│   │   │           ├── ResumeErrorState.tsx
│   │   │           └── ResumeSkeleton.tsx
│   │   └── faculty/
│   │       └── resume-templates/
│   │           ├── page.tsx
│   │           └── components/
│   │               ├── TemplateUploadForm/
│   │               │   ├── TemplateUploadForm.tsx
│   │               │   ├── TemplateUploadForm.test.tsx
│   │               │   └── TemplateDropzone.tsx
│   │               └── TemplateList/
│   │                   ├── TemplateList.tsx
│   │                   ├── TemplateList.test.tsx
│   │                   ├── TemplateTable.tsx
│   │                   └── TemplateActions.tsx
│   └── components/
│       └── Resume/
│           ├── types/
│           │   ├── resume.ts
│           │   ├── template.ts
│           │   └── api.ts
│           ├── api/
│           │   ├── resumeApi.ts
│           │   └── templateApi.ts
│           ├── hooks/
│           │   ├── useResumeDraft.ts
│           │   ├── useResumePreview.ts
│           │   └── useResumeDownload.ts
│           └── utils/
│               ├── docxParser.ts
│               ├── htmlFormatter.ts
│               └── downloadHelper.ts
```

---

## 2. Component Hierarchy

```
App
└── DashboardLayout
    └── ResumeBuilderPage (student/resume-builder/page.tsx)
        └── ResumeBuilderPage (orchestrator)
            ├── TemplateSelection (if no template selected)
            │   ├── TemplateFilters
            │   └── TemplateCard[]
            │
            ├── ResumeForm (if template selected)
            │   ├── FormNavigation
            │   └── FormSection[]
            │       └── FormFieldRenderer[]
            │
            ├── EnhancementPanel (optional)
            │   ├── ToneSelector
            │   └── EnhancementPreview
            │
            ├── ResumePreview (after generate)
            │   ├── PreviewToolbar
            │   │   ├── DownloadButton
            │   │   ├── PrintButton
            │   │   └── EditButton
            │   └── PreviewSkeleton
            │
            └── DraftHistory (sidebar/modal)
                ├── DraftCard[]
                └── DraftRestore
```

**Faculty Route:**
```
App
└── DashboardLayout
    └── ResumeTemplatesPage (faculty/resume-templates/page.tsx)
        └── TemplateUploadForm
        │   ├── TemplateDropzone
        │   └── UploadProgress
        └── TemplateList
            ├── TemplateTable
            │   └── TemplateRow[]
            │       └── TemplateActions
            └── EmptyState
```

---

## 3. API Layer

### 3.1 Base Client

```typescript
// app/components/Resume/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

async function request<T>(
  endpoint: string,
  options: RequestInit,
  backendToken: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${backendToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid API response');
  }

  return payload.data;
}
```

### 3.2 Student API (`resumeApi.ts`)

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `fetchTemplates(backendToken, target?)` | GET | `/api/resume/templates` | Get available templates |
| `generateResume(backendToken, templateId, data, tone?)` | POST | `/api/resume/generate` | Generate resume DOCX + preview |
| `fetchDraft(backendToken, templateId)` | GET | `/api/resume/draft` | Get saved draft |
| `uploadResume(backendToken, file)` | POST | `/api/resume/upload` | Upload existing resume (future) |

### 3.3 Faculty API (`templateApi.ts`)

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `uploadTemplate(backendToken, formData)` | POST | `/api/resume/templates` | Upload .docx template |
| `fetchTemplates(backendToken)` | GET | `/api/resume/templates` | List all templates |
| `deleteTemplate(backendToken, templateId)` | DELETE | `/api/resume/templates/:id` | Delete template (future) |

---

## 4. State Management

### 4.1 Strategy

Use localized React state via hooks. No global state library needed for MVP.

### 4.2 State Architecture

```
ResumeBuilderPage
├── Local State (useState)
│   ├── currentStep: 'template' | 'form' | 'preview'
│   ├── selectedTemplate: ResumeTemplateDTO | null
│   ├── formData: Record<string, any>
│   ├── generatedPreview: string | null
│   ├── generatedDocx: string | null
│   ├── isGenerating: boolean
│   ├── error: string | null
│   └── draftStatus: 'idle' | 'saving' | 'saved' | 'error'
│
├── Derived State (useMemo)
│   ├── isFormValid: boolean
│   ├── canGenerate: boolean
│   └── canDownload: boolean
│
└── Server State (fetch + cache)
    ├── templates: ResumeTemplateDTO[]
    ├── draft: DraftDTO | null
    └── isLoadingTemplates: boolean
```

### 4.3 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useResumeBuilder(backendToken)` | Main orchestrator hook |
| `useAutoSave(backendToken, templateId, formData)` | Debounced draft saving |
| `useTemplateSelection(backendToken)` | Template fetching and selection |
| `useResumePreview(backendToken)` | Preview generation |
| `useResumeDownload()` | DOCX download orchestration |

---

## 5. Data Flow

### 5.1 High-Level Flow

```
Faculty uploads .docx → Cloudinary → ResumeTemplate saved in DB
                            ↓
Student browses templates ← GET /api/resume/templates
                            ↓
Student selects template → setCurrentStep('form')
                            ↓
Dynamic form rendered from template.questions
                            ↓
Student fills form → auto-save every 2s → POST /api/resume/generate (draft)
                            ↓
Student clicks "Generate" → POST /api/resume/generate (with tone)
                            ↓
Backend: fetch template → AI enhance → Docxtemplater → Mammoth → save draft
                            ↓
Response: { htmlPreview, docxBase64 }
                            ↓
Student previews HTML in iframe → downloads DOCX
```

### 5.2 Draft Save Flow

```
User edits form field
    ↓
useAutoSave starts 2s debounce timer
    ↓
POST /api/resume/generate with tone: 'none'
    ↓
Backend upserts StudentResume
    ↓
DraftIndicator: "Saving..." → "Saved"
```

---

## 6. User Flow

### Student Flow

1. Navigate to `/dashboard/student/resume-builder`
2. Browse template grid (filter/search)
3. Click template card
4. Fill dynamic form (auto-save every 2s)
5. Click "Generate Resume"
6. Preview HTML in sandboxed iframe
7. Download DOCX
8. (Optional) View/restore draft history

### Faculty Flow

1. Navigate to `/dashboard/faculty/resume-templates`
2. See template table
3. Upload .docx via drag-and-drop
4. See success toast
5. Manage templates (delete/preview)

---

## 7. Error Handling

| Error Type | HTTP Status | User Message | Recovery |
|------------|-------------|--------------|----------|
| Authentication | 401 | "Please log in to access Resume Builder." | Redirect to login |
| Authorization | 403 | "Only faculty can upload templates." | Hide upload button |
| Template Not Found | 404 | "This template is no longer available." | Return to template selection |
| File Too Large | 400 | "Template file must be under 5MB." | Show in upload form |
| Invalid File Type | 400 | "Only .docx files are supported." | Show in upload form |
| Generation Failed | 500 | "Failed to generate resume. Please try again." | Retry button |
| Network Error | N/A | "Connection lost. Please check your internet." | Retry button |
| AI Enhancement Failed | 200 (fallback) | "AI enhancement unavailable. Using original text." | Non-blocking |
| Draft Save Failed | 500 | "Failed to save draft. Changes may be lost." | Retry button |

### Error Boundary

```typescript
// shared/ResumeErrorState.tsx
interface ResumeErrorStateProps {
  error: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
}
```

---

## 8. Loading States

| Loading State | Trigger | UI Element | Duration |
|---------------|---------|------------|----------|
| Templates loading | Page load | `ResumeSkeleton` (6 cards) | ~500ms |
| Form initialization | Template selected | `FormSkeleton` (shimmer fields) | ~300ms |
| Draft loading | Template selected | Inline spinner | ~400ms |
| Generation | "Generate" clicked | `GenerationOverlay` | ~3-10s |
| Preview loading | After generation | `PreviewSkeleton` | ~1-2s |
| Download | "Download" clicked | `DownloadProgress` | ~1s |
| Draft saving | Form change (debounced) | `DraftIndicator` | ~500ms |
| Upload | File selected | `UploadProgress` | ~2-5s |

---

## 9. Empty States

| Empty State | Trigger | Message | Action |
|-------------|---------|---------|--------|
| No templates | Student has no templates | "No resume templates available. Contact your faculty." | Refresh button |
| No drafts | Student has no drafts | "You have no saved drafts. Start building!" | Browse templates button |
| Upload empty | Faculty has no templates | "No templates uploaded yet." | Upload button |

```typescript
// shared/ResumeEmptyState.tsx
interface ResumeEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
}
```

---

## 10. Download Flow

```
1. User clicks "Download Resume"
   ↓
2. Decode Base64 → Uint8Array
   ↓
3. Create Blob (MIME: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
   ↓
4. Create object URL
   ↓
5. Create <a> element with download attribute
   ↓
6. Programmatically click <a>
   ↓
7. Revoke object URL
   ↓
8. Show success toast
```

**Filename pattern:** `Resume_{templateName}_{YYYY-MM-DD}.docx`

**Helper:** `utils/downloadHelper.ts` — `downloadDocx(base64: string, filename: string)`

---

## 11. Preview Flow

```typescript
// Preview/ResumePreview.tsx
export function ResumePreview({ htmlPreview }: { htmlPreview: string }) {
  return (
    <div className="preview-container">
      <PreviewToolbar onDownload={...} onPrint={...} onEdit={...} />
      <div className="preview-frame">
        <iframe
          srcDoc={htmlPreview}
          sandbox="allow-same-origin"
          title="Resume Preview"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
```

**Safety:**
- `sandbox="allow-same-origin"` prevents script execution
- Sanitize HTML before rendering
- Disable external links or open in new tab

---

## 12. Draft Save Flow

### Auto-Save Strategy

```typescript
// hooks/useAutoSave.ts
export function useAutoSave(backendToken, templateId, formData) {
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!templateId || !backendToken) return;
    
    const timer = setTimeout(async () => {
      setDraftStatus('saving');
      try {
        await saveDraft(backendToken, templateId, formData);
        setDraftStatus('saved');
        setLastSavedAt(new Date());
      } catch (error) {
        setDraftStatus('error');
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [formData, templateId, backendToken]);

  return { draftStatus, lastSavedAt, retrySave };
}
```

### Draft Recovery

On template selection:
1. `GET /api/resume/draft?templateId=xxx`
2. If draft exists → populate form, show "Restored from draft" toast
3. If no draft → show empty form

---

## 13. Sequence Diagrams

### 13.1 Template Upload (Faculty)

```
Faculty          Frontend          Backend        Cloudinary
  |                 |                 |                |
  |-- select file -->|                 |                |
  |                 |-- POST /templates (multipart) ->|
  |                 |                 |-- upload file ->|
  |                 |                 |<-- file url ----|
  |                 |                 |-- save metadata->|
  |                 |<-- 201 { template }-----------|
  |<-- success toast --------------------------------|
```

### 13.2 Resume Generation

```
Student         Frontend          Backend        AI Service      Cloudinary
  |                |                 |                |                |
  |-- fill form -->|                 |                |                |
  |                |-- POST /generate {templateId, data, tone} ->|
  |                |                 |-- fetch template ->|
  |                |                 |<-- docx buffer ---|
  |                |                 |-- enhance fields ->| (if tone)
  |                |                 |<-- enhanced data --|
  |                |                 |-- render docx ---->|
  |                |                 |-- convert html --->|
  |                |                 |-- save draft ----->|
  |                |<-- 200 {htmlPreview, docxBase64}---------|
  |<-- show preview -------------------------|
  |<-- enable download ---------------------|
```

### 13.3 Draft Auto-Save

```
Student         Frontend          Backend
  |                |                 |
  |-- type in form ->|                |
  |                |-- 2s debounce -->|
  |                |-- POST /generate {draft} ->|
  |                |                 |-- upsert StudentResume
  |                |<-- 200 {studentResumeId}---------|
  |<-- "Saved" indicator ---------------|
```

### 13.4 Download Resume

```
Student         Frontend          Browser
  |                |                 |
  |-- click download ->|               |
  |                |-- decode Base64 ->|
  |                |-- create Blob ---->|
  |                |-- create <a> ----->|
  |                |-- click() -------->|
  |                |-- revoke URL ------>|
  |<-- file saved --------------------|
```

---

## 14. Component Responsibilities

### 14.1 Student Components

| Component | Responsibility | Props | State |
|-----------|---------------|-------|-------|
| `ResumeBuilderPage` | Orchestrate flow, manage global state | `backendToken` | `currentStep`, `selectedTemplate`, `formData`, `generatedPreview`, `generatedDocx`, `error` |
| `TemplateSelection` | Display template grid, handle selection | `templates`, `onSelect`, `isLoading` | `selectedId`, `filter`, `search` |
| `TemplateCard` | Render individual template card | `template`, `onClick`, `isSelected` | None |
| `ResumeForm` | Render dynamic form from questions | `questions`, `initialData`, `onSubmit`, `onChange` | `formData`, `errors`, `touched` |
| `FormFieldRenderer` | Render text/textarea input | `question`, `value`, `onChange`, `error` | None |
| `FormSection` | Group related fields | `title`, `children` | None |
| `FormNavigation` | Stepper navigation | `currentStep`, `totalSteps`, `onNext`, `onPrev`, `onSubmit` | None |
| `ResumePreview` | Render HTML preview in iframe | `htmlPreview`, `onClose`, `onDownload`, `onPrint` | `isLoading`, `zoomLevel` |
| `PreviewToolbar` | Action buttons for preview | `onDownload`, `onPrint`, `onEdit` | None |
| `DownloadButton` | Trigger DOCX download | `docxBase64`, `filename`, `disabled` | `isDownloading` |
| `DraftIndicator` | Show draft save status | `status`, `lastSavedAt`, `onRetry` | None |
| `DraftHistory` | List saved drafts | `drafts`, `onRestore`, `onDelete` | None |
| `ToneSelector` | Select AI enhancement tone | `value`, `onChange`, `disabled` | None |
| `EnhancementPanel` | AI enhancement UI | `originalData`, `enhancedData`, `onAccept`, `onReject` | `isEnhancing` |

### 14.2 Faculty Components

| Component | Responsibility | Props | State |
|-----------|---------------|-------|-------|
| `TemplateUploadForm` | Upload .docx template | `onUploadSuccess` | `file`, `templateName`, `type`, `target`, `isUploading`, `error` |
| `TemplateDropzone` | Drag-and-drop file upload | `onFileSelect`, `accept`, `maxSize` | `isDragOver` |
| `TemplateList` | Display template table | `templates`, `refreshKey` | None |
| `TemplateTable` | Table layout for templates | `templates`, `onDelete` | `sortBy`, `sortOrder` |
| `TemplateRow` | Single template row | `template`, `onDelete`, `onPreview` | None |
| `TemplateActions` | Action buttons per template | `template`, `onDelete`, `onPreview` | None |

### 14.3 Shared Components

| Component | Responsibility | Props |
|-----------|---------------|-------|
| `ResumeEmptyState` | Empty state display | `icon`, `title`, `description`, `action` |
| `ResumeErrorState` | Error display with retry | `error`, `onRetry`, `onGoHome` |
| `ResumeSkeleton` | Loading shimmer | `count?`, `variant?` ('card' \| 'form' \| 'preview') |

---

## 15. Implementation Order

### Phase 1: Foundation (Days 1-2)

**Goal:** Establish API layer and basic page structure.

| Task | Files Created | Dependencies |
|------|--------------|--------------|
| 1.1 Create folder structure | All directories | — |
| 1.2 Implement API client | `components/Resume/api/client.ts` | — |
| 1.3 Implement student API | `components/Resume/api/resumeApi.ts` | client.ts |
| 1.4 Implement faculty API | `components/Resume/api/templateApi.ts` | client.ts |
| 1.5 Define TypeScript types | `components/Resume/types/*.ts` | — |
| 1.6 Create shared components | `ResumeEmptyState`, `ResumeErrorState`, `ResumeSkeleton` | — |
| 1.7 Wire up student page | `resume-builder/page.tsx` | — |

**Deliverable:** Page renders without crashing, shows loading/empty/error states.

### Phase 2: Template Selection (Days 3-4)

**Goal:** Students can browse and select templates.

| Task | Files Created | Dependencies |
|------|--------------|--------------|
| 2.1 TemplateSelection component | `TemplateSelection.tsx` | API types |
| 2.2 TemplateCard component | `TemplateCard.tsx` | — |
| 2.3 TemplateFilters component | `TemplateFilters.tsx` | — |
| 2.4 useTemplateSelection hook | `hooks/useTemplateSelection.ts` | resumeApi |
| 2.5 Integrate with page | `ResumeBuilderPage.tsx` | Phase 1 |

**Deliverable:** Students can browse templates and select one.

### Phase 3: Dynamic Form (Days 5-7)

**Goal:** Students can fill form based on template questions.

| Task | Files Created | Dependencies |
|------|--------------|--------------|
| 3.1 ResumeForm component | `ResumeForm.tsx` | — |
| 3.2 FormFieldRenderer | `FormFieldRenderer.tsx` | — |
| 3.3 FormSection component | `FormSection.tsx` | — |
| 3.4 FormNavigation component | `FormNavigation.tsx` | — |
| 3.5 useAutoSave hook | `hooks/useAutoSave.ts` | resumeApi |
| 3.6 DraftIndicator component | `DraftIndicator.tsx` | — |
| 3.7 Form validation | Inline in ResumeForm | — |

**Deliverable:** Students can fill dynamic form with auto-save.

### Phase 4: Generation & Preview (Days 8-9)

**Goal:** Students can generate and preview resume.

| Task | Files Created | Dependencies |
|------|--------------|--------------|
| 4.1 ResumePreview component | `ResumePreview.tsx` | — |
| 4.2 PreviewToolbar component | `PreviewToolbar.tsx` | — |
| 4.3 PreviewSkeleton component | `PreviewSkeleton.tsx` | — |
| 4.4 useResumePreview hook | `hooks/useResumePreview.ts` | resumeApi |
| 4.5 Integrate generation | `ResumeBuilderPage.tsx` | Phase 3 |

**Deliverable:** Students can generate and preview resume.

### Phase 5: Download (Day 10)

**Goal:** Students can download generated resume.

| Task | Files Created | Dependencies |
|------|--------------|--------------|
| 5.1 DownloadButton component | `DownloadButton.tsx` | — |
| 5.2 DownloadProgress component | `DownloadProgress.tsx` | — |
| 5.3 DownloadSuccess component | `DownloadSuccess.tsx` | — |
| 5.4 useResumeDownload hook | `hooks/useResumeDownload.ts` | — |
| 5.5 downloadHelper utility | `utils/downloadHelper.ts` | — |
| 5.6 Integrate download | `ResumeBuilderPage.tsx` | Phase 4 |

**Deliverable:** Students can download DOCX resume.

### Phase 6: Faculty Template Management (Days 11-12)

**Goal:** Faculty can upload and manage templates.

| Task | Files Created | Dependencies |
|------|--------------|--------------|
| 6.1 TemplateUploadForm | `TemplateUploadForm.tsx` | templateApi |
| 6.2 TemplateDropzone | `TemplateDropzone.tsx` | — |
| 6.3 TemplateList | `TemplateList.tsx` | — |
| 6.4 TemplateTable | `TemplateTable.tsx` | — |
| 6.5 TemplateActions | `TemplateActions.tsx` | — |
| 6.6 Wire up faculty page | `faculty/resume-templates/page.tsx` | Phase 1 |

**Deliverable:** Faculty can upload and manage templates.

### Phase 7: Polish & Testing (Days 13-14)

**Goal:** Production readiness.

| Task | Description |
|------|-------------|
| 7.1 Add error boundaries | Wrap page and major sections |
| 7.2 Add accessibility labels | ARIA labels, keyboard navigation |
| 7.3 Add responsive design | Mobile/tablet breakpoints |
| 7.4 Add analytics tracking | Track template selection, generation, download |
| 7.5 Write unit tests | Hooks, utilities, API layer |
| 7.6 Write integration tests | Template selection → form → generate → download |
| 7.7 Performance audit | Lazy load components, optimize bundle |
| 7.8 Security review | Sanitize HTML preview, validate file uploads |

**Deliverable:** Production-ready frontend.

---

## 16. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| DOCX template compatibility | Medium | Medium | Strict placeholder validation, clear error messages |
| Large form state performance | Low | Low | Use `useMemo` for derived state, debounce auto-save |
| Base64 memory usage | Medium | Medium | Revoke object URLs, limit preview size |
| AI API latency | Low | Medium | Non-blocking fallback, show loading state |
| Cloudinary upload failures | Low | Low | Retry logic, fallback to dummy URL |
| Multi-tenant template leakage | Medium | Low | Organization-scoped queries in backend |
| Missing `generatedDocxUrl` population | Medium | Medium | Backend does not populate this field; frontend uses Base64 instead |
| Hardcoded template ID in ResumeAdapter | Medium | High | Not in frontend critical path; fix in backend later |

---

## 17. Technical Decisions

### 17.1 Why No Global State Library

- MVP state is localized to one page
- Prop drilling depth max 2 levels
- Adding Redux/Zustand adds complexity without MVP benefit
- Can migrate to React Query or Zustand post-MVP if needed

### 17.2 Why Reuse `POST /generate` for Drafts

- Backend already has `findOneAndUpdate` with upsert
- Adding a new endpoint requires backend changes
- Using `tone: 'none'` signals no enhancement needed
- Backend can optimize later with a dedicated draft endpoint

### 17.3 Why iframe for Preview

- `mammoth` HTML output may contain styles that conflict with app CSS
- iframe provides complete style isolation
- `sandbox="allow-same-origin"` prevents script execution
- Alternative: Shadow DOM — more complex, not needed for MVP

### 17.4 Why Base64 Instead of URL for DOCX

- Backend returns `docxBase64` in response
- No need to store/persist the DOCX file
- Simplifies download flow (no extra fetch)
- Post-MVP: store in Cloudinary and return URL

---

## 18. Post-MVP Roadmap

| Feature | Priority | Description |
|---------|----------|-------------|
| PDF Export | P1 | Generate PDF from DOCX or HTML |
| Auto-fill from Skills Engine | P1 | Pre-populate skills section from `SkillRecord` |
| Auto-fill from Academic Records | P1 | Pre-populate education section |
| Auto-fill from Career Profile | P1 | Pre-populate experience section |
| Resume Versions | P2 | Multiple drafts, version comparison |
| Template Preview | P2 | Preview template before selection |
| Template Soft-Delete | P2 | Disable instead of hard-delete |
| Share Resume | P3 | Generate shareable link |
| Resume Analytics | P3 | Track views, downloads |
| Collaborative Editing | P3 | Multiple users edit same resume |
| Custom Sections | P3 | User-defined sections beyond template |

---

## 19. Final Recommendation

### 19.1 Design Approval

This architecture is **ready for implementation**. Key principles:

1. **No backend changes required** — all 4 endpoints exist and work
2. **No global state library** — localized hooks and state for MVP
3. **Progressive enhancement** — works without AI, auto-fill, or PDF
4. **Error-resilient** — boundaries, fallbacks, and retry logic throughout
5. **Type-safe** — full TypeScript coverage for API and state

### 19.2 Implementation Gates

| Gate | Criteria |
|------|----------|
| **Phase 1 Complete** | Page renders, API layer tested, types defined |
| **Phase 2 Complete** | Templates load, filter/search works, selection updates URL |
| **Phase 3 Complete** | Dynamic form renders, validation works, auto-save functions |
| **Phase 4 Complete** | Generation works, preview renders, error states handled |
| **Phase 5 Complete** | Download works, filename correct, success tracking |
| **Phase 6 Complete** | Faculty can upload, list, delete templates |
| **Phase 7 Complete** | Tests pass, accessibility audit, performance budget met |

### 19.3 What NOT to Do

- **Do not add PDF export** — post-MVP
- **Do not add auto-fill** — post-MVP
- **Do not add resume versioning** — post-MVP
- **Do not modify backend** — it is production-ready
- **Do not add global state** — unnecessary for MVP
- **Do not implement collaborative editing** — post-MVP

### 19.4 Success Criteria

MVP is complete when:
1. Faculty can upload a .docx template
2. Student can browse and select templates
3. Student can fill dynamic form with auto-save
4. Student can generate and preview resume
5. Student can download DOCX
6. Draft recovery works
7. Error handling is comprehensive
8. Loading states are polished
9. Tests pass (unit + integration)
10. Accessibility audit passes

---

**End of Architecture Design Document**
