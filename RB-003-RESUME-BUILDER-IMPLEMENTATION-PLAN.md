# RB-003: Resume Builder — Frontend Implementation Plan

**Date:** 2026-07-21T03:31:00+05:30  
**Status:** Plan Complete — Ready for Implementation  
**Owner:** Lead Software Architect / Senior Full Stack Engineer  
**Related:** RB-001 (Investigation), RB-002 (Architecture)  

---

## 1. Phase-by-Phase Implementation

### Phase 1: Foundation & API Layer (Days 1-2)
**Goal:** Establish API client, types, shared components, and wire up pages without crashes.

**Deliverable:** Pages render loading/empty/error states. No broken imports.

### Phase 2: Template Selection — Student (Days 3-4)
**Goal:** Students can browse, filter, and select resume templates.

**Deliverable:** Template grid loads, filters work, selection transitions to form view.

### Phase 3: Dynamic Form & Auto-Save (Days 5-7)
**Goal:** Students can fill template-driven forms with automatic draft saving.

**Deliverable:** Form renders from `template.questions`, validation works, draft auto-saves every 2s.

### Phase 4: Generation & Preview (Days 8-9)
**Goal:** Students can generate resume and preview HTML output.

**Deliverable:** Generation triggers loading state, preview renders in sandboxed iframe, toolbar actions wired.

### Phase 5: Download & Polish (Day 10)
**Goal:** Students can download generated DOCX and see success states.

**Deliverable:** Download button works, filename is correct, success toast appears.

### Phase 6: Faculty Template Management (Days 11-12)
**Goal:** Faculty can upload and manage .docx templates.

**Deliverable:** Upload form works with drag-and-drop, template table displays, delete works.

### Phase 7: Testing, Accessibility & Performance (Days 13-14)
**Goal:** Production readiness.

**Deliverable:** Unit tests pass, integration tests pass, accessibility audit passes, performance budget met.

---

## 2. Exact Files to Create

### Phase 1: Foundation

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `app/components/Resume/api/client.ts` | Base HTTP client with auth | 40 |
| `app/components/Resume/api/resumeApi.ts` | Student API functions | 80 |
| `app/components/Resume/api/templateApi.ts` | Faculty API functions | 60 |
| `app/components/Resume/types/api.ts` | Request/response DTOs | 60 |
| `app/components/Resume/types/template.ts` | Template-specific types | 40 |
| `app/components/Resume/types/resume.ts` | Resume-specific types | 30 |
| `app/components/Resume/shared/ResumeEmptyState.tsx` | Empty state component | 50 |
| `app/components/Resume/shared/ResumeErrorState.tsx` | Error boundary fallback | 40 |
| `app/components/Resume/shared/ResumeSkeleton.tsx` | Loading shimmer | 60 |
| `app/dashboard/student/resume-builder/components/ResumeBuilderPage/ResumeBuilderPage.tsx` | Main orchestrator | 120 |
| `app/dashboard/student/resume-builder/components/ResumeBuilderPage/hooks/useResumeBuilder.ts` | Main state hook | 100 |
| `app/dashboard/student/resume-builder/components/ResumeBuilderPage/hooks/useAutoSave.ts` | Draft auto-save hook | 80 |
| `app/dashboard/student/resume-builder/components/ResumeBuilderPage/hooks/useTemplateSelection.ts` | Template fetch hook | 60 |
| `app/dashboard/student/resume-builder/components/ResumeBuilderPage/utils/resumeHelpers.ts` | Helpers | 40 |

### Phase 2: Template Selection

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `.../TemplateSelection/TemplateSelection.tsx` | Template grid container | 80 |
| `.../TemplateSelection/TemplateCard.tsx` | Individual template card | 60 |
| `.../TemplateSelection/TemplateFilters.tsx` | Filter/search controls | 70 |

### Phase 3: Dynamic Form

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `.../ResumeForm/ResumeForm.tsx` | Form orchestrator | 100 |
| `.../ResumeForm/FormFieldRenderer.tsx` | Input renderer | 80 |
| `.../ResumeForm/FormSection.tsx` | Field grouping | 40 |
| `.../ResumeForm/FormNavigation.tsx` | Stepper nav | 60 |
| `.../Draft/DraftIndicator.tsx` | Save status badge | 50 |

### Phase 4: Generation & Preview

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `.../Preview/ResumePreview.tsx` | Preview container | 80 |
| `.../Preview/PreviewToolbar.tsx` | Action toolbar | 60 |
| `.../Preview/PreviewSkeleton.tsx` | Preview loading | 40 |
| `.../Enhancement/ToneSelector.tsx` | AI tone picker | 50 |
| `.../Enhancement/EnhancementPanel.tsx` | Enhancement UI | 70 |

### Phase 5: Download

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `.../Download/DownloadButton.tsx` | Download trigger | 50 |
| `.../Download/DownloadProgress.tsx` | Progress indicator | 40 |
| `.../Download/DownloadSuccess.tsx` | Success state | 30 |
| `app/components/Resume/hooks/useResumeDownload.ts` | Download hook | 60 |
| `app/components/Resume/utils/downloadHelper.ts` | Base64 → Blob utility | 40 |

### Phase 6: Faculty Template Management

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `app/dashboard/faculty/resume-templates/components/TemplateUploadForm/TemplateUploadForm.tsx` | Upload form | 120 |
| `.../TemplateUploadForm/TemplateDropzone.tsx` | Drag-drop zone | 80 |
| `.../TemplateList/TemplateList.tsx` | List container | 60 |
| `.../TemplateList/TemplateTable.tsx` | Table layout | 80 |
| `.../TemplateList/TemplateActions.tsx` | Action buttons | 50 |

### Phase 7: Testing & Polish

| File | Purpose | LOC Estimate |
|------|---------|--------------|
| `.../ResumeBuilderPage/ResumeBuilderPage.test.tsx` | Page integration tests | 150 |
| `.../TemplateUploadForm/TemplateUploadForm.test.tsx` | Upload form tests | 100 |
| `.../TemplateList/TemplateList.test.tsx` | List tests | 80 |
| `app/components/Resume/hooks/useResumeDraft.ts` | Draft CRUD hook | 80 |
| `app/components/Resume/utils/docxParser.ts` | Tag extractor utility | 60 |
| `app/components/Resume/utils/htmlFormatter.ts` | HTML cleaner utility | 40 |

**Total New Files:** 38  
**Total New LOC (frontend only):** ~2,850

---

## 3. Exact Files to Modify

| File | Phase | Changes | LOC Delta |
|------|-------|---------|-----------|
| `app/dashboard/student/resume-builder/page.tsx` | 1 | Replace broken import with `ResumeBuilderPage` orchestrator | +10 / -5 |
| `app/dashboard/faculty/resume-templates/page.tsx` | 6 | Replace broken imports with `TemplateUploadForm` and `TemplateList` | +10 / -5 |
| `app/dashboard/student/layout.tsx` | 1 | No changes — route already exists | 0 |
| `app/dashboard/student/skills/components/SkillDetailPanel.tsx` | 1 | No changes — ResumeReadinessBadge already removed in BUG-007 | 0 |

**Note:** Backend files are NOT modified. The backend is production-ready.

---

## 4. Dependency Graph

```
Phase 1 (Foundation)
├── api/client.ts
├── api/resumeApi.ts
├── api/templateApi.ts
├── types/*.ts
├── shared/*.tsx
└── ResumeBuilderPage.tsx
    └── hooks/useResumeBuilder.ts
        ├── useTemplateSelection.ts (Phase 2)
        ├── useAutoSave.ts (Phase 3)
        └── useResumeDownload.ts (Phase 5)

Phase 2 (Template Selection)
├── TemplateSelection.tsx
├── TemplateCard.tsx
└── TemplateFilters.tsx
    └── Depends on: resumeApi, types

Phase 3 (Dynamic Form)
├── ResumeForm.tsx
├── FormFieldRenderer.tsx
├── FormSection.tsx
├── FormNavigation.tsx
└── DraftIndicator.tsx
    └── Depends on: useAutoSave, resumeApi

Phase 4 (Generation & Preview)
├── ResumePreview.tsx
├── PreviewToolbar.tsx
├── PreviewSkeleton.tsx
├── ToneSelector.tsx
└── EnhancementPanel.tsx
    └── Depends on: resumeApi, Phase 3 complete

Phase 5 (Download)
├── DownloadButton.tsx
├── DownloadProgress.tsx
├── DownloadSuccess.tsx
├── useResumeDownload.ts
└── downloadHelper.ts
    └── Depends on: Phase 4 complete

Phase 6 (Faculty)
├── TemplateUploadForm.tsx
├── TemplateDropzone.tsx
├── TemplateList.tsx
├── TemplateTable.tsx
└── TemplateActions.tsx
    └── Depends on: Phase 1 (API layer)

Phase 7 (Testing & Polish)
├── *.test.tsx files
├── useResumeDraft.ts
├── docxParser.ts
└── htmlFormatter.ts
    └── Depends on: Phases 1-6 complete
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 7  
**Parallel Track:** Phase 6 (Faculty) can start after Phase 1  
**Independent:** Phase 7 testing can begin after Phase 5, faculty testing after Phase 6

---

## 5. Build Checkpoints

| Checkpoint | Phase | Criteria | Blocking |
|------------|-------|----------|----------|
| **CP1: Pages Load** | 1 | Both student and faculty pages render without crashes. Loading/empty/error states visible. | Yes |
| **CP2: Templates Load** | 2 | Student sees template grid. Filters work. Selection changes view. | Yes |
| **CP3: Form Works** | 3 | Dynamic form renders. Validation works. Auto-save triggers. Draft recovers. | Yes |
| **CP4: Generation Works** | 4 | Generate button produces preview. Preview renders HTML. Toolbar actions wired. | Yes |
| **CP5: Download Works** | 5 | Download button produces valid DOCX. Filename correct. Success toast shown. | Yes |
| **CP6: Faculty Upload Works** | 6 | Faculty can upload .docx. Template appears in list. Delete works. | No |
| **CP7: Production Ready** | 7 | Tests pass. Accessibility audit passes. Performance budget met. | Yes |

**Definition of Done for MVP:** CP1 through CP6 complete, CP7 passing.

---

## 6. Rollback Checkpoints

| Checkpoint | Rollback Trigger | Rollback Action |
|------------|------------------|-----------------|
| **CP1** | Pages crash on load | Revert `page.tsx` changes, keep API layer |
| **CP2** | Template selection breaks form | Disable template selection, show static form |
| **CP3** | Auto-save causes data loss | Disable auto-save, keep manual save only |
| **CP4** | Generation breaks page | Disable generate button, show "Coming soon" |
| **CP5** | Download corrupts files | Disable download, show preview only |
| **CP6** | Faculty upload breaks | Disable upload, keep list view only |
| **CP7** | Performance regression | Lazy load non-critical components |

**Rollback Strategy:**
- Feature flags for each major feature (template selection, auto-save, generation, download)
- Graceful degradation: if a feature fails, disable it and show appropriate message
- No data loss: drafts are stored in backend, frontend changes are reversible

---

## 7. Acceptance Criteria by Phase

### Phase 1: Foundation

- [ ] `client.ts` handles auth, errors, and response normalization
- [ ] `resumeApi.ts` exports typed functions for all student endpoints
- [ ] `templateApi.ts` exports typed functions for all faculty endpoints
- [ ] All TypeScript types are defined and exported
- [ ] `ResumeEmptyState`, `ResumeErrorState`, `ResumeSkeleton` render correctly
- [ ] Student page loads without crashing
- [ ] Faculty page loads without crashing
- [ ] Loading skeletons display during data fetch
- [ ] Error boundary catches and displays errors gracefully

### Phase 2: Template Selection

- [ ] Templates load from `GET /api/resume/templates`
- [ ] Template cards display name, type, target, preview
- [ ] Filter by type works (global/section/department)
- [ ] Search by name works
- [ ] Clicking card selects template and transitions to form
- [ ] Selected template is highlighted
- [ ] Empty state shown when no templates exist
- [ ] Refresh button reloads templates

### Phase 3: Dynamic Form

- [ ] Form renders all fields from `template.questions`
- [ ] Text inputs render for `type: 'text'`
- [ ] Textareas render for `type: 'textarea'`
- [ ] Form validation runs on submit
- [ ] Required fields are marked
- [ ] Auto-save triggers 2s after last edit
- [ ] DraftIndicator shows saving/saved/error states
- [ ] Draft recovers when returning to template
- [ ] Form navigation (Next/Previous) works
- [ ] Form data persists across navigation

### Phase 4: Generation & Preview

- [ ] Generate button triggers `POST /api/resume/generate`
- [ ] Loading overlay displays during generation
- [ ] Preview renders HTML in sandboxed iframe
- [ ] Preview toolbar displays Download, Print, Edit buttons
- [ ] Print button opens print dialog
- [ ] Edit button returns to form
- [ ] Error state shows if generation fails
- [ ] Retry button re-triggers generation
- [ ] AI enhancement toggle works (optional)
- [ ] Tone selector updates generation request

### Phase 5: Download

- [ ] Download button is enabled after generation
- [ ] Clicking download produces valid .docx file
- [ ] Filename follows pattern: `Resume_{templateName}_{date}.docx`
- [ ] Success toast appears after download
- [ ] Download progress indicator shows during download
- [ ] Button disables during download to prevent double-click
- [ ] Downloaded file opens correctly in Word/LibreOffice

### Phase 6: Faculty Template Management

- [ ] Faculty can drag-and-drop .docx file
- [ ] File validation rejects non-.docx files
- [ ] File validation rejects files > 5MB
- [ ] Upload progress bar displays during upload
- [ ] Success toast appears after upload
- [ ] New template appears in list
- [ ] Template table displays all columns
- [ ] Delete button removes template
- [ ] Empty state shown when no templates exist

### Phase 7: Testing & Polish

- [ ] Unit tests cover all hooks (useResumeBuilder, useAutoSave, etc.)
- [ ] Unit tests cover all utilities (downloadHelper, docxParser)
- [ ] Integration tests cover student flow: select → fill → generate → download
- [ ] Integration tests cover faculty flow: upload → list → delete
- [ ] Accessibility audit passes (keyboard nav, ARIA labels, color contrast)
- [ ] Performance budget met:
  - First contentful paint < 1.5s
  - Time to interactive < 3s
  - Bundle size < 200KB gzipped
- [ ] Error boundaries catch all runtime errors
- [ ] No console errors in production build

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Scope:** Hooks, utilities, API layer, individual components.

| Test Target | Framework | Coverage Target |
|-------------|-----------|-----------------|
| `useResumeBuilder` | Jest + React Testing Library | 90% |
| `useAutoSave` | Jest + React Testing Library | 90% |
| `useTemplateSelection` | Jest + React Testing Library | 90% |
| `useResumeDownload` | Jest + React Testing Library | 90% |
| `downloadHelper` | Jest | 95% |
| `docxParser` | Jest | 90% |
| `htmlFormatter` | Jest | 90% |
| `ResumeApi` | Jest | 80% |
| `TemplateApi` | Jest | 80% |
| `ResumeEmptyState` | React Testing Library | 90% |
| `ResumeErrorState` | React Testing Library | 90% |
| `DraftIndicator` | React Testing Library | 90% |

**Test Pattern:**
```typescript
// Example: useAutoSave.test.ts
describe('useAutoSave', () => {
  it('should save draft after 2s debounce', async () => {
    const { result } = renderHook(() => useAutoSave(token, templateId, data));
    expect(result.current.draftStatus).toBe('saved');
  });
});
```

### 8.2 Integration Tests

**Scope:** Full user flows across multiple components.

| Test | Flow | Assertions |
|------|------|------------|
| Student: Select → Fill → Generate → Download | Phase 2-5 | Template loads, form submits, preview renders, file downloads |
| Student: Draft Save & Recovery | Phase 3 | Form auto-saves, draft recovers on re-select |
| Student: Error Recovery | Phase 4 | Generation failure shows retry, retry succeeds |
| Faculty: Upload → List → Delete | Phase 6 | Upload succeeds, template appears, delete removes |
| Faculty: Invalid Upload | Phase 6 | Wrong file type rejected, oversize rejected |

**Test Pattern:**
```typescript
// Example: ResumeBuilderPage.integration.test.ts
describe('ResumeBuilderPage integration', () => {
  it('completes full student flow', async () => {
    render(<ResumeBuilderPage />);
    await waitFor(() => expect(screen.getByText('Select a template')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Template'));
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByText('Generate Resume'));
    await waitFor(() => expect(screen.getByTitle('Resume Preview')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Download'));
    await waitFor(() => expect(screen.getByText('Downloaded')).toBeInTheDocument());
  });
});
```

### 8.3 E2E Tests (Post-MVP)

**Scope:** Full browser automation. Not required for MVP but planned for Phase 7.

| Test | Tool |
|------|------|
| Student full flow | Playwright |
| Faculty upload flow | Playwright |
| Cross-browser (Chrome, Firefox, Safari) | Playwright |

### 8.4 Manual Testing Checklist

- [ ] Upload valid .docx template (faculty)
- [ ] Upload invalid file type (faculty) → error
- [ ] Upload oversized file (faculty) → error
- [ ] Select template (student)
- [ ] Fill all field types (student)
- [ ] Leave required field empty (student) → validation error
- [ ] Wait 2s after typing → draft saves (student)
- [ ] Navigate away and back → draft recovers (student)
- [ ] Generate with tone "professional" (student)
- [ ] Generate with tone "creative" (student)
- [ ] Generate with tone "concise" (student)
- [ ] Preview renders correctly (student)
- [ ] Print preview opens (student)
- [ ] Download produces valid DOCX (student)
- [ ] Downloaded file opens in Word (student)
- [ ] Delete template (faculty)
- [ ] Refresh page → state preserved where appropriate

---

## 9. Estimated LOC

### Frontend

| Category | Files | LOC |
|----------|-------|-----|
| API Layer | 4 | 230 |
| Types | 3 | 130 |
| Shared Components | 3 | 150 |
| Student Components | 13 | 720 |
| Faculty Components | 5 | 390 |
| Hooks | 6 | 440 |
| Utils | 3 | 140 |
| Tests | 6 | 460 |
| **Total** | **43** | **2,660** |

### Backend

| Category | Files | LOC |
|----------|-------|-----|
| **Total** | **0** | **0** |

**Note:** Backend is NOT modified. Zero LOC change on backend.

### Documentation

| Category | Files | LOC |
|----------|-------|-----|
| Implementation Plan (this doc) | 1 | — |
| Architecture (RB-002) | 1 | — |
| Investigation (RB-001) | 1 | — |

---

## 10. Risk Assessment

| Risk | Severity | Likelihood | Mitigation | Contingency |
|------|----------|------------|------------|-------------|
| DOCX template incompatible with Docxtemplater | High | Medium | Validate placeholders during upload; show clear error messages | Fall back to simple text replacement |
| AI enhancement API latency > 10s | Medium | Medium | Non-blocking fallback to original data; show loading state | Disable AI toggle if latency exceeds threshold |
| Cloudinary upload failure | Medium | Low | Retry with exponential backoff; fallback to dummy URL | Show error and allow retry |
| Large form state causes re-render lag | Low | Low | Use `useMemo` for derived state; debounce auto-save | Split form into smaller sections |
| Base64 DOCX exceeds memory | Medium | Low | Limit preview size; revoke object URLs promptly | Stream download instead of Base64 |
| Multi-tenant template leakage | Medium | Low | Organization-scoped queries already in backend | Add frontend org check as defense-in-depth |
| Draft save conflicts | Low | Medium | Last-write-wins with timestamp; show conflict warning | Merge drafts manually |
| Missing `generatedDocxUrl` population | Medium | High | Frontend uses Base64 from response; no URL needed | Backend can populate URL later |
| Hardcoded template ID in ResumeAdapter | Medium | High | Not in frontend critical path | Fix in backend post-MVP |
| Browser compatibility (iframe sandbox) | Low | Low | Test on Chrome, Firefox, Safari, Edge | Fall back to div with sanitized HTML |
| Accessibility gaps | Medium | Medium | Automated checks + manual audit | Post-MVP remediation |
| Performance budget exceeded | Medium | Medium | Lazy load components; code split | Post-MVP optimization |

---

## 11. Implementation Gates

### Gate 1: Foundation Complete
- [ ] All Phase 1 files created
- [ ] Pages load without errors
- [ ] API client tested with mock responses
- [ ] TypeScript compiles with zero errors
- [ ] Shared components render correctly

### Gate 2: Template Selection Complete
- [ ] Templates load from API
- [ ] Filter/search works
- [ ] Selection transitions to form
- [ ] Empty/loading/error states work

### Gate 3: Form Complete
- [ ] Dynamic form renders all question types
- [ ] Validation works
- [ ] Auto-save triggers and recovers drafts
- [ ] Navigation between sections works

### Gate 4: Generation Complete
- [ ] Generate button works
- [ ] Preview renders in iframe
- [ ] Toolbar actions wired
- [ ] Error states handled

### Gate 5: Download Complete
- [ ] Download produces valid DOCX
- [ ] Filename is correct
- [ ] Success state shown
- [ ] File opens in Word/LibreOffice

### Gate 6: Faculty Complete
- [ ] Upload works with drag-and-drop
- [ ] Validation rejects invalid files
- [ ] List displays templates
- [ ] Delete works

### Gate 7: Production Ready
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] Accessibility audit passes (WCAG 2.1 AA)
- [ ] Performance budget met
- [ ] No console errors in production build
- [ ] Manual testing checklist complete

---

## 12. Rollback Plan

### Rollback Triggers

| Trigger | Action |
|---------|--------|
| Pages crash on load | Revert `page.tsx` changes; keep API layer for next attempt |
| Template selection breaks form flow | Disable selection; show static "Coming soon" message |
| Auto-save causes data loss | Disable auto-save; keep manual save only |
| Generation consistently fails | Disable generate button; show preview-only mode |
| Download corrupts files | Disable download; show "Print to PDF" alternative |
| Faculty upload breaks storage | Disable upload; keep list view for existing templates |

### Rollback Procedure

1. **Identify broken phase** — Determine which phase introduced the issue
2. **Disable feature flag** — Toggle off the broken feature
3. **Show graceful message** — Inform user feature is temporarily unavailable
4. **Preserve data** — Ensure no data loss during rollback
5. **Fix in branch** — Create hotfix branch, resolve issue
6. **Re-enable after QA** — Test fix in staging before re-enabling

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  RESUME_TEMPLATE_SELECTION: true,
  RESUME_AUTO_SAVE: true,
  RESUME_GENERATION: true,
  RESUME_DOWNLOAD: true,
  RESUME_AI_ENHANCEMENT: true,
  FACULTY_UPLOAD: true,
};
```

---

## 13. Post-MVP Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| PDF Export | P1 | Users expect PDF; DOCX is intermediate format |
| Auto-fill from Skills Engine | P1 | High value, low effort (1 day) |
| Auto-fill from Academic Records | P1 | High value, low effort (1 day) |
| Auto-fill from Career Profile | P2 | Medium value, medium effort |
| Resume Versions | P2 | Multiple drafts, comparison |
| Template Soft-Delete | P2 | Prevent accidental deletion |
| Template Preview Endpoint | P2 | Faculty can preview before upload |
| Share Resume Link | P3 | Collaborative sharing |
| Resume Analytics | P3 | Track usage |
| Custom Sections | P3 | Beyond template constraints |
| Collaborative Editing | P3 | Multi-user editing |
| Resume Status Endpoint | P3 | Completion percentage |

---

## 14. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Template upload success rate | > 95% | Backend logs |
| Generation success rate | > 98% | Backend logs |
| Download success rate | > 99% | Frontend analytics |
| Draft save success rate | > 99% | Backend logs |
| Page load time | < 1.5s | Lighthouse |
| Time to interactive | < 3s | Lighthouse |
| Bundle size | < 200KB gzipped | Bundle analyzer |
| Accessibility score | > 90 | axe DevTools |
| Test coverage | > 80% | Jest coverage |
| Error rate | < 1% | Error tracking |

---

## 15. Final Checklist Before Implementation

- [ ] RB-001 investigation reviewed and approved
- [ ] RB-002 architecture reviewed and approved
- [ ] RB-003 implementation plan reviewed and approved
- [ ] Backend endpoints verified working in staging
- [ ] Cloudinary storage configured and tested
- [ ] Gemini API key configured for AI enhancement
- [ ] Faculty test accounts created
- [ ] Student test accounts created
- [ ] Sample .docx templates uploaded for testing
- [ ] Design mockups approved (if applicable)
- [ ] Accessibility requirements defined
- [ ] Performance budget agreed upon
- [ ] Rollback plan communicated to team
- [ ] Monitoring/alerting configured for new endpoints

---

**End of Implementation Plan**
