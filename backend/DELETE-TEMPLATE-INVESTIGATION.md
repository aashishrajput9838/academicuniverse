# Delete Template Investigation Report

**Date:** 2026-07-23  
**Page under investigation:** Resume Templates page  
**Files inspected:**
- `backend/src/routes/resumeRoutes.ts`
- `backend/src/controllers/resumeController.ts`
- `components/Resume/api/templateApi.ts`
- `app/dashboard/faculty/resume-templates/page.tsx`
- `app/dashboard/faculty/resume-templates/components/TemplateList.tsx`

---

## 1. Is the delete API implemented?

**NO.**

### Backend routes (`backend/src/routes/resumeRoutes.ts`)

Registered routes:
```typescript
router.post('/templates', upload.single('templateFile'), uploadTemplateController);
router.post('/templates/:id/process', processTemplateController);
router.get('/templates', getAvailableTemplatesController);
router.post('/generate', processResumeController);
router.post('/generate-resume', generateResumeController);
router.get('/draft', getSavedResumeController);
```

**There is no `router.delete('/templates/:id', ...)` route.**

### Backend controller (`backend/src/controllers/resumeController.ts`)

Exported controllers:
- `uploadTemplateController`
- `getAvailableTemplatesController`
- `processResumeController`
- `getSavedResumeController`
- `generateResumeController`
- `processTemplateController`

**There is no `deleteTemplateController`.**

### Conclusion

The DELETE API endpoint **does not exist** on the backend. No controller, no route, no handler.

---

## 2. Is the frontend intentionally hiding the delete button?

**NO — the delete button does not exist at all.**

### Frontend API layer (`components/Resume/api/templateApi.ts`)

A `deleteTemplate()` function IS defined (lines 85-91):

```typescript
export async function deleteTemplate(backendToken: string, templateId: string): Promise<void> {
  await request<void>(
    `/api/resume/templates/${encodeURIComponent(templateId)}`,
    { method: 'DELETE' },
    backendToken
  );
}
```

However, this function is **never imported or called** anywhere in the frontend codebase.

### Frontend page (`app/dashboard/faculty/resume-templates/page.tsx`)

Renders:
1. `TemplateUploadForm` — for uploading new templates
2. `TemplateList` — for listing existing templates

**No delete button, no delete handler, no delete confirmation dialog.**

### Frontend `TemplateList` component (`app/dashboard/faculty/resume-templates/components/TemplateList.tsx`)

For each template row, the only action button rendered is:

```tsx
<button onClick={() => handleProcess(template._id)} ...>
  {isProcessing ? 'Processing...' : 'Process'}
</button>
```

**No delete button exists.** The only `.delete(` occurrence in this file is `next.delete(templateId)` inside the `Set` operations for `processingIds` — this is JavaScript Set manipulation, not template deletion.

### Conclusion

The frontend is **not intentionally hiding** a delete button. The delete functionality was **never wired up to the UI**. The API function exists as dead code, but no component calls it.

---

## 3. Which file should render the Delete button?

**Primary file:** `app/dashboard/faculty/resume-templates/components/TemplateList.tsx`

This file renders the table of templates. The Action column (lines 169-188) currently contains only the "Process" button. A "Delete" button should be added here.

**Secondary file:** `app/dashboard/faculty/resume-templates/components/TemplateUploadForm.tsx` (if deletion is grouped with upload management)

**API file that would be called:** `components/Resume/api/templateApi.ts` — the `deleteTemplate()` function already exists and just needs to be imported.

---

## 4. Summary

| Layer | Status | Details |
|---|---|---|
| **Backend route** | ❌ Missing | No `DELETE /api/resume/templates/:id` in `resumeRoutes.ts` |
| **Backend controller** | ❌ Missing | No `deleteTemplateController` in `resumeController.ts` |
| **Frontend API function** | ⚠️ Exists but unused | `deleteTemplate()` in `templateApi.ts:85-91` — never imported |
| **Frontend UI button** | ❌ Missing | No delete button in `TemplateList.tsx` Action column |
| **User-facing page** | `ResumeTemplatesPage` (`page.tsx`) | Renders upload form + template list only |

**Root cause:** Delete functionality was partially scaffolded in the frontend API layer but never completed on the backend or wired into the UI.
